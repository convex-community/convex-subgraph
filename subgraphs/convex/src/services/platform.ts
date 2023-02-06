import { Platform } from '../../generated/schema'
import { CONVEX_PLATFORM_ID } from 'const'
import { BigDecimal, BigInt } from '@graphprotocol/graph-ts'

export function getPlatform(): Platform {
  let platform = Platform.load(CONVEX_PLATFORM_ID)
  if (!platform) {
    platform = new Platform(CONVEX_PLATFORM_ID)
    platform.bribeFee = BigInt.fromI32(400)

    platform.totalCrvRevenueToLpProviders = BigDecimal.zero()
    platform.totalCvxRevenueToLpProviders = BigDecimal.zero()
    platform.totalCrvRevenueToCvxCrvStakers = BigDecimal.zero()
    platform.totalCvxRevenueToCvxCrvStakers = BigDecimal.zero()
    platform.totalCrvRevenueToCvxStakers = BigDecimal.zero()
    platform.totalCrvRevenueToCallers = BigDecimal.zero()
    platform.totalCrvRevenueToPlatform = BigDecimal.zero()
    platform.totalCrvRevenue = BigDecimal.zero()
    platform.totalBribeRevenue = BigDecimal.zero()
  }
  return platform
}
