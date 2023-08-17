import {
  IncreasedIncentive as IncreasedIncentiveEvent,
  NewIncentive as NewIncentiveEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  TokenAllow as TokenAllowEvent,
  UpdatedDistributor as UpdatedDistributorEvent,
  UpdatedFee as UpdatedFeeEvent,
  WithdrawUnprocessed as WithdrawUnprocessedEvent,
} from '../generated/VotiumV2/VotiumV2'
import {
  CurrentFee,
  Incentive,
  IncreasedIncentive,
  NewIncentive,
  Round,
  UpdatedFee,
  WithdrawUnprocessed,
} from '../generated/schema'
import { BigInt } from '@graphprotocol/graph-ts'

export function getRound(roundNumber: BigInt, timestamp: BigInt): Round {
  let round = Round.load(roundNumber.toI32())
  if (!round) {
    round = new Round(roundNumber.toI32())
    round.bribeCount = BigInt.zero()
    round.initiatedAt = timestamp
    round.save()
  }
  return round
}

export function getIncentive(token: string, round: string, gauge: string): Incentive {
  let incentive = Incentive.load(token + '-' + round + '-' + gauge)
  if (!incentive) {
    incentive = new Incentive(token + '-' + round + '-' + gauge)
  }
  return incentive
}

export function handleIncreasedIncentive(event: IncreasedIncentiveEvent): void {
  const entity = new IncreasedIncentive(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity._token = event.params._token
  entity._total = event.params._total
  entity._increase = event.params._increase
  entity._round = event.params._round
  entity._gauge = event.params._gauge
  entity._maxPerVote = event.params._maxPerVote

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleNewIncentive(event: NewIncentiveEvent): void {
  const newIncentive = new NewIncentive(event.transaction.hash.toHexString + event.logIndex.toString())
  const incentive = getIncentive(
    event.params._token.toHexString(),
    event.params._round.toString(),
    event.params._gauge.toHexString()
  )
  const round = getRound(event.params._round, event.block.timestamp)
  round.bribeCount = round.bribeCount.plus(BigInt.fromI32(1))
  round.save()

  newIncentive.token = event.params._token
  newIncentive.amount = event.params._amount
  newIncentive.round = event.params._round
  newIncentive.gauge = event.params._gauge
  newIncentive.maxPerVote = event.params._maxPerVote
  newIncentive.recycled = event.params._recycled

  newIncentive.blockNumber = event.block.number
  newIncentive.blockTimestamp = event.block.timestamp
  newIncentive.transactionHash = event.transaction.hash

  newIncentive.save()

  incentive.token = event.params._token
  incentive.amount = event.params._amount
  incentive.round = round.id
  incentive.gauge = event.params._gauge
  incentive.maxPerVote = event.params._maxPerVote
  incentive.save()
}

export function handleUpdatedFee(event: UpdatedFeeEvent): void {
  const feeUpdate = new UpdatedFee(event.transaction.hash.toHexString + '-' + event.logIndex.toString())

  feeUpdate.amount = event.params._feeAmount

  feeUpdate.blockNumber = event.block.number
  feeUpdate.blockTimestamp = event.block.timestamp
  feeUpdate.transactionHash = event.transaction.hash

  feeUpdate.save()
}

export function handleWithdrawUnprocessed(event: WithdrawUnprocessedEvent): void {
  const withdrawal = new WithdrawUnprocessed(event.transaction.hash.toHexString + event.logIndex.toString())
  withdrawal.round = event.params._round
  withdrawal.gauge = event.params._gauge
  withdrawal.incentive = event.params._incentive
  withdrawal.amount = event.params._amount

  withdrawal.blockNumber = event.block.number
  withdrawal.blockTimestamp = event.block.timestamp
  withdrawal.transactionHash = event.transaction.hash

  withdrawal.save()
  const incentive = getIncentive(
    event.params._token.toHexString(),
    event.params._round.toString(),
    event.params._gauge.toHexString()
  )
}
