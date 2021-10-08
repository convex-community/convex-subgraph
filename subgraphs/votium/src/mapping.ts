import { BigInt } from '@graphprotocol/graph-ts'
import { Bribed, UpdatedFee, InitiateProposalCall } from '../generated/VotiumBribe/VotiumBribe'
import { Bribe, Epoch, Fee } from '../generated/schema'
import { BIG_INT_ONE, VOTIUM_BRIBE_CONTRACT } from 'const'

export function getPlatformFee(): Fee {
  let fee = Fee.load(VOTIUM_BRIBE_CONTRACT)
  if (!fee) {
    fee = new Fee(VOTIUM_BRIBE_CONTRACT)
    fee.amount = BigInt.fromI32(400)
    fee.save()
  }
  return fee
}

export function handleUpdatedFee(event: UpdatedFee): void {
  const fee = getPlatformFee()
  fee.amount = event.params._feeAmount
  fee.save()
}

export function handleBribed(event: Bribed): void {
  const bribe = new Bribe(event.transaction.hash.toHexString() + '-' + event.params._token.toHexString())
  const fee = getPlatformFee().amount

  bribe.epoch = event.params._proposal.toHexString()
  bribe.amount = event.params._amount.times(fee).div(BigInt.fromI32(10000))
  bribe.token = event.params._token
  bribe.save()

  const epoch = Epoch.load(bribe.epoch)
  if (epoch) {
    epoch.bribeCount = epoch.bribeCount.plus(BIG_INT_ONE)
    epoch.save()
  }
}

export function handleInitiated(call: InitiateProposalCall): void {
  const epoch = new Epoch(call.inputs._proposal.toHexString())
  epoch.deadline = call.inputs._deadline
  epoch.initiatedAt = call.block.timestamp
  epoch.save()
}
