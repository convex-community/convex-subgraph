import { Address } from '@graphprotocol/graph-ts'
import { StakingContract } from '../../generated/schema'
import { STAKING_CONTRACTS } from '../../../../packages/constants'

export function getStakingContract(address: Address): StakingContract {
  let contract = StakingContract.load(address.toHexString())
  if (!contract) {
    contract = new StakingContract(address.toHexString())
    contract.name = STAKING_CONTRACTS.get(address.toHexString().toLowerCase())
  }
  return contract
}
