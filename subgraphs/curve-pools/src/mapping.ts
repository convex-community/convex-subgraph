import {
  Deposited as DepositedEvent,
  Withdrawn as WithdrawnEvent,
  AddPoolCall,
  Booster,
  ShutdownPoolCall,
  EarmarkRewardsCall,
  EarmarkFeesCall,
} from '../generated/Booster/Booster'
import { HourlyPoolSnapshot, Pool } from '../generated/schema'
import { Deposit, Withdrawal } from '../generated/schema'
import { getPool, getPoolApr, getPoolCoins, getPoolExtras } from './services/pools'
import {
  ADDRESS_ZERO,
  PLATFORM_ID,
  ASSET_TYPES,
  BIG_DECIMAL_1E18,
  BIG_INT_MINUS_ONE,
  BIG_INT_ONE,
  BOOSTER_ADDRESS,
  CURVE_REGISTRY,
} from 'const'
import { CurveRegistry } from '../generated/Booster/CurveRegistry'
import { ERC20 } from '../generated/Booster/ERC20'
import { getLpTokenPriceUSD, getLpTokenVirtualPrice, getPoolBaseApr } from './services/apr'
import { DataSourceContext, log } from '@graphprotocol/graph-ts'
import { getIntervalFromTimestamp, HOUR } from '../../../packages/utils/time'
import { getPlatform } from './services/platform'
import { recordFeeRevenue, takeWeeklyRevenueSnapshot } from './services/revenue'
import { PoolCrvRewards } from '../generated/templates'

export function handleAddPool(call: AddPoolCall): void {
  const platform = getPlatform()
  const booster = Booster.bind(BOOSTER_ADDRESS)
  const curveRegistry = CurveRegistry.bind(CURVE_REGISTRY)

  const pid = platform.poolCount
  platform.poolCount = platform.poolCount.plus(BIG_INT_ONE)

  const poolInfo = booster.try_poolInfo(pid)
  const pool = new Pool(pid.toString())
  let stash = ADDRESS_ZERO
  if (!poolInfo.reverted) {
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
  pool.platform = PLATFORM_ID

  let swap = curveRegistry.get_pool_from_lp_token(call.inputs._lptoken)
  // factory pools not in the registry
  swap = swap == ADDRESS_ZERO ? lpToken : swap

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

// TODO: Merge logic with deposit logic
export function handleWithdrawn(event: WithdrawnEvent): void {
  const withdrawal = new Withdrawal(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
  withdrawal.user = event.params.user.toHexString()
  withdrawal.poolid = event.params.poolid.toString()
  withdrawal.amount = event.params.amount
  withdrawal.timestamp = event.block.timestamp
  withdrawal.save()

  const pool = getPool(withdrawal.poolid)
  pool.lpTokenBalance = pool.lpTokenBalance.minus(withdrawal.amount)
  const lpPrice = getLpTokenPriceUSD(pool)
  pool.tvl = pool.lpTokenBalance.toBigDecimal().div(BIG_DECIMAL_1E18).times(lpPrice)

  // TODO: can be replaced by getHourlyPoolSnapshot to DRY once AssemblyScript
  // supports tuples as return values
  const time = getIntervalFromTimestamp(event.block.timestamp, HOUR)
  const snapId = pool.name + '-' + withdrawal.poolid.toString() + '-' + time.toString()
  let snapshot = HourlyPoolSnapshot.load(snapId)

  // we only do call-heavy calculations once upon snapshot creation
  if (!snapshot) {
    snapshot = new HourlyPoolSnapshot(snapId)
    snapshot.poolid = event.params.poolid.toString()
    snapshot.poolName = pool.name
    snapshot.timestamp = event.block.timestamp
    const aprs = getPoolApr(pool, event.block.timestamp)
    pool.crvApr = aprs[0]
    pool.cvxApr = aprs[1]
    pool.extraRewardsApr = aprs[2]
    snapshot.lpTokenVirtualPrice = getLpTokenVirtualPrice(pool.lpToken)
    snapshot.crvApr = pool.crvApr
    snapshot.cvxApr = pool.cvxApr
    snapshot.extraRewardsApr = pool.extraRewardsApr
    snapshot.lpTokenBalance = pool.lpTokenBalance

    pool.baseApr = getPoolBaseApr(pool, snapshot.lpTokenVirtualPrice, event.block.timestamp)
    snapshot.baseApr = pool.baseApr
  }

  snapshot.tvl = pool.tvl
  snapshot.withdrawalCount = snapshot.withdrawalCount.plus(BIG_INT_ONE)
  snapshot.withdrawalVolume = snapshot.withdrawalVolume.plus(event.params.amount)
  snapshot.withdrawalValue = snapshot.withdrawalValue.plus(event.params.amount.toBigDecimal().times(lpPrice))

  pool.save()
  snapshot.save()
}

export function handleDeposited(event: DepositedEvent): void {
  const deposit = new Deposit(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
  deposit.user = event.params.user.toHexString()
  deposit.poolid = event.params.poolid.toString()
  deposit.amount = event.params.amount
  deposit.timestamp = event.block.timestamp
  deposit.save()

  const pool = getPool(deposit.poolid)
  pool.lpTokenBalance = pool.lpTokenBalance.plus(deposit.amount)

  const lpPrice = getLpTokenPriceUSD(pool)
  log.debug('LP Token price USD for pool {}: {}', [pool.name, lpPrice.toString()])
  pool.tvl = pool.lpTokenBalance.toBigDecimal().div(BIG_DECIMAL_1E18).times(lpPrice)

  // TODO: can be replaced by getHourlyPoolSnapshot to DRY once AssemblyScript
  // supports tuples as return values
  const time = getIntervalFromTimestamp(event.block.timestamp, HOUR)
  const snapId = pool.name + '-' + deposit.poolid.toString() + '-' + time.toString()
  let snapshot = HourlyPoolSnapshot.load(snapId)

  // we only do call-heavy calculations once upon snapshot creation
  if (!snapshot) {
    snapshot = new HourlyPoolSnapshot(snapId)
    snapshot.poolid = event.params.poolid.toString()
    snapshot.poolName = pool.name
    snapshot.timestamp = event.block.timestamp
    const aprs = getPoolApr(pool, event.block.timestamp)
    pool.crvApr = aprs[0]
    pool.cvxApr = aprs[1]
    pool.extraRewardsApr = aprs[2]
    snapshot.lpTokenVirtualPrice = getLpTokenVirtualPrice(pool.lpToken)
    snapshot.crvApr = pool.crvApr
    snapshot.cvxApr = pool.cvxApr
    snapshot.extraRewardsApr = pool.extraRewardsApr
    snapshot.lpTokenBalance = pool.lpTokenBalance

    pool.baseApr = getPoolBaseApr(pool, snapshot.lpTokenVirtualPrice, event.block.timestamp)
    snapshot.baseApr = pool.baseApr
  }

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
