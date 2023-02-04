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
import { getIntervalFromTimestamp, WEEK } from 'utils/time'
import { FeeRevenue, RevenueWeeklySnapshot } from '../../generated/schema'
import { getUsdRate } from 'utils/pricing'

export function getRevenueWeeklySnapshot(week: string): RevenueWeeklySnapshot {
  let revenueSnapshot = RevenueWeeklySnapshot.load(week)
  if (!revenueSnapshot) {
    revenueSnapshot = new RevenueWeeklySnapshot(week)
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

export function takeWeeklyRevenueSnapshot(timestamp: BigInt): void {
  const week = getIntervalFromTimestamp(timestamp, WEEK)
  let crvRevenue = RevenueWeeklySnapshot.load(week.toString())
  if (!crvRevenue) {
    const previousWeek = getIntervalFromTimestamp(timestamp.minus(WEEK), WEEK)
    const previousWeekRevenue = RevenueWeeklySnapshot.load(previousWeek.toString())
    const prevLpRewards = previousWeekRevenue
      ? previousWeekRevenue.crvRevenueToLpProvidersAmountCumulative
      : BIG_DECIMAL_ZERO
    const prevCvxCrvStakerRewards = previousWeekRevenue
      ? previousWeekRevenue.crvRevenueToCvxCrvStakersAmountCumulative
      : BIG_DECIMAL_ZERO
    const prevCvxStakerRewards = previousWeekRevenue
      ? previousWeekRevenue.crvRevenueToCvxStakersAmountCumulative
      : BIG_DECIMAL_ZERO
    const prevTotalRevenueWeeklySnapshot = previousWeekRevenue
      ? previousWeekRevenue.totalCrvRevenueCumulative
      : BIG_DECIMAL_ZERO
    const prevCallersRewards = previousWeekRevenue
      ? previousWeekRevenue.crvRevenueToCallersAmountCumulative
      : BIG_DECIMAL_ZERO
    const prevPlatformRewards = previousWeekRevenue ? previousWeekRevenue.crvRevenueToPlatformAmount : BIG_DECIMAL_ZERO
    const prevCrvPrice = previousWeekRevenue ? previousWeekRevenue.crvPrice : BIG_DECIMAL_ZERO
    const currentCrvPrice = getUsdRate(CRV_ADDRESS)
    const crvPrice =
      prevCrvPrice == BIG_DECIMAL_ZERO
        ? currentCrvPrice
        : currentCrvPrice.plus(prevCrvPrice).div(BigDecimal.fromString('2'))

    crvRevenue = getRevenueWeeklySnapshot(week.toString())
    crvRevenue.crvPrice = crvPrice
    crvRevenue.platform = CONVEX_PLATFORM_ID
    const contract = Booster.bind(BOOSTER_ADDRESS)
    const historicalCvxCrvStakerRewards = getHistoricalRewards(CVXCRV_REWARDS_ADDRESS)
      .toBigDecimal()
      .div(BIG_DECIMAL_1E18)
      .times(crvPrice)
    const weeklyCvxCrvStakerRewards = historicalCvxCrvStakerRewards.minus(prevCvxCrvStakerRewards)

    const lockIncentive = contract.lockIncentive().toBigDecimal()
    const callIncentive = contract.earmarkIncentive().toBigDecimal()
    const stakerIncentive = contract.stakerIncentive().toBigDecimal()
    const platformFee = contract.platformFee().toBigDecimal()

    const decimalDenominator = DENOMINATOR.toBigDecimal()

    const weeklyCrvTotalRevenue = weeklyCvxCrvStakerRewards.times(decimalDenominator).div(lockIncentive)
    crvRevenue.totalCrvRevenue = weeklyCrvTotalRevenue
    crvRevenue.crvRevenueToCvxCrvStakersAmount = weeklyCvxCrvStakerRewards

    crvRevenue.crvRevenueToCvxStakersAmount = weeklyCrvTotalRevenue.times(stakerIncentive).div(decimalDenominator)
    crvRevenue.crvRevenueToCallersAmount = weeklyCrvTotalRevenue.times(callIncentive).div(decimalDenominator)
    crvRevenue.crvRevenueToPlatformAmount = weeklyCrvTotalRevenue.times(platformFee).div(decimalDenominator)
    crvRevenue.crvRevenueToLpProvidersAmount = weeklyCrvTotalRevenue
      .minus(crvRevenue.crvRevenueToPlatformAmount)
      .minus(crvRevenue.crvRevenueToCallersAmount)
      .minus(crvRevenue.crvRevenueToCvxStakersAmount)
      .minus(weeklyCvxCrvStakerRewards)

    crvRevenue.crvRevenueToLpProvidersAmountCumulative = prevLpRewards.plus(crvRevenue.crvRevenueToLpProvidersAmount)
    crvRevenue.crvRevenueToCvxCrvStakersAmountCumulative = prevCvxCrvStakerRewards.plus(
      crvRevenue.crvRevenueToCvxCrvStakersAmount
    )
    crvRevenue.crvRevenueToCvxStakersAmountCumulative = prevCvxStakerRewards.plus(
      crvRevenue.crvRevenueToCvxStakersAmount
    )
    crvRevenue.crvRevenueToCallersAmountCumulative = prevCallersRewards.plus(crvRevenue.crvRevenueToCallersAmount)
    crvRevenue.crvRevenueToPlatformAmountCumulative = prevPlatformRewards.plus(crvRevenue.crvRevenueToPlatformAmount)
    crvRevenue.totalCrvRevenueCumulative = prevTotalRevenueWeeklySnapshot.plus(weeklyCrvTotalRevenue)
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
