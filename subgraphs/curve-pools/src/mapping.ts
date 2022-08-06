import {
  Deposited as DepositedEvent,
  Withdrawn as WithdrawnEvent,
  AddPoolCall,
  Booster,
  ShutdownPoolCall,
  EarmarkRewardsCall,
  EarmarkFeesCall,
} from '../generated/Booster/Booster'
import { Pool } from '../generated/schema'
import { Deposit, Withdrawal } from '../generated/schema'
import { getLpTokenSupply, getPool, getPoolCoins, getPoolExtras } from './services/pools'
import {
  ADDRESS_ZERO,
  CONVEX_PLATFORM_ID,
  ASSET_TYPES,
  BIG_DECIMAL_1E18,
  BIG_INT_MINUS_ONE,
  BIG_INT_ONE,
  BOOSTER_ADDRESS,
  CURVE_REGISTRY,
  BIG_INT_ZERO,
  BIG_DECIMAL_ONE,
  CURVE_REGISTRY_V2,
  V2_SWAPS,
  TRICRYPTO_LP_ADDRESSES,
} from 'const'
import { CurveRegistry } from '../generated/Booster/CurveRegistry'
import { ERC20 } from '../generated/Booster/ERC20'
import { getLpTokenPriceUSD } from './services/apr'
import { Address, Bytes, DataSourceContext, log } from '@graphprotocol/graph-ts'
import { getPlatform } from './services/platform'
import { recordFeeRevenue, takeWeeklyRevenueSnapshot } from './services/revenue'
import { PoolCrvRewards } from '../generated/templates'
import { CurveToken } from '../generated/Booster/CurveToken'
import { getUser } from './services/user'
import { getDailyPoolSnapshot, takePoolSnapshots } from './services/snapshots'

export function handleAddPool(call: AddPoolCall): void {
  const platform = getPlatform()
  const booster = Booster.bind(BOOSTER_ADDRESS)
  const curveRegistry = CurveRegistry.bind(CURVE_REGISTRY)

  // below can be used for testing when changing start block number
  // but can't rely on it as some pools were created in the same block
  //const pid = booster.poolLength().minus(BIG_INT_ONE)

  const pid = platform.poolCount
  platform.poolCount = platform.poolCount.plus(BIG_INT_ONE)

  const poolInfo = booster.try_poolInfo(pid)
  const pool = new Pool(pid.toString())
  let stash = ADDRESS_ZERO
  if (!poolInfo.reverted) {
    pool.token = poolInfo.value.value1

    pool.crvRewardsPool = poolInfo.value.value3
    const context = new DataSourceContext()
    context.setString('pid', pid.toString())
    PoolCrvRewards.createWithContext(poolInfo.value.value3, context)

    stash = poolInfo.value.value4
    pool.stash = stash
  }
  const lpToken = call.inputs._lptoken
  pool.poolid = pid
  pool.lpToken = lpToken
  pool.platform = CONVEX_PLATFORM_ID

  let swapResult = curveRegistry.try_get_pool_from_lp_token(call.inputs._lptoken)

  let swap = lpToken
  if (!(swapResult.reverted || swapResult.value == ADDRESS_ZERO)) {
    swap = swapResult.value
  } else {
    const curveRegistryV2 = CurveRegistry.bind(CURVE_REGISTRY_V2)
    swapResult = curveRegistryV2.try_get_pool_from_lp_token(lpToken)
    if (!(swapResult.reverted || swapResult.value == ADDRESS_ZERO)) {
      swap = swapResult.value
      pool.isV2 = true
    }
    // these pools predate the v2 registry
    else if (V2_SWAPS.has(lpToken.toHexString())) {
      swap = Address.fromString(V2_SWAPS.get(lpToken.toHexString()))
      pool.isV2 = true
    } else {
      // if still nothing try to get the minter from the LP Token
      const lpTokenContract = CurveToken.bind(lpToken)
      swapResult = lpTokenContract.try_minter()
      if (!(swapResult.reverted || swapResult.value == ADDRESS_ZERO)) {
        swap = swapResult.value
        pool.isV2 = true
      } else {
        log.warning('Could not find pool for lp token {}', [lpToken.toHexString()])
      }
    }
  }
  // tricrypto is in old registry but still v2
  if (TRICRYPTO_LP_ADDRESSES.includes(lpToken)) {
    pool.isV2 = true
  }

  pool.swap = swap

  let name = curveRegistry.get_pool_name(swap)
  if (name == '') {
    const lpTokenContract = ERC20.bind(lpToken)
    const lpTokenNameResult = lpTokenContract.try_name()
    name = lpTokenNameResult.reverted ? '' : lpTokenNameResult.value
  }
  pool.name = name

  getPoolCoins(pool)
  log.info('New pool added {} at block {}', [pool.name, call.block.number.toString()])

  pool.assetType = ASSET_TYPES.has(swap.toHexString()) ? ASSET_TYPES.get(swap.toHexString()) : 0
  pool.gauge = call.inputs._gauge
  pool.stashVersion = call.inputs._stashVersion
  // Initialize minor version at -1
  pool.stashMinorVersion = BIG_INT_MINUS_ONE
  // If there is a stash contract, get the reward tokens
  if (stash != ADDRESS_ZERO) {
    getPoolExtras(pool)
  }
  pool.active = true
  pool.creationBlock = call.block.number
  pool.creationDate = call.block.timestamp
  pool.save()
  platform.save()
}

