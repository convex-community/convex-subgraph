import { getPlatform } from './services/platform'
import { Bribed, UpdatedFee } from '../generated/VotiumBribe/Votium'
import { getDecimals, getUsdRate } from 'utils/pricing'
import { exponentToBigDecimal } from 'utils/maths'
import { getIntervalFromTimestamp, WEEK } from 'utils/time'
import { getRevenueWeeklySnapshot } from './services/revenue'
import { RevenueWeeklySnapshot } from '../generated/schema'
import { BigDecimal } from '@graphprotocol/graph-ts'

export function handleUpdatedFee(event: UpdatedFee): void {
  const platform = getPlatform()
  platform.bribeFee = event.params._feeAmount
  platform.save()
}

export function handleBribed(event: Bribed): void {
  const bribeTokenPrice = getUsdRate(event.params._token)
  const decimals = getDecimals(event.params._token)
  const bribeValue = event.params._amount.toBigDecimal().div(exponentToBigDecimal(decimals)).times(bribeTokenPrice)

  const week = getIntervalFromTimestamp(event.block.timestamp, WEEK)
  const revenueSnapshot = getRevenueWeeklySnapshot(week.toString())

  const previousWeek = getIntervalFromTimestamp(event.block.timestamp.minus(WEEK), WEEK)
  const previousWeekRevenue = RevenueWeeklySnapshot.load(previousWeek.toString())

  const prevCumulativeBribeRevenue = previousWeekRevenue
    ? previousWeekRevenue.cumulativeBribeRevenue
    : BigDecimal.zero()

  revenueSnapshot.bribeRevenue = revenueSnapshot.bribeRevenue.plus(bribeValue)
  revenueSnapshot.cumulativeBribeRevenue =
    revenueSnapshot.cumulativeBribeRevenue == BigDecimal.zero()
      ? prevCumulativeBribeRevenue
      : revenueSnapshot.cumulativeBribeRevenue.plus(bribeValue)
  revenueSnapshot.save()
}
