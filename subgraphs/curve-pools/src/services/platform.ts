import { Platform } from '../../generated/schema'
import { CONVEX_PLATFORM_ID } from '../../../../packages/constants'

export function getPlatform(): Platform {
  let platform = Platform.load(CONVEX_PLATFORM_ID)
  if (!platform) {
    platform = new Platform(CONVEX_PLATFORM_ID)
  }
  return platform
}
