import { DailyPoolSnapshot, Pool } from '../../generated/schema'
import { BigDecimal, BigInt, log } from '@graphprotocol/graph-ts'
import { getIntervalFromTimestamp, DAY } from 'utils/time'
import { bigDecimalExponential } from 'utils/maths'
import { getPoolApr, getXcpProfitResult } from './pools'
import {getLendingApr, getLpTokenPriceUSD, getLpTokenVirtualPrice, getPoolBaseApr, getV2PoolBaseApr} from './apr'
import { getPlatform } from './platform'

export function createNewSnapsot(snapId: string): DailyPoolSnapshot {
  const snapshot = new DailyPoolSnapshot(snapId)
  snapshot.id = snapId
  snapshot.poolid = ''
  snapshot.poolName = ''
  snapshot.withdrawalCount = BigInt.zero()
  snapshot.depositCount = BigInt.zero()
  snapshot.withdrawalVolume = BigInt.zero()
  snapshot.depositVolume = BigInt.zero()
  snapshot.withdrawalValue = BigDecimal.zero()
  snapshot.depositValue = BigDecimal.zero()
  snapshot.lpTokenBalance = BigInt.zero()
  snapshot.lpTokenVirtualPrice = BigDecimal.zero()
  snapshot.lpTokenUSDPrice = BigDecimal.zero()
  snapshot.xcpProfit = BigDecimal.zero()
  snapshot.xcpProfitA = BigDecimal.zero()
  snapshot.tvl = BigDecimal.zero()
  snapshot.curveTvlRatio = BigDecimal.zero()
  snapshot.crvApr = BigDecimal.zero()
  snapshot.cvxApr = BigDecimal.zero()
  snapshot.extraRewardsApr = BigDecimal.zero()
  snapshot.baseApr = BigDecimal.zero()
  snapshot.rawBaseApr = BigDecimal.zero()
  snapshot.timestamp = BigInt.zero()
  snapshot.block = BigInt.zero()
  snapshot.save()
  return snapshot
}

export function getDailyPoolSnapshot(pool: Pool, timestamp: BigInt, block: BigInt): DailyPoolSnapshot {
  const time = getIntervalFromTimestamp(timestamp, DAY)
  const snapId = pool.name + '-' + pool.poolid.toString() + '-' + time.toString()
  let snapshot = DailyPoolSnapshot.load(snapId)
  if (!snapshot) {
    log.info('Taking pool snapshot for pool {} ({}), block: {}', [pool.name, pool.swap.toHexString(), block.toString()])
    snapshot = createNewSnapsot(snapId)
    snapshot.poolid = pool.poolid.toString()
    snapshot.poolName = pool.name
    snapshot.timestamp = timestamp
    snapshot.lpTokenVirtualPrice = getLpTokenVirtualPrice(pool)

    const lpPrice = getLpTokenPriceUSD(pool)
    log.debug('LP Token price USD for pool {}: {}', [pool.name, lpPrice.toString()])
    pool.lpTokenUSDPrice = lpPrice
    snapshot.lpTokenUSDPrice = pool.lpTokenUSDPrice

    const aprs = getPoolApr(pool, timestamp, lpPrice)
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
    let baseApr = BigDecimal.zero()
    if (pool.isV2) {
      const xcpProfits = getXcpProfitResult(pool)
      snapshot.xcpProfit = xcpProfits[0]
      snapshot.xcpProfitA = xcpProfits[1]
      baseApr = getV2PoolBaseApr(pool, snapshot.xcpProfit, snapshot.xcpProfitA, timestamp)
    } else if (pool.isLending) {
      baseApr = getLendingApr(pool)
    }
    else {
        baseApr = getPoolBaseApr(pool, snapshot.lpTokenVirtualPrice, timestamp)
      }
    // annualize Apr
    const annualizedApr = bigDecimalExponential(baseApr, BigDecimal.fromString('365'))
    snapshot.baseApr = annualizedApr
    snapshot.rawBaseApr = baseApr
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
