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
import { FeeRevenue, RevenueDailySnapshot } from '../../generated/schema'
import { getUsdRate } from 'utils/pricing'

export function getRevenueDailySnapshot(day: BigInt): RevenueDailySnapshot {
  let revenueSnapshot = RevenueDailySnapshot.load(day.toString())
  const previousDay = getIntervalFromTimestamp(day.minus(DAY), DAY)
  const previousDayRevenue = RevenueDailySnapshot.load(previousDay.toString())

  if (!revenueSnapshot) {
    revenueSnapshot = new RevenueDailySnapshot(day.toString())
    revenueSnapshot.crvRevenueToLpProvidersAmount = BigDecimal.zero()
    revenueSnapshot.cvxRevenueToLpProvidersAmount = BigDecimal.zero()
    revenueSnapshot.crvRevenueToCvxCrvStakersAmount = BigDecimal.zero()
    revenueSnapshot.cvxRevenueToCvxCrvStakersAmount = BigDecimal.zero()
    revenueSnapshot.crvRevenueToCvxStakersAmount = BigDecimal.zero()
    revenueSnapshot.crvRevenueToCallersAmount = BigDecimal.zero()
    revenueSnapshot.crvRevenueToPlatformAmount = BigDecimal.zero()
    revenueSnapshot.totalCrvRevenue = BigDecimal.zero()
    if (previousDayRevenue) {
      revenueSnapshot.crvRevenueToLpProvidersAmountCumulative =
        previousDayRevenue.crvRevenueToLpProvidersAmountCumulative
      revenueSnapshot.cvxRevenueToLpProvidersAmountCumulative =
        previousDayRevenue.cvxRevenueToLpProvidersAmountCumulative
      revenueSnapshot.crvRevenueToCvxCrvStakersAmountCumulative =
        previousDayRevenue.crvRevenueToCvxCrvStakersAmountCumulative
      revenueSnapshot.cvxRevenueToCvxCrvStakersAmountCumulative =
        previousDayRevenue.cvxRevenueToCvxCrvStakersAmountCumulative
      revenueSnapshot.crvRevenueToCvxStakersAmountCumulative = previousDayRevenue.crvRevenueToCvxStakersAmountCumulative
      revenueSnapshot.crvRevenueToCallersAmountCumulative = previousDayRevenue.crvRevenueToCallersAmountCumulative
      revenueSnapshot.crvRevenueToPlatformAmountCumulative = previousDayRevenue.crvRevenueToPlatformAmountCumulative
      revenueSnapshot.totalCrvRevenueCumulative = previousDayRevenue.totalCrvRevenueCumulative
      revenueSnapshot.bribeRevenueCumulative = previousDayRevenue.bribeRevenueCumulative
    } else {
      revenueSnapshot.crvRevenueToLpProvidersAmountCumulative = BigDecimal.zero()
      revenueSnapshot.cvxRevenueToLpProvidersAmountCumulative = BigDecimal.zero()
      revenueSnapshot.crvRevenueToCvxCrvStakersAmountCumulative = BigDecimal.zero()
      revenueSnapshot.cvxRevenueToCvxCrvStakersAmountCumulative = BigDecimal.zero()
      revenueSnapshot.crvRevenueToCvxStakersAmountCumulative = BigDecimal.zero()
      revenueSnapshot.crvRevenueToCallersAmountCumulative = BigDecimal.zero()
      revenueSnapshot.crvRevenueToPlatformAmountCumulative = BigDecimal.zero()
      revenueSnapshot.totalCrvRevenueCumulative = BigDecimal.zero()
      revenueSnapshot.bribeRevenueCumulative = BigDecimal.zero()
    }
    revenueSnapshot.crvPrice = BigDecimal.zero()
    revenueSnapshot.bribeRevenue = BigDecimal.zero()
    revenueSnapshot.timestamp = BigInt.zero()
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
  const dayRevenue = getRevenueDailySnapshot(day)
  const contract = Booster.bind(BOOSTER_ADDRESS)
  const decimalDenominator = DENOMINATOR.toBigDecimal()
  const currentCrvPrice = getUsdRate(CRV_ADDRESS)
  const currentCvxPrice = getUsdRate(CVX_ADDRESS)

  const lockIncentive = contract.lockIncentive().toBigDecimal().div(decimalDenominator)
  const callIncentive = contract.earmarkIncentive().toBigDecimal().div(decimalDenominator)
  const stakerIncentive = contract.stakerIncentive().toBigDecimal().div(decimalDenominator)
  const platformFee = contract.platformFee().toBigDecimal().div(decimalDenominator)
  const totalFees = lockIncentive.plus(callIncentive).plus(stakerIncentive).plus(platformFee)
  const lpShare = BIG_DECIMAL_ONE.minus(totalFees)

  // total rev obtained from the pool is rev distributed to the pool / (1 - total fees applied)
  const dailyCrvTotalRevenue = amount.toBigDecimal().div(lpShare).div(BIG_DECIMAL_1E18).times(currentCrvPrice)
  // amount of CVX that could be minted from the CRV amount
  const dailyCvxMinted = getCvxMintAmount(amount.toBigDecimal().div(lpShare))
    .div(BIG_DECIMAL_1E18)
    .times(currentCvxPrice)

  dayRevenue.totalCrvRevenue = dailyCrvTotalRevenue
  const crvRevenueToCvxCrvStakersAmount = dailyCrvTotalRevenue.times(lockIncentive)
  const cvxRevenueToCvxCrvStakersAmount = dailyCvxMinted.times(lockIncentive)
  const crvRevenueToCallersAmount = dailyCrvTotalRevenue.times(callIncentive).div(decimalDenominator)
  const crvRevenueToPlatformAmount = dailyCrvTotalRevenue.times(platformFee).div(decimalDenominator)
  const crvRevenueToLpProvidersAmount = amount.toBigDecimal().div(BIG_DECIMAL_1E18).times(currentCrvPrice)
  const cvxRevenueToLpProvidersAmount = dailyCvxMinted.times(lpShare)

  dayRevenue.totalCrvRevenue = dayRevenue.totalCrvRevenue.plus(dailyCrvTotalRevenue)
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

  dayRevenue.totalCrvRevenueCumulative = dayRevenue.totalCrvRevenueCumulative.plus(dailyCrvTotalRevenue)
  dayRevenue.crvRevenueToCvxCrvStakersAmountCumulative = dayRevenue.crvRevenueToCvxCrvStakersAmountCumulative.plus(
    crvRevenueToCvxCrvStakersAmount
  )
  dayRevenue.cvxRevenueToCvxCrvStakersAmountCumulative = dayRevenue.cvxRevenueToCvxCrvStakersAmountCumulative.plus(
    cvxRevenueToCvxCrvStakersAmount
  )
  dayRevenue.crvRevenueToCallersAmountCumulative =
    dayRevenue.crvRevenueToCallersAmountCumulative.plus(crvRevenueToCallersAmount)
  dayRevenue.crvRevenueToPlatformAmountCumulative =
    dayRevenue.crvRevenueToPlatformAmountCumulative.plus(crvRevenueToPlatformAmount)
  dayRevenue.crvRevenueToLpProvidersAmountCumulative =
    dayRevenue.crvRevenueToLpProvidersAmountCumulative.plus(crvRevenueToLpProvidersAmount)
  dayRevenue.cvxRevenueToLpProvidersAmountCumulative =
    dayRevenue.cvxRevenueToLpProvidersAmountCumulative.plus(cvxRevenueToLpProvidersAmount)

  dayRevenue.timestamp = timestamp

  dayRevenue.save()
}

export function recordFeeRevenue(timestamp: BigInt): void {
  const revenue = new FeeRevenue(timestamp.toString())
  revenue.platform = CONVEX_PLATFORM_ID
  revenue.amount = getHistoricalRewards(LOCK_FEES_ADDRESS)
  revenue.timestamp = timestamp
  revenue.save()
}
