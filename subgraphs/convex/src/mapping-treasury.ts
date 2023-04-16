import { getDailyRevenueSnapshot } from './services/revenue'
import { getUsdRate } from 'utils/pricing'
import { BIG_DECIMAL_1E18, THREE_CRV_ADDRESS, THREE_CRV_TOKEN } from 'const'
import { getPlatform } from './services/platform'
import { getIntervalFromTimestamp, DAY } from 'utils/time'
import { ClaimedReward } from '../generated/CvxCrvPol/TreasurySwap'
import { Claimed } from '../generated/VoteMarketRewards/VoteMarket'
import { Address, BigDecimal, BigInt } from '@graphprotocol/graph-ts'

function addToRevenueSnapshot(timestamp: BigInt, value: BigDecimal): void {
  const platform = getPlatform()
  const day = getIntervalFromTimestamp(timestamp, DAY)
  const revenueSnapshot = getDailyRevenueSnapshot(day)

  revenueSnapshot.otherRevenue = revenueSnapshot.otherRevenue.plus(value)
  platform.totalOtherRevenue = platform.totalOtherRevenue.plus(value)

  revenueSnapshot.save()
  platform.save()
}

export function handleVoteMarketRewardClaimed(event: Claimed): void {
  if (event.params.user != Address.fromString('0x989AEb4d175e16225E39E87d0D97A3360524AD80')) {
    return
  }
  const amount = event.params.amount
  const tokenPrice = getUsdRate(event.params.rewardToken)
  const value = amount.toBigDecimal().div(BIG_DECIMAL_1E18).times(tokenPrice)
  addToRevenueSnapshot(event.block.timestamp, value)
}

export function handleRewardClaimed(event: ClaimedReward): void {
  const amount = event.params._amount
  const tokenPrice = getUsdRate(event.params._token)
  const value = amount.toBigDecimal().div(BIG_DECIMAL_1E18).times(tokenPrice)
  addToRevenueSnapshot(event.block.timestamp, value)
}
