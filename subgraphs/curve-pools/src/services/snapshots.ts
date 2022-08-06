import { DailyPoolSnapshot, Pool } from '../../generated/schema'
import { BigInt } from '@graphprotocol/graph-ts'
import { getIntervalFromTimestamp, DAY } from '../../../../packages/utils/time'
import { getPoolApr, getXcpProfitResult } from './pools'
import { getLpTokenVirtualPrice, getPoolBaseApr, getV2PoolBaseApr } from './apr'
import { getPlatform } from './platform'

export function getDailyPoolSnapshot(pool: Pool, timestamp: BigInt, block: BigInt): DailyPoolSnapshot {
  const time = getIntervalFromTimestamp(timestamp, DAY)
  const snapId = pool.name + '-' + pool.poolid.toString() + '-' + time.toString()
  let snapshot = DailyPoolSnapshot.load(snapId)
  if (!snapshot) {
    snapshot = new DailyPoolSnapshot(snapId)
    snapshot.poolid = pool.poolid.toString()
    snapshot.poolName = pool.name
    snapshot.timestamp = timestamp
    const aprs = getPoolApr(pool, timestamp)
    pool.crvApr = aprs[0]
    pool.cvxApr = aprs[1]
    pool.extraRewardsApr = aprs[2]
    snapshot.lpTokenVirtualPrice = getLpTokenVirtualPrice(pool)
    snapshot.lpTokenUSDPrice = pool.lpTokenUSDPrice
    snapshot.crvApr = pool.crvApr
    snapshot.cvxApr = pool.cvxApr
    snapshot.extraRewardsApr = pool.extraRewardsApr
    snapshot.lpTokenBalance = pool.lpTokenBalance
    snapshot.curveTvlRatio = pool.curveTvlRatio
    if (pool.isV2) {
      const xcpProfits = getXcpProfitResult(pool)
      snapshot.xcpProfit = xcpProfits[0]
      snapshot.xcpProfitA = xcpProfits[1]
      snapshot.baseApr = getV2PoolBaseApr(pool, snapshot.xcpProfit, snapshot.xcpProfitA, timestamp)
    } else {
      snapshot.baseApr = getPoolBaseApr(pool, snapshot.lpTokenVirtualPrice, timestamp)
    }
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
