import { Platform } from '../../generated/schema'
import { CONVEX_PLATFORM_ID } from 'const'
import { BigDecimal, BigInt } from '@graphprotocol/graph-ts'

export function getPlatform(): Platform {
  let platform = Platform.load(CONVEX_PLATFORM_ID)
  if (!platform) {
    platform = new Platform(CONVEX_PLATFORM_ID)
    platform.bribeFee = BigInt.fromI32(400)
    platform.poolCount = BigInt.zero()
    platform.totalCrvRevenueToLpProviders = BigDecimal.zero()
    platform.totalCvxRevenueToLpProviders = BigDecimal.zero()
    platform.totalFxsRevenueToLpProviders = BigDecimal.zero()
    platform.totalCrvRevenueToCvxCrvStakers = BigDecimal.zero()
    platform.totalCvxRevenueToCvxCrvStakers = BigDecimal.zero()
    platform.totalThreeCrvRevenueToCvxCrvStakers = BigDecimal.zero()
    platform.totalFxsRevenueToCvxFxsStakers = BigDecimal.zero()
    platform.totalCrvRevenueToCvxStakers = BigDecimal.zero()
    platform.totalFxsRevenueToCvxStakers = BigDecimal.zero()
    platform.totalCrvRevenueToCallers = BigDecimal.zero()
    platform.totalFxsRevenueToCallers = BigDecimal.zero()
    platform.totalCrvRevenueToPlatform = BigDecimal.zero()
    platform.totalFxsRevenueToPlatform = BigDecimal.zero()
    platform.totalCrvRevenue = BigDecimal.zero()
    platform.totalFxsRevenue = BigDecimal.zero()
    platform.totalBribeRevenue = BigDecimal.zero()
    platform.totalOtherRevenue = BigDecimal.zero()
  }
  return platform
}
