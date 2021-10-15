import { Platform } from '../../generated/schema'
import { PLATFORM_ID } from '../../../../packages/constants'

export function getPlatform(): Platform {
  let platform = Platform.load(PLATFORM_ID)
  if (!platform) {
    platform = new Platform(PLATFORM_ID)
  }
  return platform
}
