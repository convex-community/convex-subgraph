import {
  RewardAdded1,
  RewardPaid,
  RewardRedirected,
  Staked,
  Withdrawn,
} from '../generated/cvxPrismaStaking/cvxPrismaStaking'
import {
  RewardPaid as RewardPaidYPrisma,
  RewardAdded as RewardAddedYPrisma,
  Withdrawn as WithdrawnYPrisma,
  Staked as StakedYPrisma,
  StakedFor,
} from '../generated/yPrismaStaking/yPrismaStaking'
import {
  Withdrawal,
  Stake,
  RewardRedirected as RewardRedirectedEntity,
  RewardPaid as RewardPaidEntity,
  User,
} from '../generated/schema'
import { getStakingBalance, getStakingContract, getUser } from './services/entities'
import {
  BIG_DECIMAL_1E18,
  CVX_PRISMA_TOKEN_ADDRESS,
  PRISMA_TOKEN_ADDRESS,
  WSTETH_TOKEN_ADDRESS,
  YPRISMA_TOKEN_ADDRESS,
} from 'const'
import { toDecimal } from 'utils/maths'
import { getOrCreateToken, getTokenPrice } from './services/tokens'
import { takeSnapshot } from './services/snapshots'
import { getIntervalFromTimestamp, HOUR } from 'utils/time'
import { ethereum } from '@graphprotocol/graph-ts/index'
import { Address, BigDecimal, BigInt } from '@graphprotocol/graph-ts'

