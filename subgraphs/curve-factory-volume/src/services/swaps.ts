import { Address, BigInt, Bytes } from '@graphprotocol/graph-ts'
import { Pool, SwapEvent } from '../../generated/schema'
import {
  getDailySwapSnapshot,
  getHourlySwapSnapshot,
  getTokenSnapshotByAssetType,
  getWeeklySwapSnapshot,
} from './snapshots'
import { BIG_DECIMAL_TWO, BIG_INT_ONE } from '../../../../packages/constants'

export function handleExchange(
  sold_id: BigInt,
  bought_id: BigInt,
  tokens_sold: BigInt,
  tokens_bought: BigInt,
  timestamp: BigInt,
  address: Address,
  txhash: Bytes
): void {
  const pool = Pool.load(address.toHexString())
  if (!pool) {
    return
  }

  const tokenSold = pool.coins[sold_id.toI32()]
  const tokenBought = pool.coins[bought_id.toI32()]
  const tokenSoldDecimals = pool.coinDecimals[sold_id.toI32()]
  const tokenBoughtDecimals = pool.coinDecimals[bought_id.toI32()]
  const amountSold = tokens_sold.toBigDecimal().div(tokenSoldDecimals.toBigDecimal())
  const amountBought = tokens_bought.toBigDecimal().div(tokenBoughtDecimals.toBigDecimal())

  const latestSnapshot = getTokenSnapshotByAssetType(pool, timestamp)
  const latestPrice = latestSnapshot.price
  const amountBoughtUSD = amountBought.times(latestPrice)
  const amountSoldUSD = amountSold.times(latestPrice)

  const swapEvent = new SwapEvent(txhash.toHexString())
  swapEvent.pool = address.toHexString()
  swapEvent.tokenBought = tokenBought
  swapEvent.tokenSold = tokenSold
  swapEvent.amountBought = amountBought
  swapEvent.amountSold = amountSold
  swapEvent.amountBoughtUSD = amountBoughtUSD
  swapEvent.amountSoldUSD = amountSoldUSD

  const volume = amountSold.plus(amountBought).div(BIG_DECIMAL_TWO)
  const volumeUSD = volume.times(latestPrice)

  const hourlySnapshot = getHourlySwapSnapshot(pool, timestamp)
  const dailySnapshot = getDailySwapSnapshot(pool, timestamp)
  const weeklySnapshot = getWeeklySwapSnapshot(pool, timestamp)

  hourlySnapshot.count = hourlySnapshot.count.plus(BIG_INT_ONE)
  dailySnapshot.count = dailySnapshot.count.plus(BIG_INT_ONE)
  weeklySnapshot.count = weeklySnapshot.count.plus(BIG_INT_ONE)

  hourlySnapshot.amountSold = hourlySnapshot.amountSold.plus(amountSold)
  dailySnapshot.amountSold = dailySnapshot.amountSold.plus(amountSold)
  weeklySnapshot.amountSold = weeklySnapshot.amountSold.plus(amountSold)

  hourlySnapshot.amountBought = hourlySnapshot.amountBought.plus(amountBought)
  dailySnapshot.amountBought = dailySnapshot.amountBought.plus(amountBought)
  weeklySnapshot.amountBought = weeklySnapshot.amountBought.plus(amountBought)

  hourlySnapshot.amountSoldUSD = hourlySnapshot.amountSoldUSD.plus(amountSoldUSD)
  dailySnapshot.amountSoldUSD = dailySnapshot.amountSoldUSD.plus(amountSoldUSD)
  weeklySnapshot.amountSoldUSD = weeklySnapshot.amountSoldUSD.plus(amountSoldUSD)

  hourlySnapshot.amountBoughtUSD = hourlySnapshot.amountBoughtUSD.plus(amountBoughtUSD)
  dailySnapshot.amountBoughtUSD = dailySnapshot.amountBoughtUSD.plus(amountBoughtUSD)
  weeklySnapshot.amountBoughtUSD = weeklySnapshot.amountBoughtUSD.plus(amountBoughtUSD)

  hourlySnapshot.volume = hourlySnapshot.volume.plus(volume)
  dailySnapshot.volume = dailySnapshot.volume.plus(volume)
  weeklySnapshot.volume = weeklySnapshot.volume.plus(volume)

  hourlySnapshot.volumeUSD = hourlySnapshot.volumeUSD.plus(volumeUSD)
  dailySnapshot.volumeUSD = dailySnapshot.volumeUSD.plus(volumeUSD)
  weeklySnapshot.volumeUSD = weeklySnapshot.volumeUSD.plus(volumeUSD)
}
