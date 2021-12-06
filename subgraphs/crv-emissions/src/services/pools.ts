import { Address, BigDecimal, BigInt } from '@graphprotocol/graph-ts'
import { Pool, PoolSnapshot } from '../../generated/schema'
import { CurveRegistry } from '../../../curve-pools/generated/Booster/CurveRegistry'
import {
  ADDRESS_ZERO,
  ASSET_TYPES,
  BIG_DECIMAL_ZERO,
  CURVE_PLATFORM_ID,
  CURVE_REGISTRY,
  V2_POOL_ADDRESSES,
} from '../../../../packages/constants'
import { ERC20 } from '../../../curve-pools/generated/Booster/ERC20'
import { getIntervalFromTimestamp, WEEK } from 'utils/time'
import { bytesToAddress } from '../../../../packages/utils'
import { log } from '@graphprotocol/graph-ts/index'
import { CurvePoolCoin256 } from '../../generated/GaugeController/CurvePoolCoin256'
import { CurvePoolCoin128 } from '../../generated/GaugeController/CurvePoolCoin128'

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
    } else if (swapResult.value != ADDRESS_ZERO) {
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

export function getPoolCoins128(pool: Pool): void {
  const curvePool = CurvePoolCoin128.bind(bytesToAddress(pool.swap))
  let i = 0
  const coins = pool.coins
  let coinResult = curvePool.try_coins(BigInt.fromI32(i))
  if (coinResult.reverted) {
    log.warning('Call to int128 coins failed for {} ({})', [pool.name, pool.id])
  }
  while (!coinResult.reverted) {
    coins.push(coinResult.value)
    i += 1
    coinResult = curvePool.try_coins(BigInt.fromI32(i))
  }
  pool.coins = coins
  pool.save()
}

export function getPoolCoins(pool: Pool): void {
  const curvePool = CurvePoolCoin256.bind(bytesToAddress(pool.swap))
  let i = 0
  const coins = pool.coins
  let coinResult = curvePool.try_coins(BigInt.fromI32(i))
  if (coinResult.reverted) {
    // some pools require an int128 for coins and will revert with the
    // regular abi. e.g. 0x7fc77b5c7614e1533320ea6ddc2eb61fa00a9714
    log.debug('Call to coins reverted for pool ({}: {}), attempting 128 bytes call', [pool.name, pool.id])
    getPoolCoins128(pool)
    return
  }
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
