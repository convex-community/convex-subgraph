import { BigDecimal, BigInt } from '@graphprotocol/graph-ts'
import {
  BIG_DECIMAL_1E18, BIG_DECIMAL_ZERO,
  CRV_ADDRESS,
  CVX_ADDRESS,
  CVX_REWARDS_ADDRESS,
  CVXCRV_REWARDS_ADDRESS,
  LOCK_FEES_ADDRESS,
  SECONDS_PER_YEAR,
  THREEPOOL_ADDRESS
} from '../../../../packages/constants'
import { getUsdRate } from '../../../../packages/utils/pricing'
import { getCvxMintAmount } from '../../../../packages/utils/convex'
import { VirtualBalanceRewardPool } from '../../generated/CvxCrvStakingRewards/VirtualBalanceRewardPool'
import { BaseRewardPool } from '../../generated/CvxCrvStakingRewards/BaseRewardPool'
import { CurvePool } from '../../generated/CvxCrvStakingRewards/CurvePool'

export function getRewardRate(rewardContract: BaseRewardPool, timestamp: BigInt): BigDecimal {
  let periodFinish = rewardContract.periodFinish()
  if (periodFinish >= timestamp) {
    return BIG_DECIMAL_ZERO
  }
  return rewardContract.rewardRate().toBigDecimal().div(BIG_DECIMAL_1E18)
}

export function getCvxApr(timestamp: BigInt): BigDecimal {
  const rewardContract = BaseRewardPool.bind(CVX_REWARDS_ADDRESS)
  //TODO: move getRewardRate to utils
  let rate = getRewardRate(rewardContract, timestamp)
  let supply = rewardContract.totalSupply().toBigDecimal().div(BIG_DECIMAL_1E18)
  const crvPrice = getUsdRate(CRV_ADDRESS)
  const cvxPrice = getUsdRate(CVX_ADDRESS)
  supply = supply.times(cvxPrice)
  rate = rate.div(supply)
  const crvPerYear = rate.times(SECONDS_PER_YEAR)
  const crvApr = crvPerYear.times(crvPrice)
  return crvApr
}

export function getCvxCrvApr(timestamp: BigInt): Array<BigDecimal> {
  const rewardContract = BaseRewardPool.bind(CVXCRV_REWARDS_ADDRESS)
  const threePoolStakeContract = VirtualBalanceRewardPool.bind(LOCK_FEES_ADDRESS)
  const threePoolSwapContract = CurvePool.bind(THREEPOOL_ADDRESS)

  let rate = getRewardRate(rewardContract, timestamp)
  let threePoolRate = threePoolStakeContract.rewardRate().toBigDecimal().div(BIG_DECIMAL_1E18)
  let supply = rewardContract.totalSupply().toBigDecimal().div(BIG_DECIMAL_1E18)

  const virtualPrice = threePoolSwapContract.get_virtual_price().toBigDecimal().div(BIG_DECIMAL_1E18)
  const cvxPrice = getUsdRate(CVX_ADDRESS)
  const crvPrice = getUsdRate(CRV_ADDRESS)
  supply = supply.times(crvPrice)
  rate = rate.div(supply)
  threePoolRate = threePoolRate.div(supply)

  const crvPerYear = rate.times(SECONDS_PER_YEAR)
  const cvxPerYear = getCvxMintAmount(crvPerYear)
  const threePoolPerYear = threePoolRate.times(SECONDS_PER_YEAR)

  const crvApr = crvPerYear.times(crvPrice)
  const cvxApr = cvxPerYear.times(cvxPrice)
  const threeCrvApr = threePoolPerYear.times(virtualPrice)

  return [crvApr, cvxApr, threeCrvApr]
}

export function getSlpCvxEthApr(timestamp: BigInt): Array<BigDecimal> {

}
