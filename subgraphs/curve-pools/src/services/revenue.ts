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
} from '../../../../packages/constants'
import { Booster } from '../../generated/Booster/Booster'
import { getIntervalFromTimestamp, WEEK } from '../../../../packages/utils/time'
import { FeeRevenue, RevenueWeeklySnapshot } from '../../generated/schema'
import { getUsdRate } from '../../../../packages/utils/pricing'

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
      : BIG_INT_ZERO
    const prevCvxCrvStakerRewards = previousWeekRevenue
      ? previousWeekRevenue.crvRevenueToCvxCrvStakersAmountCumulative
      : BIG_INT_ZERO
    const prevCvxStakerRewards = previousWeekRevenue
      ? previousWeekRevenue.crvRevenueToCvxStakersAmountCumulative
      : BIG_INT_ZERO
    const prevTotalRevenueWeeklySnapshot = previousWeekRevenue
      ? previousWeekRevenue.totalCrvRevenueCumulative
      : BIG_INT_ZERO
    const prevCallersRewards = previousWeekRevenue
      ? previousWeekRevenue.crvRevenueToCallersAmountCumulative
      : BIG_INT_ZERO
    const prevPlatformRewards = previousWeekRevenue ? previousWeekRevenue.crvRevenueToPlatformAmount : BIG_INT_ZERO
    const prevCrvPrice = previousWeekRevenue ? previousWeekRevenue.crvPrice : BIG_DECIMAL_ZERO

    crvRevenue = new RevenueWeeklySnapshot(week.toString())
    crvRevenue.platform = CONVEX_PLATFORM_ID
    const contract = Booster.bind(BOOSTER_ADDRESS)
    const historicalCvxCrvStakerRewards = getHistoricalRewards(CVXCRV_REWARDS_ADDRESS)
    const weeklyCvxCrvStakerRewards = historicalCvxCrvStakerRewards.minus(prevCvxCrvStakerRewards)

    const lockIncentive = contract.lockIncentive()
    const callIncentive = contract.earmarkIncentive()
    const stakerIncentive = contract.stakerIncentive()
    const platformFee = contract.platformFee()

    const weeklyCrvTotalRevenue = weeklyCvxCrvStakerRewards.times(DENOMINATOR).div(lockIncentive)
    crvRevenue.totalCrvRevenue = weeklyCrvTotalRevenue
    crvRevenue.crvRevenueToCvxCrvStakersAmount = weeklyCvxCrvStakerRewards

    crvRevenue.crvRevenueToCvxStakersAmount = weeklyCrvTotalRevenue.times(stakerIncentive).div(DENOMINATOR)
    crvRevenue.crvRevenueToCallersAmount = weeklyCrvTotalRevenue.times(callIncentive).div(DENOMINATOR)
    crvRevenue.crvRevenueToPlatformAmount = weeklyCrvTotalRevenue.times(platformFee).div(DENOMINATOR)
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

    const currentCrvPrice = getUsdRate(CRV_ADDRESS)
    crvRevenue.crvPrice =
      prevCrvPrice == BIG_DECIMAL_ZERO
        ? currentCrvPrice
        : currentCrvPrice.plus(prevCrvPrice).div(BigDecimal.fromString('2'))
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
