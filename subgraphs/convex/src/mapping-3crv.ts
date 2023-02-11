import { Address } from '@graphprotocol/graph-ts'
import { getDailyRevenueSnapshot } from './services/revenue'
import { RewardAdded } from '../generated/Booster/VirtualBalanceRewardPool'
import { getUsdRate } from 'utils/pricing'
import { BIG_DECIMAL_1E18, THREE_CRV_TOKEN } from 'const'
import { getPlatform } from './services/platform'
import { getIntervalFromTimestamp, DAY } from 'utils/time'

export function handleRewardAdded(event: RewardAdded): void {
  const amount = event.params.reward
  const threeCrvPrice = getUsdRate(Address.fromString(THREE_CRV_TOKEN))
  const value = amount.toBigDecimal().div(BIG_DECIMAL_1E18).times(threeCrvPrice)

  const platform = getPlatform()
  const day = getIntervalFromTimestamp(event.block.timestamp, DAY)
  const revenueSnapshot = getDailyRevenueSnapshot(day)

  revenueSnapshot.threeCrvRevenueToCvxCrvStakersAmount =
    revenueSnapshot.threeCrvRevenueToCvxCrvStakersAmount.plus(value)
  platform.totalThreeCrvRevenueToCvxCrvStakers = platform.totalThreeCrvRevenueToCvxCrvStakers.plus(value)

  revenueSnapshot.save()
  platform.save()
}
