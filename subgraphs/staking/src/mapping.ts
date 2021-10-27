import { Address, BigInt } from '@graphprotocol/graph-ts'
import {
  RewardAdded,
  RewardPaid,
  Staked,
  Withdrawn
} from "../generated/CvxCrvStakingRewards/BaseRewardPool"
import { getStakingContract } from './services/contracts'
import {
  DailySnapshot,
  Deposit,
  ExtraRewardApr,
  Withdrawal
} from '../generated/schema'
import { DAY, getIntervalFromTimestamp } from '../../../packages/utils/time'
import { DailyPoolSnapshot } from '../../curve-pools/generated/schema'
import { getContractApr } from './services/apr'
import { getUsdRate } from '../../../packages/utils/pricing'
import {
  CRV_ADDRESS,
  STAKING_TOKENS,
  THREE_CRV_TOKEN
} from '../../../packages/constants'
import { createSnapShot } from './services/snapshot'

export function handleRewardAdded(event: RewardAdded): void {

}

export function handleRewardPaid(event: RewardPaid): void {

}

export function handleStaked(event: Staked): void {

  const contract = getStakingContract(event.address)
  const deposit = new Deposit(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
  deposit.user = event.params.user.toHexString()
  deposit.amount = event.params.amount
  deposit.timestamp = event.block.timestamp
  deposit.contract = contract.id
  deposit.save()

  const snapshot = createSnapShot(contract, event.block.timestamp)
  const crvPrice = getUsdRate(CRV_ADDRESS)
  contract.tokenBalance = contract.tokenBalance.plus(event.params.amount)
  snapshot.tokenBalance = contract.tokenBalance
  snapshot.tvl = contract.tokenBalance.toBigDecimal().times(crvPrice)
  snapshot.save()
  contract.save()
}

export function handleWithdrawn(event: Withdrawn): void {

  const contract = getStakingContract(event.address)
  const withdrawal = new Withdrawal(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
  withdrawal.user = event.params.user.toHexString()
  withdrawal.amount = event.params.amount
  withdrawal.timestamp = event.block.timestamp
  withdrawal.contract = contract.id
  withdrawal.save()

  const snapshot = createSnapShot(contract, event.block.timestamp)
  const stakingTokenPrice = getUsdRate(Address.fromString(STAKING_TOKENS.get(event.address.toHexString())))
  contract.tokenBalance = contract.tokenBalance.minus(event.params.amount)
  snapshot.tokenBalance = contract.tokenBalance
  snapshot.tvl = contract.tokenBalance.toBigDecimal().times(stakingTokenPrice)
  snapshot.save()
  contract.save()
}
