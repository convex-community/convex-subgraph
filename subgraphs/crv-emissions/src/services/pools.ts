import { Address, BigDecimal, BigInt, ethereum } from '@graphprotocol/graph-ts'
import { Pool, PoolSnapshot } from '../../generated/schema'
import { CurveRegistry } from '../../../curve-pools/generated/Booster/CurveRegistry'
import {
  ASSET_TYPES,
  BIG_DECIMAL_1E18,
  BIG_DECIMAL_ZERO,
  CURVE_PLATFORM_ID,
  CURVE_REGISTRY,
} from '../../../../packages/constants'
import { ERC20 } from '../../../curve-pools/generated/Booster/ERC20'
import { getIntervalFromTimestamp, WEEK } from 'utils/time'
import { getLpTokenVirtualPrice, getLpTokenPriceUSD } from './lppricing'
import { CurvePool } from '../../../curve-pools/generated/Booster/CurvePool'
import { bytesToAddress } from '../../../../packages/utils'
import { log } from '@graphprotocol/graph-ts/index'

// TODO: DRY this with Booster pool creation logic
export function getPool(lpToken: Address): Pool {
  let pool = Pool.load(lpToken.toHexString())
  const curveRegistry = CurveRegistry.bind(CURVE_REGISTRY)
  if (!pool) {
    pool = new Pool(lpToken.toHexString())
    pool.lpToken = lpToken
    const swapResult = curveRegistry.try_get_pool_from_lp_token(lpToken)

    // factory pools have lpToken = pool
    let swap = lpToken
    if (swapResult.reverted) {
      log.warning('Could not find pool for lp token {}', [lpToken.toHexString()])
    } else {
      swap = swapResult.value
    }

    pool.swap = swap
    const nameResult = curveRegistry.try_get_pool_name(swap)
    let name = nameResult.reverted ? '' : nameResult.value
    if (name == '') {
      const lpTokenContract = ERC20.bind(lpToken)
      const lpTokenNameResult = lpTokenContract.try_name()
      name = lpTokenNameResult.reverted ? '' : lpTokenNameResult.value
    }
    getPoolCoins(pool)
    pool.name = name
    pool.platform = CURVE_PLATFORM_ID
    pool.assetType = ASSET_TYPES.has(swap.toHexString()) ? ASSET_TYPES.get(swap.toHexString()) : 0
    pool.save()
  }
  return pool
}

export function getPoolCoins(pool: Pool): void {
  const curvePool = CurvePool.bind(bytesToAddress(pool.swap))
  let i = 0
  const coins = pool.coins
  let coinResult = curvePool.try_coins(BigInt.fromI32(i))
  while (!coinResult.reverted) {
    coins.push(coinResult.value)
    i += 1
    coinResult = curvePool.try_coins(BigInt.fromI32(i))
  }
  pool.coins = coins
  pool.save()
}

export function getGrowthRate(pool: Pool, currentVirtualPrice: BigDecimal, timestamp: BigInt): BigDecimal {
  const lastWeek = getIntervalFromTimestamp(timestamp.minus(WEEK), WEEK)
  const previousSnapshot = PoolSnapshot.load(pool.id + '-' + lastWeek.toString())
  const previousSnapshotVPrice = previousSnapshot ? previousSnapshot.virtualPrice : BIG_DECIMAL_ZERO
  const rate =
    previousSnapshotVPrice == BIG_DECIMAL_ZERO
      ? BIG_DECIMAL_ZERO
      : currentVirtualPrice.minus(previousSnapshotVPrice).div(previousSnapshotVPrice)
  return rate
}

export function createSnapshot(pool: Pool, block: ethereum.Block): void {
  const thisWeek = getIntervalFromTimestamp(block.timestamp, WEEK)
  const snapshot = new PoolSnapshot(pool.id + '-' + thisWeek.toString())
  snapshot.pool = pool.id
  snapshot.timestamp = thisWeek
  snapshot.block = block.number
  snapshot.virtualPrice = getLpTokenVirtualPrice(pool.lpToken)
  const lpTokenContract = ERC20.bind(bytesToAddress(pool.lpToken))
  snapshot.lpTokenSupply = lpTokenContract.totalSupply()
  const lpPrice = getLpTokenPriceUSD(pool)
  snapshot.tvl = snapshot.lpTokenSupply.toBigDecimal().div(BIG_DECIMAL_1E18).times(lpPrice)
  const rate = getGrowthRate(pool, snapshot.virtualPrice, block.timestamp)
  snapshot.fees = snapshot.tvl.times(rate).times(BigDecimal.fromString('2'))
  snapshot.save()
  pool.tvl = snapshot.tvl
  pool.save()
}
