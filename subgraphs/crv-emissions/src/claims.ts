import { Withdraw_admin_feesCall } from '../generated/templates/CurvePoolV1/CurvePoolV1AdminFees'
import { AdminClaim } from '../generated/schema'
import { log } from '@graphprotocol/graph-ts/index'
import {
  ADDRESS_ZERO,
  CRV_ADDRESS,
  CURVE_REGISTRY,
  LINK_ADDRESS,
  WBTC_ADDRESS,
  WETH_ADDRESS,
} from '../../../packages/constants'
import { CurveRegistry } from '../../curve-pools/generated/Booster/CurveRegistry'
import { getUsdRate } from '../../../packages/utils/pricing'
import { getIntervalFromTimestamp, WEEK } from '../../../packages/utils/time'

export function handleAdminFees(call: Withdraw_admin_feesCall): void {
  if (call.block.number.toI32() < 12667823) {
    return
  }
  log.debug('New claim registered at tx {} for pool {}', [call.transaction.hash.toHexString(), call.to.toHexString()])
  let claim = AdminClaim.load(call.transaction.hash.toHexString())
  if (!claim) {
    claim = new AdminClaim(call.transaction.hash.toHexString())
    claim.tx = call.transaction.hash
    claim.block = call.block.number
    claim.timestamp = call.block.timestamp
    claim.from = call.from
    claim.ethPrice = getUsdRate(WETH_ADDRESS)
    claim.btcPrice = getUsdRate(WBTC_ADDRESS)
    claim.crvPrice = getUsdRate(CRV_ADDRESS)
    claim.linkPrice = getUsdRate(LINK_ADDRESS)
    claim.week = getIntervalFromTimestamp(call.block.timestamp, WEEK)
  }
  const pool = call.to
  const curveRegistry = CurveRegistry.bind(CURVE_REGISTRY)
  let lpToken = pool
  const lpTokenResult = curveRegistry.try_get_lp_token(pool)
  if (!(lpTokenResult.reverted || lpTokenResult.value == ADDRESS_ZERO)) {
    lpToken = lpTokenResult.value
  }
  const pools = claim.pools
  pools.push(lpToken.toHexString())
  claim.pools = pools
  claim.save()
}