export function handleShutdownPool(call: ShutdownPoolCall): void {
  const pool = getPool(call.inputs._pid.toString())
  pool.active = false
  pool.save()
}

export function handleWithdrawn(event: WithdrawnEvent): void {
  const withdrawal = new Withdrawal(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
  withdrawal.user = getUser(event.params.user).id
  withdrawal.poolid = event.params.poolid.toString()
  withdrawal.amount = event.params.amount
  withdrawal.timestamp = event.block.timestamp
  withdrawal.save()

  const pool = getPool(withdrawal.poolid)
  if (pool.lpToken == Bytes.empty()) {
    return
  }
  pool.lpTokenBalance = pool.lpTokenBalance.minus(withdrawal.amount)
  pool.save()
  takePoolSnapshots(event.block.timestamp)

  const lpPrice = getLpTokenPriceUSD(pool)
  log.debug('LP Token price USD for pool {}: {}', [pool.name, lpPrice.toString()])
  pool.lpTokenUSDPrice = lpPrice
  const lpSupply = getLpTokenSupply(pool.lpToken)
  pool.curveTvlRatio =
    lpSupply == BIG_INT_ZERO ? BIG_DECIMAL_ONE : pool.lpTokenBalance.toBigDecimal().div(lpSupply.toBigDecimal())
  pool.tvl = pool.lpTokenBalance.toBigDecimal().div(BIG_DECIMAL_1E18).times(lpPrice)

  const snapshot = getDailyPoolSnapshot(pool, event.block.timestamp)

  pool.baseApr = snapshot.baseApr
  snapshot.tvl = pool.tvl
  snapshot.withdrawalCount = snapshot.withdrawalCount.plus(BIG_INT_ONE)
  snapshot.withdrawalVolume = snapshot.withdrawalVolume.plus(event.params.amount)
  snapshot.withdrawalValue = snapshot.withdrawalValue.plus(event.params.amount.toBigDecimal().times(lpPrice))

  pool.save()
  snapshot.save()
}

export function handleDeposited(event: DepositedEvent): void {
  const deposit = new Deposit(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
  deposit.user = getUser(event.params.user).id
  deposit.poolid = event.params.poolid.toString()
  deposit.amount = event.params.amount
  deposit.timestamp = event.block.timestamp
  deposit.save()

  const pool = getPool(deposit.poolid)
  if (pool.lpToken == Bytes.empty()) {
    return
  }
  pool.lpTokenBalance = pool.lpTokenBalance.plus(deposit.amount)
  const lpSupply = getLpTokenSupply(pool.lpToken)
  pool.curveTvlRatio =
    lpSupply == BIG_INT_ZERO ? BIG_DECIMAL_ONE : pool.lpTokenBalance.toBigDecimal().div(lpSupply.toBigDecimal())
  const lpPrice = getLpTokenPriceUSD(pool)
  pool.lpTokenUSDPrice = lpPrice
  log.debug('LP Token price USD for pool {}: {}', [pool.name, lpPrice.toString()])
  pool.tvl = pool.lpTokenBalance.toBigDecimal().div(BIG_DECIMAL_1E18).times(lpPrice)

  const snapshot = getDailyPoolSnapshot(pool, event.block.timestamp)

  pool.baseApr = snapshot.baseApr
  snapshot.tvl = pool.tvl
  snapshot.depositCount = snapshot.depositCount.plus(BIG_INT_ONE)
  snapshot.depositVolume = snapshot.depositVolume.plus(event.params.amount)
  snapshot.depositValue = snapshot.depositValue.plus(event.params.amount.toBigDecimal().times(lpPrice))

  pool.save()
  snapshot.save()
}

export function handleEarmarkRewards(call: EarmarkRewardsCall): void {
  takeWeeklyRevenueSnapshot(call.block.timestamp)
}

export function handleEarmarkFees(call: EarmarkFeesCall): void {
  recordFeeRevenue(call.block.timestamp)
}
