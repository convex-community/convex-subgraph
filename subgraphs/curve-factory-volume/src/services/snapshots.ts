import {
  Pool,
  TokenSnapshot,
  DailySwapVolumeSnapshot,
  HourlySwapVolumeSnapshot,
  WeeklySwapVolumeSnapshot,
  HourlyLiquidityVolumeSnapshot,
  DailyLiquidityVolumeSnapshot,
  WeeklyLiquidityVolumeSnapshot,
} from '../../generated/schema'
import { Address, BigDecimal, BigInt, Bytes, log } from '@graphprotocol/graph-ts'
import { DAY, getIntervalFromTimestamp, HOUR, WEEK } from '../../../../packages/utils/time'
import { getUsdRate } from '../../../../packages/utils/pricing'
import { ChainlinkAggregator } from '../../../curve-pools/generated/Booster/ChainlinkAggregator'
import {
  BIG_DECIMAL_1E8,
  BIG_DECIMAL_ONE,
  BIG_DECIMAL_ZERO,
  FOREX_ORACLES,
  USDT_ADDRESS,
  WBTC_ADDRESS,
  WETH_ADDRESS,
} from '../../../../packages/constants'
import { bytesToAddress } from '../../../../packages/utils'

export function getForexUsdRate(token: string): BigDecimal {
  // returns the amount of USD 1 unit of the foreign currency is worth
  const priceOracle = ChainlinkAggregator.bind(FOREX_ORACLES[token])
  const conversionRateReponse = priceOracle.try_latestAnswer()
  const conversionRate = conversionRateReponse.reverted
    ? BIG_DECIMAL_ONE
    : conversionRateReponse.value.toBigDecimal().div(BIG_DECIMAL_1E8)
  log.debug('Answer from Forex oracle {} for token {}: {}', [
    FOREX_ORACLES[token].toHexString(),
    token,
    conversionRate.toString(),
  ])
  return conversionRate
}

export function getTokenSnapshot(token: Address, timestamp: BigInt, forex: boolean): TokenSnapshot {
  const hour = getIntervalFromTimestamp(timestamp, HOUR)
  const snapshotId = token.toHexString() + '-' + hour.toString()
  let snapshot = TokenSnapshot.load(snapshotId)
  if (!snapshot) {
    snapshot = new TokenSnapshot(snapshotId)
    if (forex) {
      snapshot.price = getForexUsdRate(token.toHexString())
    } else {
      snapshot.price = getUsdRate(token)
    }
    snapshot.save()
  }
  return snapshot
}

export function getCryptoTokenSnapshot(pool: Pool, timestamp: BigInt): TokenSnapshot {
  // we use this for stable crypto pools where one assets may not be traded
  // outside of curve. we just try to get a price out of one of the assets traded
  // and use that
  const hour = getIntervalFromTimestamp(timestamp, HOUR)
  const snapshotId = pool.id + '-' + hour.toString()
  let snapshot = TokenSnapshot.load(snapshotId)
  if (!snapshot) {
    snapshot = new TokenSnapshot(snapshotId)
    let price = BIG_DECIMAL_ZERO
    for (let i = 0; i < pool.coins.length; ++i) {
      price = getUsdRate(bytesToAddress(pool.coins[i]))
      if (price != BIG_DECIMAL_ZERO) {
        break
      }
    }
    snapshot.timestamp = hour
    snapshot.price = price
    snapshot.save()
  }
  return snapshot
}

export function getTokenSnapshotByAssetType(pool: Pool, timestamp: BigInt): TokenSnapshot {
  if (FOREX_ORACLES.has(pool.id)) {
    return getTokenSnapshot(bytesToAddress(pool.address), timestamp, true)
  } else if (pool.assetType == 1) {
    return getTokenSnapshot(WETH_ADDRESS, timestamp, false)
  } else if (pool.assetType == 2) {
    return getTokenSnapshot(WBTC_ADDRESS, timestamp, false)
  } else if (pool.assetType == 0) {
    return getTokenSnapshot(USDT_ADDRESS, timestamp, false)
  } else {
    return getCryptoTokenSnapshot(pool, timestamp)
  }
}