export function handleRewardGeneric(event: ethereum.Event, reward: BigInt, user: User, rewardToken: Address): void {
  const contract = getStakingContract(event.address)
  const rewardPaid = new RewardPaidEntity(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
  const token = getOrCreateToken(rewardToken)
  rewardPaid.user = user.id
  rewardPaid.token = token.id
  const amount = toDecimal(reward, token.decimals)
  const tokenPrice = getTokenPrice(rewardToken, event.block.timestamp)
  rewardPaid.amountUsd = amount.times(tokenPrice.price)
  rewardPaid.stakingContract = contract.id
  rewardPaid.index = contract.payoutCount
  rewardPaid.blockTimestamp = event.block.timestamp
  rewardPaid.blockNumber = event.block.number
  rewardPaid.transactionHash = event.transaction.hash

  contract.payoutCount += 1
  contract.save()
  rewardPaid.save()
  takeSnapshot(event.block.timestamp)
}

export function handleRewardPaidCvxPrisma(event: RewardPaid): void {
  handleRewardGeneric(event, event.params._reward, getUser(event.params._user), event.params._rewardsToken)
}

export function handleRewardPaidYPrisma(event: RewardPaidYPrisma): void {
  handleRewardGeneric(event, event.params.reward, getUser(event.params.user), YPRISMA_TOKEN_ADDRESS)
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

export function handleStakedGeneric(
  event: ethereum.Event,
  stakedAmount: BigInt,
  userAddress: Address,
  wrapperToken: Address
): void {
  const contract = getStakingContract(event.address)
  const stake = new Stake(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
  const amount = stakedAmount.toBigDecimal().div(BIG_DECIMAL_1E18)
  contract.tokenBalance = contract.tokenBalance.plus(amount)
  const hourlyTimestamp = getIntervalFromTimestamp(event.block.timestamp, HOUR)
  const wrappedPrismaPrice = getTokenPrice(wrapperToken, hourlyTimestamp)
  contract.tvl = contract.tokenBalance.times(wrappedPrismaPrice.price)
  const prismaPrice = getTokenPrice(PRISMA_TOKEN_ADDRESS, hourlyTimestamp)
  contract.peg =
    prismaPrice.price != BigDecimal.zero()
      ? wrappedPrismaPrice.price.div(prismaPrice.price)
      : BigDecimal.fromString('1')
  stake.index = contract.depositCount
  contract.depositCount += 1
  const user = getUser(userAddress)
  const balance = getStakingBalance(user, contract)
  balance.stakeSize = balance.stakeSize.plus(amount)
  balance.save()
  stake.userStakeSize = balance.stakeSize
  stake.stakingContract = contract.id
  stake.user = user.id
  stake.amount = amount
  stake.amountUsd = amount.times(wrappedPrismaPrice.price)
  stake.blockTimestamp = event.block.timestamp
  stake.blockNumber = event.block.number
  stake.transactionHash = event.transaction.hash
  stake.save()
  contract.save()
  user.save()
  takeSnapshot(event.block.timestamp)
}

export function handleStakedCvxPrisma(event: Staked): void {
  handleStakedGeneric(event, event.params._amount, event.params._user, CVX_PRISMA_TOKEN_ADDRESS)
}

export function handleStakedYPrisma(event: StakedYPrisma): void {
  handleStakedGeneric(event, event.params.amount, event.params.user, YPRISMA_TOKEN_ADDRESS)
}

export function handleStakedFor(event: StakedFor): void {
  handleStakedGeneric(event, event.params.amount, event.params.user, YPRISMA_TOKEN_ADDRESS)
}

export function handleWithdrawnGeneric(
  event: ethereum.Event,
  withdrawnAmount: BigInt,
  userAddress: Address,
  wrapperToken: Address
): void {
  const contract = getStakingContract(event.address)
  const withdrawal = new Withdrawal(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
  const amount = withdrawnAmount.toBigDecimal().div(BIG_DECIMAL_1E18)
  contract.tokenBalance = contract.tokenBalance.minus(amount)
  const hourlyTimestamp = getIntervalFromTimestamp(event.block.timestamp, HOUR)
  const wrappedPrismaPrice = getTokenPrice(wrapperToken, hourlyTimestamp)
  contract.tvl = contract.tokenBalance.times(wrappedPrismaPrice.price)
  const prismaPrice = getTokenPrice(PRISMA_TOKEN_ADDRESS, hourlyTimestamp)
  contract.peg =
    prismaPrice.price != BigDecimal.zero()
      ? wrappedPrismaPrice.price.div(prismaPrice.price)
      : BigDecimal.fromString('1')

  withdrawal.index = contract.withdrawCount
  contract.withdrawCount += 1
  const user = getUser(userAddress)
  const balance = getStakingBalance(user, contract)
  balance.stakeSize = balance.stakeSize.minus(amount)
  balance.save()
  withdrawal.userStakeSize = balance.stakeSize
  withdrawal.stakingContract = contract.id
  withdrawal.user = user.id
  withdrawal.amount = amount
  withdrawal.amountUsd = amount.times(wrappedPrismaPrice.price)
  withdrawal.blockTimestamp = event.block.timestamp
  withdrawal.blockNumber = event.block.number
  withdrawal.transactionHash = event.transaction.hash
  withdrawal.save()
  contract.save()
  user.save()
  takeSnapshot(event.block.timestamp)
}

export function handleWithdrawnCvxPrisma(event: Withdrawn): void {
  handleWithdrawnGeneric(event, event.params._amount, event.params._user, CVX_PRISMA_TOKEN_ADDRESS)
}

export function handleWithdrawnYPrisma(event: WithdrawnYPrisma): void {
  handleWithdrawnGeneric(event, event.params.amount, event.params.user, YPRISMA_TOKEN_ADDRESS)
}

export function handleRewardAddedGeneric(event: ethereum.Event, rewardToken: Address): void {
  const contract = getStakingContract(event.address)
  const rewardTokens = contract.rewardTokens
  const token = getOrCreateToken(rewardToken)
  if (rewardTokens.indexOf(token.id) < 0) {
    rewardTokens.push(token.id)
    contract.rewardTokens = rewardTokens
    contract.save()
  }
  takeSnapshot(event.block.timestamp)
}

export function handleRewardAddedCvxPrisma(event: RewardAdded1): void {
  handleRewardAddedGeneric(event, event.params._reward)
}

export function handleRewardAddedYPrisma(event: RewardAddedYPrisma): void {
  handleRewardAddedGeneric(event, WSTETH_TOKEN_ADDRESS)
}
