import { getPlatform } from './services/platform'
import { getUsdRate } from 'utils/pricing'
import { getIntervalFromTimestamp, DAY } from 'utils/time'
import { getDailyRevenueSnapshot } from './services/revenue'
import { FeeDeposit, RewardsDistributed } from '../generated/FeeDeposit/FeeDeposit'
import { FeeRegistry } from '../generated/FeeDeposit/FeeRegistry'
import { BIG_DECIMAL_1E18, BIG_DECIMAL_ONE, DENOMINATOR, FEE_REGISTRY_ADDRESS } from 'const'

export function handleRewardsDistributed(event: RewardsDistributed): void {
  const registry = FeeRegistry.bind(FEE_REGISTRY_ADDRESS)
  const deposit = FeeDeposit.bind(event.address)
  const decimalDenominator = DENOMINATOR.toBigDecimal()
  const amount = event.params.amount.toBigDecimal().div(BIG_DECIMAL_1E18)

  const platform = getPlatform()
  const day = getIntervalFromTimestamp(event.block.timestamp, DAY)
  const revenueSnapshot = getDailyRevenueSnapshot(day)

  const callIncentive = deposit.callIncentive().toBigDecimal().div(decimalDenominator)
  const stakerIncentive = registry.cvxIncentive().toBigDecimal().div(decimalDenominator)
  const totalFees = registry.totalFees().toBigDecimal().div(decimalDenominator)
  const platformFee = registry.platformIncentive().toBigDecimal().div(decimalDenominator)
  const lpShare = BIG_DECIMAL_ONE.minus(totalFees)
  // technically rewards can be given in other tokens
  const tokenPrice = getUsdRate(event.params.token)

  // the amount logged doesn't include the caller fee so let's put it back
  const wholeFeeAmount = amount.div(BIG_DECIMAL_ONE.minus(callIncentive))
  const fxsRevenueToCallers = wholeFeeAmount.minus(amount)

  // infer total revenue from it
  const totalFxsRevenue = amount.div(lpShare).times(tokenPrice)
  const fxsRevenueToLpProviders = totalFxsRevenue.minus(amount)

  // calc other amounts
  const fxsRevenueToCvxStakers = amount.times(stakerIncentive).div(totalFees)
  const fxsRevenueToPlatform = amount.times(platformFee).div(totalFees)
  const fxsRevenueToCvxFxsStakers = amount.minus(fxsRevenueToCvxStakers.plus(fxsRevenueToPlatform))

  revenueSnapshot.fxsRevenueToCallersAmount = fxsRevenueToCallers
  revenueSnapshot.fxsRevenueToCvxStakersAmount = fxsRevenueToCvxStakers
  revenueSnapshot.fxsRevenueToPlatformAmount = fxsRevenueToPlatform
  revenueSnapshot.fxsRevenueToLpProvidersAmount = fxsRevenueToLpProviders
  revenueSnapshot.fxsRevenueToCvxFxsStakersAmount = fxsRevenueToCvxFxsStakers
  revenueSnapshot.totalFxsRevenue = totalFxsRevenue
  revenueSnapshot.fxsPrice = tokenPrice

  platform.totalFxsRevenueToPlatform = platform.totalFxsRevenueToPlatform.plus(fxsRevenueToPlatform)
  platform.totalFxsRevenue = platform.totalFxsRevenue.plus(totalFxsRevenue)
  platform.totalFxsRevenueToCallers = platform.totalFxsRevenueToCallers.plus(fxsRevenueToCallers)
  platform.totalFxsRevenueToCvxStakers = platform.totalFxsRevenueToCvxStakers.plus(fxsRevenueToCvxStakers)
  platform.totalFxsRevenueToCvxFxsStakers = platform.totalFxsRevenueToCvxFxsStakers.plus(fxsRevenueToCvxFxsStakers)
  platform.totalFxsRevenueToLpProviders = platform.totalFxsRevenueToLpProviders.plus(fxsRevenueToLpProviders)

  platform.save()
  revenueSnapshot.save()
}
