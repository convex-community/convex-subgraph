import { BigDecimal } from '@graphprotocol/graph-ts'
import {
  BIG_DECIMAL_1E18,
  BIG_DECIMAL_ZERO, CRV_ADDRESS, CVX_ADDRESS,
  CVXCRV_REWARDS_ADDRESS,
  LOCK_FEES_ADDRESS, THREEPOOL_ADDRESS
} from '../../../../packages/constants'
import { getUsdRate } from '../../../../packages/utils/pricing'
import { getCvxMintAmount } from '../../../../packages/utils/convex'
import { VirtualBalanceRewardPool } from '../../generated/CvxCrvStakingRewards/VirtualBalanceRewardPool'
import { BaseRewardPool } from '../../generated/CvxCrvStakingRewards/BaseRewardPool'
import { CurvePool } from '../../generated/CvxCrvStakingRewards/CurvePool'

export function getContractApr(contractId: string): Array<BigDecimal> {
  if (contractId == CVXCRV_REWARDS_ADDRESS.toHexString()) {
    return getCvxCrvApr()
  }
  return [BIG_DECIMAL_ZERO,BIG_DECIMAL_ZERO,BIG_DECIMAL_ZERO]
}

function getCvxCrvApr(): Array<BigDecimal> {
  const rewardContract = BaseRewardPool.bind(CVXCRV_REWARDS_ADDRESS)
  const threePoolStakeContract = VirtualBalanceRewardPool.bind(LOCK_FEES_ADDRESS)
  const threePoolSwapContract = CurvePool.bind(THREEPOOL_ADDRESS)

  let rate = rewardContract.rewardRate().toBigDecimal().div(BIG_DECIMAL_1E18)
  let threePoolRate = threePoolStakeContract.rewardRate().toBigDecimal().div(BIG_DECIMAL_1E18)
  let supply = rewardContract.totalSupply().toBigDecimal().div(BIG_DECIMAL_1E18)

  const virtualPrice = threePoolSwapContract.get_virtual_price().toBigDecimal().div(BIG_DECIMAL_1E18)
  const cvxPrice = getUsdRate(CVX_ADDRESS)
  const crvPrice = getUsdRate(CRV_ADDRESS)
  supply = supply.times(crvPrice)
  rate = rate.div(supply)
  threePoolRate = threePoolRate.div(supply)

  const crvPerYear = rate.times(BigDecimal.fromString("31536000"))
  const cvxPerYear = getCvxMintAmount(crvPerYear)
  const threePoolPerYear = threePoolRate.times(BigDecimal.fromString("31536000"))

  const crvApr = crvPerYear.times(crvPrice)
  const cvxApr = cvxPerYear.times(cvxPrice)
  const threeCrvApr = threePoolPerYear.times(virtualPrice)

  return [crvApr, cvxApr, threeCrvApr]
}
