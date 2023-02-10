import { Address, BigDecimal, BigInt, log } from '@graphprotocol/graph-ts'
import { BaseRewardPool } from '../../generated/Booster/BaseRewardPool'
import {
  BIG_INT_ZERO,
  BOOSTER_ADDRESS,
  CVXCRV_REWARDS_ADDRESS,
  LOCK_FEES_ADDRESS,
  DENOMINATOR,
  CONVEX_PLATFORM_ID,
  CRV_ADDRESS,
  BIG_DECIMAL_ZERO,
  BIG_DECIMAL_1E18,
  BIG_DECIMAL_ONE,
  CVX_ADDRESS,
} from 'const'
import { Booster } from '../../generated/Booster/Booster'
import { getCvxMintAmount } from 'utils/convex'
import { DAY, getIntervalFromTimestamp } from 'utils/time'
import { FeeRevenue, DailyRevenueSnapshot } from '../../generated/schema'
import { getUsdRate } from 'utils/pricing'
import { getPlatform } from './platform'

export function getDailyRevenueSnapshot(day: BigInt): DailyRevenueSnapshot {
  let revenueSnapshot = DailyRevenueSnapshot.load(day.toString())

  if (!revenueSnapshot) {
    revenueSnapshot = new DailyRevenueSnapshot(day.toString())
    revenueSnapshot.save()
  }
  return revenueSnapshot
}

export function getHistoricalRewards(contract: Address): BigInt {
  const rewardContract = BaseRewardPool.bind(contract)
  const histRewardResults = rewardContract.try_historicalRewards()
  const histRewards = histRewardResults.reverted ? BIG_INT_ZERO : histRewardResults.value
  if (histRewardResults.reverted) {
    log.warning('Failed to get historical rewards for {}', [contract.toHexString()])
  }
  return histRewards
}

export function updateDailyRevenueSnapshotForCrv(amount: BigInt, timestamp: BigInt): void {
  const day = getIntervalFromTimestamp(timestamp, DAY)
  const dayRevenue = getDailyRevenueSnapshot(day)
  const contract = Booster.bind(BOOSTER_ADDRESS)
  const decimalDenominator = DENOMINATOR.toBigDecimal()
  const currentCrvPrice = getUsdRate(CRV_ADDRESS)
  const currentCvxPrice = getUsdRate(CVX_ADDRESS)
  const platform = getPlatform()

  const lockIncentive = contract.lockIncentive().toBigDecimal().div(decimalDenominator)
  const callIncentive = contract.earmarkIncentive().toBigDecimal().div(decimalDenominator)
  const stakerIncentive = contract.stakerIncentive().toBigDecimal().div(decimalDenominator)
  const platformFee = contract.platformFee().toBigDecimal().div(decimalDenominator)
  const totalFees = lockIncentive.plus(callIncentive).plus(stakerIncentive).plus(platformFee)
  const lpShare = BIG_DECIMAL_ONE.minus(totalFees)

  // total rev obtained from the pool is rev distributed to the pool / (1 - total fees applied)
  const dailyCrvTotalRevenue = amount.toBigDecimal().div(lpShare).div(BIG_DECIMAL_1E18).times(currentCrvPrice)
  // amount of CVX that could be minted from the CRV amount
  const dailyCvxMinted = getCvxMintAmount(amount.toBigDecimal().div(lpShare).div(BIG_DECIMAL_1E18)).times(
    currentCvxPrice
  )

  const crvRevenueToCvxStakersAmount = dailyCrvTotalRevenue.times(stakerIncentive)
  const crvRevenueToCvxCrvStakersAmount = dailyCrvTotalRevenue.times(lockIncentive)
  const cvxRevenueToCvxCrvStakersAmount = dailyCvxMinted.times(lockIncentive)
  const crvRevenueToCallersAmount = dailyCrvTotalRevenue.times(callIncentive)
  const crvRevenueToPlatformAmount = dailyCrvTotalRevenue.times(platformFee)
  const crvRevenueToLpProvidersAmount = amount.toBigDecimal().div(BIG_DECIMAL_1E18).times(currentCrvPrice)
  const cvxRevenueToLpProvidersAmount = dailyCvxMinted.times(lpShare)

  dayRevenue.totalCrvRevenue = dayRevenue.totalCrvRevenue.plus(dailyCrvTotalRevenue)

  dayRevenue.crvRevenueToCvxStakersAmount = dayRevenue.crvRevenueToCvxStakersAmount.plus(crvRevenueToCvxStakersAmount)
  dayRevenue.crvRevenueToCvxCrvStakersAmount = dayRevenue.crvRevenueToCvxCrvStakersAmount.plus(
    crvRevenueToCvxCrvStakersAmount
  )
  dayRevenue.cvxRevenueToCvxCrvStakersAmount = dayRevenue.cvxRevenueToCvxCrvStakersAmount.plus(
    cvxRevenueToCvxCrvStakersAmount
  )
  dayRevenue.crvRevenueToCallersAmount = dayRevenue.crvRevenueToCallersAmount.plus(crvRevenueToCallersAmount)
  dayRevenue.crvRevenueToPlatformAmount = dayRevenue.crvRevenueToPlatformAmount.plus(crvRevenueToPlatformAmount)
  dayRevenue.crvRevenueToLpProvidersAmount =
    dayRevenue.crvRevenueToLpProvidersAmount.plus(crvRevenueToLpProvidersAmount)
  dayRevenue.cvxRevenueToLpProvidersAmount =
    dayRevenue.cvxRevenueToLpProvidersAmount.plus(cvxRevenueToLpProvidersAmount)

  platform.totalCrvRevenue = platform.totalCrvRevenue.plus(dailyCrvTotalRevenue)
  platform.totalCrvRevenueToCvxCrvStakers = platform.totalCrvRevenueToCvxCrvStakers.plus(
    crvRevenueToCvxCrvStakersAmount
  )
  platform.totalCvxRevenueToCvxCrvStakers = platform.totalCvxRevenueToCvxCrvStakers.plus(
    cvxRevenueToCvxCrvStakersAmount
  )
  platform.totalCrvRevenueToCvxStakers = platform.totalCrvRevenueToCvxStakers.plus(crvRevenueToCvxStakersAmount)
  platform.totalCrvRevenueToCallers = platform.totalCrvRevenueToCallers.plus(crvRevenueToCallersAmount)
  platform.totalCrvRevenueToPlatform = platform.totalCrvRevenueToPlatform.plus(crvRevenueToPlatformAmount)
  platform.totalCrvRevenueToLpProviders = platform.totalCrvRevenueToLpProviders.plus(crvRevenueToLpProvidersAmount)
  platform.totalCvxRevenueToLpProviders = platform.totalCvxRevenueToLpProviders.plus(cvxRevenueToLpProvidersAmount)
  platform.save()

  dayRevenue.timestamp = timestamp
  dayRevenue.crvPrice = currentCrvPrice
  dayRevenue.cvxPrice = currentCvxPrice
  dayRevenue.save()
}

export function recordFeeRevenue(timestamp: BigInt): void {
  const revenue = new FeeRevenue(timestamp.toString())
  revenue.platform = CONVEX_PLATFORM_ID
  revenue.amount = getHistoricalRewards(LOCK_FEES_ADDRESS)
  revenue.timestamp = timestamp
  revenue.save()
}
