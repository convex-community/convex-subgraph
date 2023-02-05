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
} from 'const'
import { Booster } from '../../generated/Booster/Booster'
import { DAY, getIntervalFromTimestamp } from 'utils/time'
import { FeeRevenue, RevenueDailySnapshot } from '../../generated/schema'
import { getUsdRate } from 'utils/pricing'

export function getRevenueDailySnapshot(day: string): RevenueDailySnapshot {
  let revenueSnapshot = RevenueDailySnapshot.load(day)
  if (!revenueSnapshot) {
    revenueSnapshot = new RevenueDailySnapshot(day)
    revenueSnapshot.crvRevenueToLpProvidersAmount = BigDecimal.zero()
    revenueSnapshot.crvRevenueToCvxCrvStakersAmount = BigDecimal.zero()
    revenueSnapshot.crvRevenueToCvxStakersAmount = BigDecimal.zero()
    revenueSnapshot.crvRevenueToCallersAmount = BigDecimal.zero()
    revenueSnapshot.crvRevenueToPlatformAmount = BigDecimal.zero()
    revenueSnapshot.totalCrvRevenue = BigDecimal.zero()
    revenueSnapshot.crvRevenueToLpProvidersAmountCumulative = BigDecimal.zero()
    revenueSnapshot.crvRevenueToCvxCrvStakersAmountCumulative = BigDecimal.zero()
    revenueSnapshot.crvRevenueToCvxStakersAmountCumulative = BigDecimal.zero()
    revenueSnapshot.crvRevenueToCallersAmountCumulative = BigDecimal.zero()
    revenueSnapshot.crvRevenueToPlatformAmountCumulative = BigDecimal.zero()
    revenueSnapshot.totalCrvRevenueCumulative = BigDecimal.zero()
    revenueSnapshot.crvPrice = BigDecimal.zero()
    revenueSnapshot.bribeRevenue = BigDecimal.zero()
    revenueSnapshot.cumulativeBribeRevenue = BigDecimal.zero()
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

export function takeDailyRevenueSnapshot(timestamp: BigInt): void {
  const day = getIntervalFromTimestamp(timestamp, DAY)
  let crvRevenue = RevenueDailySnapshot.load(day.toString())
  if (!crvRevenue) {
    const previousDay = getIntervalFromTimestamp(timestamp.minus(DAY), DAY)
    const previousDayRevenue = RevenueDailySnapshot.load(previousDay.toString())
    const prevLpRewards = previousDayRevenue
      ? previousDayRevenue.crvRevenueToLpProvidersAmountCumulative
      : BIG_DECIMAL_ZERO
    const prevCvxCrvStakerRewards = previousDayRevenue
      ? previousDayRevenue.crvRevenueToCvxCrvStakersAmountCumulative
      : BIG_DECIMAL_ZERO
    const prevCvxStakerRewards = previousDayRevenue
      ? previousDayRevenue.crvRevenueToCvxStakersAmountCumulative
      : BIG_DECIMAL_ZERO
    const prevTotalRevenueDailySnapshot = previousDayRevenue
      ? previousDayRevenue.totalCrvRevenueCumulative
      : BIG_DECIMAL_ZERO
    const prevCallersRewards = previousDayRevenue
      ? previousDayRevenue.crvRevenueToCallersAmountCumulative
      : BIG_DECIMAL_ZERO
    const prevPlatformRewards = previousDayRevenue ? previousDayRevenue.crvRevenueToPlatformAmount : BIG_DECIMAL_ZERO
    const prevCrvPrice = previousDayRevenue ? previousDayRevenue.crvPrice : BIG_DECIMAL_ZERO
    const currentCrvPrice = getUsdRate(CRV_ADDRESS)
    const crvPrice =
      prevCrvPrice == BIG_DECIMAL_ZERO
        ? currentCrvPrice
        : currentCrvPrice.plus(prevCrvPrice).div(BigDecimal.fromString('2'))

    crvRevenue = getRevenueDailySnapshot(day.toString())
    crvRevenue.crvPrice = crvPrice
    crvRevenue.platform = CONVEX_PLATFORM_ID
    const contract = Booster.bind(BOOSTER_ADDRESS)
    const historicalCvxCrvStakerRewards = getHistoricalRewards(CVXCRV_REWARDS_ADDRESS)
      .toBigDecimal()
      .div(BIG_DECIMAL_1E18)
      .times(crvPrice)
    const dailyCvxCrvStakerRewards = historicalCvxCrvStakerRewards.minus(prevCvxCrvStakerRewards)

    const lockIncentive = contract.lockIncentive().toBigDecimal()
    const callIncentive = contract.earmarkIncentive().toBigDecimal()
    const stakerIncentive = contract.stakerIncentive().toBigDecimal()
    const platformFee = contract.platformFee().toBigDecimal()

    const decimalDenominator = DENOMINATOR.toBigDecimal()

    const dailyCrvTotalRevenue = dailyCvxCrvStakerRewards.times(decimalDenominator).div(lockIncentive)
    crvRevenue.totalCrvRevenue = dailyCrvTotalRevenue
    crvRevenue.crvRevenueToCvxCrvStakersAmount = dailyCvxCrvStakerRewards

    crvRevenue.crvRevenueToCvxStakersAmount = dailyCrvTotalRevenue.times(stakerIncentive).div(decimalDenominator)
    crvRevenue.crvRevenueToCallersAmount = dailyCrvTotalRevenue.times(callIncentive).div(decimalDenominator)
    crvRevenue.crvRevenueToPlatformAmount = dailyCrvTotalRevenue.times(platformFee).div(decimalDenominator)
    crvRevenue.crvRevenueToLpProvidersAmount = dailyCrvTotalRevenue
      .minus(crvRevenue.crvRevenueToPlatformAmount)
      .minus(crvRevenue.crvRevenueToCallersAmount)
      .minus(crvRevenue.crvRevenueToCvxStakersAmount)
      .minus(dailyCvxCrvStakerRewards)

    crvRevenue.crvRevenueToLpProvidersAmountCumulative = prevLpRewards.plus(crvRevenue.crvRevenueToLpProvidersAmount)
    crvRevenue.crvRevenueToCvxCrvStakersAmountCumulative = prevCvxCrvStakerRewards.plus(
      crvRevenue.crvRevenueToCvxCrvStakersAmount
    )
    crvRevenue.crvRevenueToCvxStakersAmountCumulative = prevCvxStakerRewards.plus(
      crvRevenue.crvRevenueToCvxStakersAmount
    )
    crvRevenue.crvRevenueToCallersAmountCumulative = prevCallersRewards.plus(crvRevenue.crvRevenueToCallersAmount)
    crvRevenue.crvRevenueToPlatformAmountCumulative = prevPlatformRewards.plus(crvRevenue.crvRevenueToPlatformAmount)
    crvRevenue.totalCrvRevenueCumulative = prevTotalRevenueDailySnapshot.plus(dailyCrvTotalRevenue)
    crvRevenue.timestamp = timestamp

    crvRevenue.save()

    // Create a snapshot for the specific pool
  }
}

export function recordFeeRevenue(timestamp: BigInt): void {
  const revenue = new FeeRevenue(timestamp.toString())
  revenue.platform = CONVEX_PLATFORM_ID
  revenue.amount = getHistoricalRewards(LOCK_FEES_ADDRESS)
  revenue.timestamp = timestamp
  revenue.save()
}
