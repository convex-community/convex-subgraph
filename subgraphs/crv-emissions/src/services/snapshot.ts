import { Address, BigDecimal, BigInt } from '@graphprotocol/graph-ts'
import { getIntervalFromTimestamp, WEEK } from '../../../../packages/utils/time'
import {
  ADDRESS_ZERO,
  BIG_DECIMAL_1E18,
  BIG_DECIMAL_ONE,
  BIG_DECIMAL_ZERO,
  CRV_ADDRESS,
  CURVE_PLATFORM_ID,
  LINK_ADDRESS,
  WBTC_ADDRESS,
  WETH_ADDRESS,
} from '../../../../packages/constants'
import { CRVToken } from '../../generated/GaugeController/CRVToken'
import { getUsdRate } from '../../../../packages/utils/pricing'
import { getPlatform } from './platform'
import {
  Emission,
  Gauge,
  GaugeType,
  GaugeWeight,
  GaugeTotalWeight,
  PoolSnapshot,
  SnapshotTime,
  Platform,
} from '../../generated/schema'
import { getGrowthRate, getPool } from './pools'
import { getLpTokenPriceUSD, getLpTokenVirtualPrice, getPoolTokenPrice } from './lppricing'
import { bytesToAddress } from '../../../../packages/utils'
import { ERC20 } from '../../generated/GaugeController/ERC20'
import { log } from '@graphprotocol/graph-ts/index'

export function getSnapshot(id: string): PoolSnapshot {
  let snapshot = PoolSnapshot.load(id)
  if (!snapshot) {
    snapshot = new PoolSnapshot(id)
  }
  return snapshot
}

export function createAllSnapshots(timestamp: BigInt, block: BigInt): void {
  const thisWeek = getIntervalFromTimestamp(timestamp, WEEK)
  const platform = getPlatform()
  let snapshotTime = SnapshotTime.load(thisWeek.toString())
  if (snapshotTime) {
    return
  }
  snapshotTime = new SnapshotTime(thisWeek.toString())
  snapshotTime.save()
  log.warning('createAllSnapshot ids {}, length {}', [
    platform.gaugeIds.toString(),
    platform.gaugeIds.length.toString(),
  ])
  if (platform.gaugeIds.length == 0) {
    return
  }
  const previousWeek = getIntervalFromTimestamp(timestamp.minus(WEEK), WEEK)
  const crvTokenContract = CRVToken.bind(CRV_ADDRESS)
  const crvTokenMintedResult = crvTokenContract.try_mintable_in_timeframe(previousWeek, thisWeek)
  if (crvTokenMintedResult.reverted) {
    log.warning('Call to mintable_in_timeframe reverted for timestamps {}, {}', [
      previousWeek.toString(),
      thisWeek.toString(),
    ])
    return
  }
  const crvTokenMinted = crvTokenMintedResult.value
  // Can only get the price after creation of ETH-CRV SLP
  const crvPrice = block.toI32() > 10928474 ? getUsdRate(CRV_ADDRESS) : BIG_DECIMAL_ZERO
  const totalWeight = GaugeTotalWeight.load(thisWeek.toString())
  for (let i = 0; i < platform.gaugeIds.length; i++) {
    const gaugeId = platform.gaugeIds[i]
    const gauge = Gauge.load(gaugeId)
    if (!gauge) {
      log.warning('Unable to load gauge {}:', [gaugeId.toString()])
      continue
    }
    let gaugeWeight = GaugeWeight.load(gauge.id + '-' + thisWeek.toString())
    // If a gauge has not received any votes during the previous week, it
    // will not have a weight entry for that week as no event was triggered
    // the weight will still be equal to that of the week before
    if (!gaugeWeight) {
      log.debug('Missing gauge weight for {} at time {}', [gauge.id, thisWeek.toString()])
      gaugeWeight = GaugeWeight.load(gauge.id + '-' + previousWeek.toString())
      // We also create an entry for that missing gauge weight
      if (gaugeWeight) {
        const missingUnvotedGaugeWeight = new GaugeWeight(gauge.id + '-' + thisWeek.toString())
        missingUnvotedGaugeWeight.weight = gaugeWeight.weight
        missingUnvotedGaugeWeight.timestamp = thisWeek
        missingUnvotedGaugeWeight.block = block
        missingUnvotedGaugeWeight.gauge = gauge.id
        missingUnvotedGaugeWeight.save()
      }
    }
    let emission = Emission.load(gauge.id + '-' + thisWeek.toString())
    if (!emission) {
      emission = new Emission(gauge.id + '-' + thisWeek.toString())
    }
    emission.timestamp = thisWeek
    emission.block = block
    emission.gauge = gauge.id
    if (gaugeWeight) {
      const gaugeType = GaugeType.load(gauge.type)
      const gaugeTypeWeight = gaugeType ? gaugeType.weight.div(BIG_DECIMAL_1E18) : BIG_DECIMAL_ONE
      const total = totalWeight ? totalWeight.weight : BIG_DECIMAL_ONE
      const gaugeRelativeWeight = gaugeWeight.weight.times(gaugeTypeWeight).div(total)
      const weeklyEmissions = crvTokenMinted.toBigDecimal().times(gaugeRelativeWeight)
      emission.crvAmount = weeklyEmissions.div(BIG_DECIMAL_1E18)
      emission.value = emission.crvAmount.times(crvPrice)

      if (
        Address.fromString(gauge.pool) == ADDRESS_ZERO || // non-mainnet emissions
        block.toI32() < 12667823
      ) {
        // no registry before this block
        continue
      }
      const pool = getPool(Address.fromString(gauge.pool))
      emission.pool = gauge.pool
      const snapshot = getSnapshot(pool.id + '-' + thisWeek.toString())
      const previousSnapshot = PoolSnapshot.load(pool.id + '-' + previousWeek.toString())
      const previousTvl = previousSnapshot ? previousSnapshot.tvl : BIG_DECIMAL_ZERO
      snapshot.pool = pool.id
      snapshot.timestamp = thisWeek
      snapshot.block = block
      snapshot.virtualPrice = getLpTokenVirtualPrice(pool.lpToken)
      const lpTokenContract = ERC20.bind(bytesToAddress(pool.lpToken))
      snapshot.lpTokenSupply = lpTokenContract.totalSupply()
      snapshot.poolTokenPrice = getPoolTokenPrice(pool)
      const lpPrice = getLpTokenPriceUSD(pool)
      snapshot.tvl = snapshot.lpTokenSupply.toBigDecimal().div(BIG_DECIMAL_1E18).times(lpPrice)
      if (!pool.isV2) {
        const rate = getGrowthRate(pool, snapshot.virtualPrice, timestamp)
        snapshot.fees = previousTvl.times(rate).times(BigDecimal.fromString('2'))
      }
      snapshot.save()
      pool.tvl = snapshot.tvl
      pool.save()
    }
    emission.save()
  }
}
