import { Address, BigInt, log } from '@graphprotocol/graph-ts'
import { PoolAdded } from '../generated/CurveRegistryV2/CurveRegistryV2'
import { DailySnapshot, Platform, Pool, TokenSnapshot } from '../generated/schema'
import { BIG_INT_ONE, CURVE_PLATFORM_ID } from '../../../packages/constants'
import { ERC20 } from '../generated/CurveRegistryV2/ERC20'
import { getDecimals, getUsdRate } from '../../../packages/utils/pricing'
import { CurvePoolTemplateV2 } from '../generated/templates'
import { DAY, getIntervalFromTimestamp } from '../../../packages/utils/time'
import {
  CurvePoolV2,
  RemoveLiquidity,
  RemoveLiquidityOne,
  TokenExchange,
} from '../generated/CurveRegistryV2/CurvePoolV2'
import { bytesToAddress } from '../../../packages/utils'
import { exponentToBigDecimal } from '../../../packages/utils/maths'
import { CryptoPoolDeployed, CurveFactoryV20 } from '../generated/CurveFactoryV20/CurveFactoryV20'

export function getPlatform(): Platform {
  let platform = Platform.load(CURVE_PLATFORM_ID)
  if (!platform) {
    platform = new Platform(CURVE_PLATFORM_ID)
  }
  return platform
}

export function addPool(poolAddress: Address): void {
  const platform = getPlatform()
  for (let i = 0; i < platform.poolAddresses.length; i++) {
    if (platform.poolAddresses[i] == poolAddress.toHexString()) {
      log.warning('Pool {} already exists', [poolAddress.toHexString()])
      return
    }
  }
  const poolContract = CurvePoolV2.bind(poolAddress)
  const token = poolContract.token()

  const pool = new Pool(platform.poolAddresses.length.toString())
  pool.address = poolAddress
  pool.lpToken = token
  pool.platform = platform.id
  pool.name = ERC20.bind(token).name()

  const coins = pool.coins
  const coinDecimals = pool.coinDecimals
  let i = 0
  let coinResult = poolContract.try_coins(BigInt.fromI32(i))

  while (!coinResult.reverted) {
    coins.push(coinResult.value)
    coinDecimals.push(getDecimals(coinResult.value))
    i += 1
    coinResult = poolContract.try_coins(BigInt.fromI32(i))
  }
  pool.coins = coins
  pool.coinDecimals = coinDecimals
  pool.save()

  CurvePoolTemplateV2.create(bytesToAddress(pool.address))
  const pools = platform.poolAddresses
  pools.push(poolAddress.toHexString())
  platform.poolAddresses = pools
  platform.save()
}

export function handlePoolAdded(event: PoolAdded): void {
  addPool(event.params.pool)
}

export function handleCryptoPoolDeployed(event: CryptoPoolDeployed): void {
  const platform = getPlatform()
  const factory = CurveFactoryV20.bind(event.address)
  const poolCount = platform.factoryPoolCount
  const factoryPool = factory.pool_list(poolCount)
  platform.factoryPoolCount = platform.factoryPoolCount.plus(BIG_INT_ONE)
  platform.save()
  addPool(factoryPool)
}

export function handleTokenExchange(event: TokenExchange): void {
  takeSnapshot(event.block.timestamp)
}

export function handleRemoveLiquidityOne(event: RemoveLiquidityOne): void {
  takeSnapshot(event.block.timestamp)
}

export function handleRemoveLiquidity(event: RemoveLiquidity): void {
  takeSnapshot(event.block.timestamp)
}

export function takeSnapshot(timestamp: BigInt): void {
  const platform = getPlatform()
  const time = getIntervalFromTimestamp(timestamp, DAY)
  if (platform.latestPoolSnapshot == time) {
    return
  }
  for (let i = 0; i < platform.poolAddresses.length; ++i) {
    const pool = Pool.load(i.toString())
    if (!pool) {
      return
    }
    const poolAddress = pool.address
    const snapId = pool.id + '-' + time.toString()
    if (!DailySnapshot.load(snapId)) {
      const dailySnapshot = new DailySnapshot(snapId)
      dailySnapshot.pool = pool.id
      dailySnapshot.address = pool.address
      const poolContract = CurvePoolV2.bind(bytesToAddress(pool.address))

      const reserves = dailySnapshot.reserves
      const pricesUsd = dailySnapshot.pricesUsd
      const reservesUsd = dailySnapshot.reservesUsd
      for (let j = 0; j < pool.coins.length; j++) {
        const balance = poolContract.balances(BigInt.fromI32(j))
        reserves.push(balance)
        const priceSnapshot = getCryptoTokenSnapshot(bytesToAddress(pool.coins[j]), timestamp)
        const price = priceSnapshot.price
        pricesUsd.push(price)
        reservesUsd.push(balance.toBigDecimal().div(exponentToBigDecimal(pool.coinDecimals[j])).times(price))
      }
      dailySnapshot.poolId = BigInt.fromI32(i)
      dailySnapshot.reserves = reserves
      dailySnapshot.pricesUsd = pricesUsd
      dailySnapshot.reservesUsd = reservesUsd
      dailySnapshot.lpTokenSupply = ERC20.bind(bytesToAddress(pool.lpToken)).totalSupply()
      dailySnapshot.timestamp = time

      dailySnapshot.save()
    }
  }
}

export function getCryptoTokenSnapshot(asset: Address, timestamp: BigInt): TokenSnapshot {
  const hour = getIntervalFromTimestamp(timestamp, DAY)
  const snapshotId = asset.toHexString() + '-' + hour.toString()
  let snapshot = TokenSnapshot.load(snapshotId)
  if (!snapshot) {
    snapshot = new TokenSnapshot(snapshotId)
    snapshot.timestamp = hour
    const price = getUsdRate(asset)
    snapshot.price = price
    snapshot.save()
  }
  return snapshot
}
