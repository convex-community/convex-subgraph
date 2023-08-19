import {
  IncreasedIncentive as IncreasedIncentiveEvent,
  NewIncentive as NewIncentiveEvent,
  UpdatedFee as UpdatedFeeEvent,
  WithdrawUnprocessed as WithdrawUnprocessedEvent,
} from '../generated/VotiumV2/VotiumV2'
import {
  Incentive,
  IncreasedIncentive,
  NewIncentive,
  Round,
  UpdatedFee,
  WithdrawUnprocessed,
} from '../generated/schema'
import { BigInt } from '@graphprotocol/graph-ts'

export function getRound(roundNumber: BigInt, timestamp: BigInt): Round {
  let round = Round.load(roundNumber.toString())
  if (!round) {
    round = new Round(roundNumber.toString())
    round.bribeCount = BigInt.zero()
    round.initiatedAt = timestamp
    round.save()
  }
  return round
}

export function getIncentive(gauge: string, round: string, index: string, timestamp: BigInt): Incentive {
  let incentive = Incentive.load(gauge + '-' + round + '-' + index)
  if (!incentive) {
    incentive = new Incentive(gauge + '-' + round + '-' + index)
    incentive.createdAt = timestamp
  }
  return incentive
}

export function handleIncreasedIncentive(event: IncreasedIncentiveEvent): void {
  const increase = new IncreasedIncentive(event.transaction.hash.toHexString() + event.logIndex.toString())
  const incentive = getIncentive(
    event.params._gauge.toHexString(),
    event.params._round.toString(),
    event.params._index.toString(),
    event.block.timestamp
  )

  increase.token = event.params._token
  increase.total = event.params._total
  increase.increase = event.params._increase
  increase.round = event.params._round
  increase.gauge = event.params._gauge
  increase.maxPerVote = event.params._maxPerVote
  increase.incentive = incentive.id

  increase.blockNumber = event.block.number
  increase.blockTimestamp = event.block.timestamp
  increase.transactionHash = event.transaction.hash

  incentive.amount = incentive.amount.plus(increase.increase)
  incentive.updatedAt = event.block.timestamp

  incentive.save()
  increase.save()
}

export function handleNewIncentive(event: NewIncentiveEvent): void {
  const newIncentive = new NewIncentive(event.transaction.hash.toHexString() + event.logIndex.toString())
  const incentive = getIncentive(
    event.params._gauge.toHexString(),
    event.params._round.toString(),
    event.params._index.toString(),
    event.block.timestamp
  )
  const round = getRound(event.params._round, event.block.timestamp)
  round.bribeCount = round.bribeCount.plus(BigInt.fromI32(1))
  round.save()

  newIncentive.index = event.params._index
  newIncentive.token = event.params._token
  newIncentive.amount = event.params._amount
  newIncentive.round = event.params._round
  newIncentive.gauge = event.params._gauge
  newIncentive.maxPerVote = event.params._maxPerVote
  newIncentive.recycled = event.params._recycled
  newIncentive.incentive = incentive.id

  newIncentive.blockNumber = event.block.number
  newIncentive.blockTimestamp = event.block.timestamp
  newIncentive.transactionHash = event.transaction.hash

  incentive.token = event.params._token
  incentive.amount = event.params._amount
  incentive.index = event.params._index
  incentive.round = round.id
  incentive.gauge = event.params._gauge
  incentive.maxPerVote = event.params._maxPerVote
  incentive.save()
  newIncentive.save()
}

export function handleUpdatedFee(event: UpdatedFeeEvent): void {
  const feeUpdate = new UpdatedFee(event.transaction.hash.toHexString() + '-' + event.logIndex.toString())

  feeUpdate.amount = event.params._feeAmount

  feeUpdate.blockNumber = event.block.number
  feeUpdate.blockTimestamp = event.block.timestamp
  feeUpdate.transactionHash = event.transaction.hash

  feeUpdate.save()
}

export function handleWithdrawUnprocessed(event: WithdrawUnprocessedEvent): void {
  const withdrawal = new WithdrawUnprocessed(event.transaction.hash.toHexString() + event.logIndex.toString())
  withdrawal.round = event.params._round
  withdrawal.gauge = event.params._gauge
  withdrawal.index = event.params._incentive
  withdrawal.amount = event.params._amount

  withdrawal.blockNumber = event.block.number
  withdrawal.blockTimestamp = event.block.timestamp
  withdrawal.transactionHash = event.transaction.hash

  const incentive = getIncentive(
    event.params._gauge.toHexString(),
    event.params._round.toString(),
    event.params._incentive.toString(),
    event.block.timestamp
  )
  incentive.amount = incentive.amount.minus(withdrawal.amount)
  incentive.updatedAt = event.block.timestamp
  withdrawal.incentive = incentive.id
  incentive.save()
  withdrawal.save()
}
