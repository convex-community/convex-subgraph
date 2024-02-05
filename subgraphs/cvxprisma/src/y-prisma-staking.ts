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
  CVX_PRISMA_TOKEN_ADDRESS, MKUSD_TOKEN_ADDRESS,
  PRISMA_TOKEN_ADDRESS,
  WSTETH_TOKEN_ADDRESS, YPRISMA_STAKING_ADDRESS,
  YPRISMA_TOKEN_ADDRESS
} from 'const'
import { toDecimal } from 'utils/maths'
import { getOrCreateToken, getTokenPrice } from './services/tokens'
import { takeSnapshot } from './services/snapshots'
import { getIntervalFromTimestamp, HOUR } from 'utils/time'
import { ethereum } from '@graphprotocol/graph-ts/index'
import { Address, BigDecimal, BigInt } from '@graphprotocol/graph-ts'
import {
  handleRewardAddedGeneric,
  handleRewardGeneric,
  handleStakedGeneric,
  handleWithdrawnGeneric
} from './cvx-prisma-staking'


export function handleRewardPaidYPrisma(event: RewardPaidYPrisma): void {
  handleRewardGeneric(event, event.params.reward, getUser(event.params.user), YPRISMA_TOKEN_ADDRESS)
}

export function handleStakedYPrisma(event: StakedYPrisma): void {
  handleStakedGeneric(event, event.params.amount, event.params.user, event.params.user, YPRISMA_TOKEN_ADDRESS)
}

export function handleStakedFor(event: StakedFor): void {
  handleStakedGeneric(event, event.params.amount, event.transaction.from, event.params.user, YPRISMA_TOKEN_ADDRESS)
}

export function handleWithdrawnYPrisma(event: WithdrawnYPrisma): void {
  handleWithdrawnGeneric(event, event.params.amount, event.params.user, YPRISMA_TOKEN_ADDRESS)
}

export function handleRewardAddedYPrisma(event: RewardAddedYPrisma): void {
  if (event.address == YPRISMA_STAKING_ADDRESS)
  {
    handleRewardAddedGeneric(event, WSTETH_TOKEN_ADDRESS)
  }
  else {
    handleRewardAddedGeneric(event, MKUSD_TOKEN_ADDRESS)
  }
}