export function getHourlySwapSnapshot(pool: Pool, timestamp: BigInt): HourlySwapVolumeSnapshot {
  const hour = getIntervalFromTimestamp(timestamp, HOUR)
  const snapshotId = pool.id + '-' + hour.toString()
  let snapshot = HourlySwapVolumeSnapshot.load(snapshotId)
  if (!snapshot) {
    snapshot = new HourlySwapVolumeSnapshot(snapshotId)
    snapshot.pool = pool.id
    snapshot.timestamp = hour
    snapshot.save()
  }
  return snapshot
}

export function getDailySwapSnapshot(pool: Pool, timestamp: BigInt): DailySwapVolumeSnapshot {
  const day = getIntervalFromTimestamp(timestamp, DAY)
  const snapshotId = pool.id + '-' + day.toString()
  let snapshot = DailySwapVolumeSnapshot.load(snapshotId)
  if (!snapshot) {
    snapshot = new DailySwapVolumeSnapshot(snapshotId)
    snapshot.pool = pool.id
    snapshot.timestamp = day
    snapshot.save()
  }
  return snapshot
}

export function getWeeklySwapSnapshot(pool: Pool, timestamp: BigInt): WeeklySwapVolumeSnapshot {
  const week = getIntervalFromTimestamp(timestamp, WEEK)
  const snapshotId = pool.id + '-' + week.toString()
  let snapshot = WeeklySwapVolumeSnapshot.load(snapshotId)
  if (!snapshot) {
    snapshot = new WeeklySwapVolumeSnapshot(snapshotId)
    snapshot.pool = pool.id
    snapshot.timestamp = week
    snapshot.save()
  }
  return snapshot
}

export function getHourlyLiquiditySnapshot(pool: Pool, timestamp: BigInt): HourlyLiquidityVolumeSnapshot {
  const hour = getIntervalFromTimestamp(timestamp, HOUR)
  const snapshotId = pool.id + '-' + hour.toString()
  let snapshot = HourlyLiquidityVolumeSnapshot.load(snapshotId)
  if (!snapshot) {
    snapshot = new HourlyLiquidityVolumeSnapshot(snapshotId)
    const coinArray = snapshot.amountAdded
    for (let i = 0; i < pool.coins.length; i++) {
      coinArray.push(BIG_DECIMAL_ZERO)
    }
    snapshot.pool = pool.id
    snapshot.timestamp = hour
    snapshot.amountAdded = coinArray
    snapshot.amountRemoved = coinArray
    snapshot.save()
  }
  return snapshot
}

export function getDailyLiquiditySnapshot(pool: Pool, timestamp: BigInt): DailyLiquidityVolumeSnapshot {
  const day = getIntervalFromTimestamp(timestamp, DAY)
  const snapshotId = pool.id + '-' + day.toString()
  let snapshot = DailyLiquidityVolumeSnapshot.load(snapshotId)
  if (!snapshot) {
    snapshot = new DailyLiquidityVolumeSnapshot(snapshotId)
    const coinArray = snapshot.amountAdded
    for (let i = 0; i < pool.coins.length; i++) {
      coinArray.push(BIG_DECIMAL_ZERO)
    }
    snapshot.pool = pool.id
    snapshot.timestamp = day
    snapshot.amountAdded = coinArray
    snapshot.amountRemoved = coinArray
    snapshot.save()
  }
  return snapshot
}

export function getWeeklyLiquiditySnapshot(pool: Pool, timestamp: BigInt): WeeklyLiquidityVolumeSnapshot {
  const week = getIntervalFromTimestamp(timestamp, WEEK)
  const snapshotId = pool.id + '-' + week.toString()
  let snapshot = WeeklyLiquidityVolumeSnapshot.load(snapshotId)
  if (!snapshot) {
    snapshot = new WeeklyLiquidityVolumeSnapshot(snapshotId)
    const coinArray = snapshot.amountAdded
    for (let i = 0; i < pool.coins.length; i++) {
      coinArray.push(BIG_DECIMAL_ZERO)
    }
    snapshot.pool = pool.id
    snapshot.timestamp = week
    snapshot.amountAdded = coinArray
    snapshot.amountRemoved = coinArray
    snapshot.save()
  }
  return snapshot
}
