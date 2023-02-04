import { DailyPoolSnapshot, Pool } from '../../generated/schema'
import { BigInt, log } from '@graphprotocol/graph-ts'
import { getIntervalFromTimestamp, DAY } from '../../../../packages/utils/time'
import { pow } from '../../../../packages/utils/maths'
import { BIG_DECIMAL_ONE } from '../../../../packages/constants'
import { getPoolApr, getXcpProfitResult } from './pools'
import { getLpTokenPriceUSD, getLpTokenVirtualPrice, getPoolBaseApr, getV2PoolBaseApr } from './apr'
import { getPlatform } from './platform'

export function getDailyPoolSnapshot(pool: Pool, timestamp: BigInt, block: BigInt): DailyPoolSnapshot {
  const time = getIntervalFromTimestamp(timestamp, DAY)
  const snapId = pool.name + '-' + pool.poolid.toString() + '-' + time.toString()
  let snapshot = DailyPoolSnapshot.load(snapId)
  if (!snapshot) {
    log.info('Taking pool snapshot for pool {} ({}), block: {}', [pool.name, pool.swap.toHexString(), block.toString()])
    snapshot = new DailyPoolSnapshot(snapId)
    snapshot.poolid = pool.poolid.toString()
    snapshot.poolName = pool.name
    snapshot.timestamp = timestamp
    snapshot.lpTokenVirtualPrice = getLpTokenVirtualPrice(pool)

    const lpPrice = getLpTokenPriceUSD(pool)
    log.debug('LP Token price USD for pool {}: {}', [pool.name, lpPrice.toString()])
    pool.lpTokenUSDPrice = lpPrice
    snapshot.lpTokenUSDPrice = pool.lpTokenUSDPrice

    const aprs = getPoolApr(pool, timestamp)
    snapshot.crvApr = aprs[0]
    snapshot.cvxApr = aprs[1]
    snapshot.extraRewardsApr = aprs[2]
    pool.crvApr = aprs[0]
    pool.cvxApr = aprs[1]
    pool.extraRewardsApr = aprs[2]
    pool.save()

    snapshot.lpTokenBalance = pool.lpTokenBalance
    snapshot.tvl = pool.tvl
    snapshot.curveTvlRatio = pool.curveTvlRatio
    if (pool.isV2) {
      const xcpProfits = getXcpProfitResult(pool)
      snapshot.xcpProfit = xcpProfits[0]
      snapshot.xcpProfitA = xcpProfits[1]
      snapshot.baseApr = getV2PoolBaseApr(pool, snapshot.xcpProfit, snapshot.xcpProfitA, timestamp)
    } else {
      snapshot.baseApr = getPoolBaseApr(pool, snapshot.lpTokenVirtualPrice, timestamp)
    }
    // annualize Apr
    snapshot.baseApr = pow(BIG_DECIMAL_ONE.plus(snapshot.baseApr), 365).minus(BIG_DECIMAL_ONE)
    snapshot.block = block
    snapshot.save()
  }
  return snapshot
}

export function takePoolSnapshots(timestamp: BigInt, block: BigInt): void {
  const platform = getPlatform()
  for (let i = 0; i < platform.poolCount.toI32(); ++i) {
    const pool = Pool.load(i.toString())
    if (pool && pool.active) {
      getDailyPoolSnapshot(pool, timestamp, block)
    }
  }
}
