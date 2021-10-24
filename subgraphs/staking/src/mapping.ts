import { BigInt } from "@graphprotocol/graph-ts"
import {
  RewardAdded,
  RewardPaid,
  Staked,
  Withdrawn
} from "../generated/CvxCrvStakingRewards/BaseRewardPool"
import { getStakingContract } from './services/contracts'
import { DailySnapshot, Deposit, Withdrawal } from '../generated/schema'
import { DAY, getIntervalFromTimestamp } from '../../../packages/utils/time'
import { DailyPoolSnapshot } from '../../curve-pools/generated/schema'
import { getContractApr } from './services/apr'

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

  contract.tokenBalance = contract.tokenBalance.plus(event.params.amount)
  // TODO: add TVL Calc
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

  const day = getIntervalFromTimestamp(event.block.timestamp, DAY)
  const snapId = contract.name + '-' + '-' + day.toString()
  let snapshot = DailySnapshot.load(snapId)
  if (!snapshot) {
    snapshot = new DailySnapshot(snapId)
    snapshot.contract = contract.id.toString()
    const aprs = getContractApr(contract.id)
  }
  contract.tokenBalance = contract.tokenBalance.minus(event.params.amount)
  // TODO: add TVL Calc
  contract.save()
}
