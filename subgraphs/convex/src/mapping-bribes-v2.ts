import {
  IncreasedIncentive as IncreasedIncentiveEvent,
  NewIncentive as NewIncentiveEvent,
  UpdatedFee as UpdatedFeeEvent,
} from '../generated/VotiumBribeV2/VotiumV2'

import { BigInt } from '@graphprotocol/graph-ts'
import { getPlatform } from './services/platform'
import { getDecimals, getUsdRate } from 'utils/pricing'
import { exponentToBigDecimal } from 'utils/maths'
import { getDailyRevenueSnapshot } from './services/revenue'
import { getIntervalFromTimestamp, DAY, WEEK } from 'utils/time'

export function getCurrentRound(timestamp: BigInt): BigInt {
  const BASE = 1348 * 86400 * 14
  const week = getIntervalFromTimestamp(timestamp, WEEK)
  const round = week.minus(BigInt.fromI32(BASE)).div(WEEK.times(BigInt.fromI32(2)))
  return round
}

export function handleIncreasedIncentive(event: IncreasedIncentiveEvent): void {
  const bribeTokenPrice = getUsdRate(event.params._token)
  const decimals = getDecimals(event.params._token)
  const bribeValue = event.params._increase.toBigDecimal().div(exponentToBigDecimal(decimals)).times(bribeTokenPrice)
  const platform = getPlatform()
  const day = getIntervalFromTimestamp(event.block.timestamp, DAY)
  const futureWeeks = event.params._round.minus(getCurrentRound(event.block.timestamp))
  const revenueSnapshot = getDailyRevenueSnapshot(day.plus(WEEK.times(futureWeeks)))

  revenueSnapshot.bribeRevenue = revenueSnapshot.bribeRevenue.plus(bribeValue)
  platform.totalBribeRevenue = platform.totalBribeRevenue.plus(bribeValue)
  platform.save()
  revenueSnapshot.save()
}

export function handleNewIncentive(event: NewIncentiveEvent): void {
  const bribeTokenPrice = getUsdRate(event.params._token)
  const decimals = getDecimals(event.params._token)
  const bribeValue = event.params._amount.toBigDecimal().div(exponentToBigDecimal(decimals)).times(bribeTokenPrice)
  const platform = getPlatform()
  const day = getIntervalFromTimestamp(event.block.timestamp, DAY)
  const futureWeeks = event.params._round.minus(getCurrentRound(event.block.timestamp))
  const revenueSnapshot = getDailyRevenueSnapshot(day.plus(WEEK.times(futureWeeks)))

  revenueSnapshot.bribeRevenue = revenueSnapshot.bribeRevenue.plus(bribeValue)
  platform.totalBribeRevenue = platform.totalBribeRevenue.plus(bribeValue)
  platform.save()
  revenueSnapshot.save()
}

export function handleUpdatedFeeV2(event: UpdatedFeeEvent): void {
  const platform = getPlatform()

  platform.bribeFee = event.params._feeAmount
  platform.save()
}
