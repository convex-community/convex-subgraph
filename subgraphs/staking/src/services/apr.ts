import { BigDecimal } from '@graphprotocol/graph-ts'
import {
  BIG_DECIMAL_1E18,
  BIG_DECIMAL_ZERO,
  CVXCRV_REWARDS_ADDRESS,
  LOCK_FEES_ADDRESS, THREEPOOL_ADDRESS
} from '../../../../packages/constants'
import { BaseRewardPool } from '../../../curve-pools/generated/Booster/BaseRewardPool'
import { VirtualBalanceRewardPool } from '../../../curve-pools/generated/Booster/VirtualBalanceRewardPool'
import { CurvePool } from '../../../curve-pools/generated/Booster/CurvePool'

export function getContractApr(contractId: string): Array<BigDecimal> {
  if (contractId == CVXCRV_REWARDS_ADDRESS.toHexString()) {
    return getCvxCrvApr()
  }
}

function getCvxCrvApr(): Array<BigDecimal> {
  const rewardContract = BaseRewardPool.bind(CVXCRV_REWARDS_ADDRESS)
  const threePoolStakeContract = VirtualBalanceRewardPool.bind(LOCK_FEES_ADDRESS)
  const threePoolSwapContract = CurvePool.bind(THREEPOOL_ADDRESS)

  const rate = rewardContract.rewardRate().toBigDecimal().div(BIG_DECIMAL_1E18)
  const threePoolRate = threePoolStakeContract.rewardRate().toBigDecimal().div(BIG_DECIMAL_1E18)
  const supply = rewardContract.totalSupply().toBigDecimal().div(BIG_DECIMAL_1E18)


}
