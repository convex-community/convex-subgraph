import { getPlatform } from './services/platform'
import { Bribed, UpdatedFee } from '../generated/VotiumBribe/Votium'
import { getDecimals, getUsdRate } from 'utils/pricing'
import { exponentToBigDecimal } from 'utils/maths'
import { getIntervalFromTimestamp, DAY } from 'utils/time'
import { getRevenueDailySnapshot } from './services/revenue'
import { RevenueDailySnapshot } from '../generated/schema'
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

  const day = getIntervalFromTimestamp(event.block.timestamp, DAY)
  const revenueSnapshot = getRevenueDailySnapshot(day)

  revenueSnapshot.bribeRevenue = revenueSnapshot.bribeRevenue.plus(bribeValue)
  revenueSnapshot.bribeRevenueCumulative = revenueSnapshot.bribeRevenueCumulative.plus(bribeValue)
  revenueSnapshot.save()
}
