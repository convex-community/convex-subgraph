import { Address, BigDecimal } from '@graphprotocol/graph-ts'
import { StakingContract, User } from '../../generated/schema'
import { CVX_PRISMA_STAKING_ADDRESS } from 'const'

export function getStakingContract(): StakingContract {
  let contract = StakingContract.load(CVX_PRISMA_STAKING_ADDRESS.toHexString())
  if (!contract) {
    contract = new StakingContract(CVX_PRISMA_STAKING_ADDRESS.toHexString())
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
    user.stakeSize = BigDecimal.zero()
    user.save()
  }
  return user
}
