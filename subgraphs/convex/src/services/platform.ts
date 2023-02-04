import { Platform } from '../../generated/schema'
import { CONVEX_PLATFORM_ID } from 'const'
import { BigInt } from '@graphprotocol/graph-ts'

export function getPlatform(): Platform {
  let platform = Platform.load(CONVEX_PLATFORM_ID)
  if (!platform) {
    platform = new Platform(CONVEX_PLATFORM_ID)
    platform.bribeFee = BigInt.fromI32(400)
  }
  return platform
}
