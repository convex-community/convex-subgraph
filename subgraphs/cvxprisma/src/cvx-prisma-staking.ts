import {
  RewardAdded1,
  RewardPaid,
  RewardRedirected,
  Staked,
  Withdrawn,
} from '../generated/cvxPrismaStaking/cvxPrismaStaking'
import {
  Withdrawal,
  Stake,
  RewardRedirected as RewardRedirectedEntity,
  RewardPaid as RewardPaidEntity,
} from '../generated/schema'
import { getStakingContract, getUser } from './services/entities'
import { BIG_DECIMAL_1E18, CVX_PRISMA_TOKEN_ADDRESS } from 'const'
import { toDecimal } from 'utils/maths'
import { getOrCreateToken, getTokenPrice } from './services/tokens'
import { takeSnapshot } from './services/snapshots'
import { getIntervalFromTimestamp, HOUR } from 'utils/time'

export function handleRewardPaid(event: RewardPaid): void {
  const contract = getStakingContract()
  const rewardPaid = new RewardPaidEntity(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
  const token = getOrCreateToken(event.params._rewardsToken)
  rewardPaid.user = getUser(event.params._user).id
  rewardPaid.token = token.id
  const amount = toDecimal(event.params._reward, token.decimals)
  rewardPaid.amount = amount
  const tokenPrice = getTokenPrice(event.params._rewardsToken, event.block.timestamp)
  rewardPaid.amountUsd = amount.times(tokenPrice.price)
  rewardPaid.index = contract.payoutCount
  rewardPaid.blockTimestamp = event.block.timestamp
  rewardPaid.blockNumber = event.block.number
  rewardPaid.transactionHash = event.transaction.hash

  contract.payoutCount += 1
  contract.save()
  rewardPaid.save()
  takeSnapshot(event.block.timestamp)
}

export function handleRewardRedirected(event: RewardRedirected): void {
  const user = getUser(event.params._account)
  const redirect = getUser(event.params._forward)
  user.rewardRedirect = redirect.id
  user.save()

  const redirected = new RewardRedirectedEntity(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
  redirected.user = user.id
  redirected.to = redirect.id
  redirected.blockTimestamp = event.block.timestamp
  redirected.blockNumber = event.block.number
  redirected.transactionHash = event.transaction.hash
  redirected.save()
  takeSnapshot(event.block.timestamp)
}

export function handleStaked(event: Staked): void {
  const contract = getStakingContract()
  const stake = new Stake(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
  const amount = event.params._amount.toBigDecimal().div(BIG_DECIMAL_1E18)
  contract.tokenBalance = contract.tokenBalance.plus(amount)
  const cvxPrismaPrice = getTokenPrice(CVX_PRISMA_TOKEN_ADDRESS, getIntervalFromTimestamp(event.block.timestamp, HOUR))
  contract.tvl = contract.tokenBalance.times(cvxPrismaPrice.price)

  stake.index = contract.depositCount
  contract.depositCount += 1
  const user = getUser(event.params._user)
  user.stakeSize = user.stakeSize.plus(amount)
  stake.userStakeSize = user.stakeSize
  stake.user = user.id
  stake.amount = amount
  stake.amountUsd = amount.times(cvxPrismaPrice.price)
  stake.blockTimestamp = event.block.timestamp
  stake.blockNumber = event.block.number
  stake.transactionHash = event.transaction.hash
  stake.save()
  contract.save()
  user.save()
  takeSnapshot(event.block.timestamp)
}

export function handleWithdrawn(event: Withdrawn): void {
  const contract = getStakingContract()
  const withdrawal = new Withdrawal(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
  const amount = event.params._amount.toBigDecimal().div(BIG_DECIMAL_1E18)
  contract.tokenBalance = contract.tokenBalance.minus(amount)
  const cvxPrismaPrice = getTokenPrice(CVX_PRISMA_TOKEN_ADDRESS, getIntervalFromTimestamp(event.block.timestamp, HOUR))
  contract.tvl = contract.tokenBalance.times(cvxPrismaPrice.price)

  withdrawal.index = contract.withdrawCount
  contract.withdrawCount += 1
  const user = getUser(event.params._user)
  user.stakeSize = user.stakeSize.minus(amount)
  withdrawal.userStakeSize = user.stakeSize
  withdrawal.user = user.id
  withdrawal.amount = amount
  withdrawal.amountUsd = amount.times(cvxPrismaPrice.price)
  withdrawal.blockTimestamp = event.block.timestamp
  withdrawal.blockNumber = event.block.number
  withdrawal.transactionHash = event.transaction.hash
  withdrawal.save()
  contract.save()
  user.save()
  takeSnapshot(event.block.timestamp)
}

export function handleRewardAdded(event: RewardAdded1): void {
  const contract = getStakingContract()
  const rewardTokens = contract.rewardTokens
  const token = getOrCreateToken(event.params._reward)
  rewardTokens.push(token.id)
  contract.rewardTokens = rewardTokens
  contract.save()
  takeSnapshot(event.block.timestamp)
}
