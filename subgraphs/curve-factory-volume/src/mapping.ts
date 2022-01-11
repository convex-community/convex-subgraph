import { BasePoolAdded, MetaPoolDeployed } from '../generated/CurveFactory/CurveFactory'

import { createNewPool } from './service/pools'
import { TokenExchangeUnderlying, TokenExchange } from '../generated/templates/BasePool/CurvePool'
import { Pool, SwapEvent } from '../generated/schema'
import {
  getDailySwapSnapshot,
  getHourlySwapSnapshot,
  getTokenSnapshotByAssetType,
  getWeeklySwapSnapshot,
} from './service/snapshots'
import { BIG_DECIMAL_TWO, BIG_INT_ONE } from '../../../packages/constants'

export function handleBasePoolAdded(event: BasePoolAdded): void {
  createNewPool(event.params.base_pool, false, event.block.timestamp, event.block.number, event.transaction.hash)
}

export function handleMetaPoolDeployed(event: MetaPoolDeployed): void {
  createNewPool(event.params.base_pool, true, event.block.timestamp, event.block.number, event.transaction.hash)
}

export function handleTokenExchange(event: TokenExchange): void {
  const trade = event.params
  const pool = Pool.load(event.address.toHexString())
  if (!pool) {
    return
  }

  const tokenSold = pool.coins[trade.sold_id.toI32()]
  const tokenBought = pool.coins[trade.bought_id.toI32()]
  const tokenSoldDecimals = pool.coinDecimals[trade.sold_id.toI32()]
  const tokenBoughtDecimals = pool.coinDecimals[trade.bought_id.toI32()]
  const amountSold = trade.tokens_sold.toBigDecimal().div(tokenSoldDecimals.toBigDecimal())
  const amountBought = trade.tokens_bought.toBigDecimal().div(tokenBoughtDecimals.toBigDecimal())

  const latestSnapshot = getTokenSnapshotByAssetType(pool, event.block.timestamp)
  const latestPrice = latestSnapshot.price
  const amountBoughtUSD = amountBought.times(latestPrice)
  const amountSoldUSD = amountSold.times(latestPrice)

  const swapEvent = new SwapEvent(event.transaction.hash.toHexString())
  swapEvent.pool = event.address.toHexString()
  swapEvent.tokenBought = tokenBought
  swapEvent.tokenSold = tokenSold
  swapEvent.amountBought = amountBought
  swapEvent.amountSold = amountSold
  swapEvent.amountBoughtUSD = amountBoughtUSD
  swapEvent.amountSoldUSD = amountSoldUSD

  const volume = amountSold.plus(amountBought).div(BIG_DECIMAL_TWO)
  const volumeUSD = volume.times(latestPrice)

  const hourlySnapshot = getHourlySwapSnapshot(pool, event.block.timestamp)
  const dailySnapshot = getDailySwapSnapshot(pool, event.block.timestamp)
  const weeklySnapshot = getWeeklySwapSnapshot(pool, event.block.timestamp)

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

export function handleTokenExchangeUnderlying(event: TokenExchangeUnderlying): void {
  const a = event.block.timestamp
  const b = a.plus(a)
}
