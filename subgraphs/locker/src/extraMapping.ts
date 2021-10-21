import { RewardAdded, RewardPaid } from '../generated/vlCvxExtraRewardDistribution/vlCvxExtraRewardDistribution'
import { AddedReward, ReceivedReward } from '../generated/schema'
import { getUser } from './services/users'
import {
  getEventId,
  updateAggregatedRewards,
} from './services/events'
import { getOrCreateToken } from './services/tokens'
import { CVX_ADDRESS } from 'const'
import { getUsdRate } from 'utils/pricing'
import { Address } from '@graphprotocol/graph-ts'
import { exponentToBigDecimal } from 'utils/maths'

const cvx = getOrCreateToken(CVX_ADDRESS)

export function handleRewardPaid(event: RewardPaid): void {
  const user = getUser(event.params._user)
  const reward = new ReceivedReward(getEventId(event))
  reward.user = user.id
  reward.amount = event.params._reward
  const token = getOrCreateToken(event.params._rewardsToken)
  reward.amountUSD = getUsdRate(Address.fromString(token.id)).times(
    reward.amount.toBigDecimal().div(exponentToBigDecimal(token.decimals))
  )
  reward.token = token.id
  reward.time = event.block.timestamp
  reward.kickReward = false
  reward.save()

  updateAggregatedRewards(reward.time, token, reward.amount, reward.amountUSD)
}

export function handleRewardAdded(event: RewardAdded): void {
  const reward = new AddedReward(getEventId(event))
  reward.amount = event.params._reward
  const token = getOrCreateToken(event.params._token)
  reward.amountUSD = getUsdRate(Address.fromString(token.id)).times(
    reward.amount.toBigDecimal().div(exponentToBigDecimal(token.decimals))
  )
  reward.token = token.id
  reward.time = event.block.timestamp
  reward.save()
}
