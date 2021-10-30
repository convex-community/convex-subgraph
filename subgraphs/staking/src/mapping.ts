import { Address, log } from '@graphprotocol/graph-ts'
import { RewardAdded, RewardPaid, Staked, Withdrawn } from '../generated/CvxCrvStakingRewards/BaseRewardPool'
import { getStakingContract } from './services/contracts'
import { Deposit, Withdrawal } from '../generated/schema'

import { getUsdRate } from '../../../packages/utils/pricing'
import { STAKING_TOKENS } from '../../../packages/constants'
import { createSnapShot } from './services/snapshot'

export function handleRewardAdded(event: RewardAdded): void {}

export function handleRewardPaid(event: RewardPaid): void {}

export function handleStaked(event: Staked): void {
  const contract = getStakingContract(event.address)
  const deposit = new Deposit(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
  deposit.user = event.params.user.toHexString()
  deposit.amount = event.params.amount
  deposit.timestamp = event.block.timestamp
  deposit.contract = contract.id
  deposit.save()

  const snapshot = createSnapShot(contract, event.block.timestamp)
  const stakingTokenPrice = getUsdRate(Address.fromString(STAKING_TOKENS.get(event.address.toHexString())))
  contract.tokenBalance = contract.tokenBalance.plus(event.params.amount)
  snapshot.tokenBalance = contract.tokenBalance
  snapshot.tvl = contract.tokenBalance.toBigDecimal().times(stakingTokenPrice)
  snapshot.timestamp = event.block.timestamp
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
  snapshot.timestamp = event.block.timestamp
  snapshot.save()
  contract.save()
}
