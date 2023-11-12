import { Address, BigDecimal } from '@graphprotocol/graph-ts'
import { StakingBalance, StakingContract, User } from '../../generated/schema'
import { CVX_PRISMA_STAKING_ADDRESS } from 'const'

export function getStakingContract(contractAddress: Address): StakingContract {
  let contract = StakingContract.load(contractAddress.toHexString())
  if (!contract) {
    contract = new StakingContract(contractAddress.toHexString())
    contract.tokenBalance = BigDecimal.zero()
    contract.rewardTokens = []
    contract.depositCount = 0
    contract.withdrawCount = 0
    contract.payoutCount = 0
    contract.snapshotCount = 0
    contract.save()
  }
  return contract
}

export function getUser(address: Address): User {
  let user = User.load(address.toHexString())
  if (!user) {
    user = new User(address.toHexString())
    user.rewardRedirect = address.toHexString()
    user.save()
  }
  return user
}

export function getStakingBalance(user: User, contract: StakingContract): StakingBalance {
  let balance = StakingBalance.load(user.id + contract.id)
  if (!balance) {
    balance = new StakingBalance(user.id + contract.id)
    balance.user = user.id
    balance.stakingContract = contract.id
    balance.stakeSize = BigDecimal.zero()
    balance.save()
  }
  return balance
}
