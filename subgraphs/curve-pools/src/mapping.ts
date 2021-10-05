import {
  Deposited as DepositedEvent,
  Withdrawn as WithdrawnEvent,
  AddPoolCall,
  Booster,
  ShutdownPoolCall,
} from '../generated/Booster/Booster'
import { Deposit, Withdrawal } from '../generated/schema'
import { getDailyPoolSnapshot, getPool, getPoolApr, getPoolCoins } from './services/pools'
import { ASSET_TYPES, BIG_DECIMAL_1E18, BIG_INT_ONE, BOOSTER_ADDRESS, CURVE_REGISTRY, FOREX_ORACLES } from 'const'
import { CurveRegistry } from '../generated/Booster/CurveRegistry'
import { ERC20 } from '../generated/Booster/ERC20'
import { getLpTokenPriceUSD, getLpTokenVirtualPrice, getPoolBaseApr } from './services/apr'
import { log } from '@graphprotocol/graph-ts'

export function handleAddPool(call: AddPoolCall): void {
  const booster = Booster.bind(BOOSTER_ADDRESS)
  const curveRegistry = CurveRegistry.bind(CURVE_REGISTRY)
  const pid = booster.poolLength().minus(BIG_INT_ONE)
  const poolInfo = booster.try_poolInfo(pid)
  const pool = getPool(pid)
  if (!poolInfo.reverted) {
    pool.crvRewardsPool = poolInfo.value.value3
    pool.stash = poolInfo.value.value4
  }
  const lpToken = call.inputs._lptoken
  pool.lpToken = lpToken
  let swap = lpToken
  if (FOREX_ORACLES.has(lpToken.toHexString())) {
    pool.swap = lpToken
    const lpTokenContract = ERC20.bind(lpToken)
    const lpTokenNameResult = lpTokenContract.try_name()
    pool.name = lpTokenNameResult.reverted ? '' : lpTokenNameResult.value
  } else {
    swap = curveRegistry.get_pool_from_lp_token(call.inputs._lptoken)
    pool.swap = swap
    pool.name = curveRegistry.get_pool_name(swap)
  }
  getPoolCoins(pool)
  log.info('New pool added {} at block {}', [pool.name, call.block.number.toString()])
  pool.assetType = ASSET_TYPES.has(swap.toHexString()) ? ASSET_TYPES.get(swap.toHexString()) : 0
  pool.gauge = call.inputs._gauge
  pool.stashVersion = call.inputs._stashVersion
  pool.active = true
  pool.creationDate = call.block.timestamp
  pool.save()
}

export function handleShutdownPool(call: ShutdownPoolCall): void {
  const pool = getPool(call.inputs._pid)
  pool.active = false
  pool.save()
}

export function handleWithdrawn(event: WithdrawnEvent): void {
  const withdrawal = new Withdrawal(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
  withdrawal.user = event.params.user
  withdrawal.poolid = event.params.poolid
  withdrawal.amount = event.params.amount
  withdrawal.timestamp = event.block.timestamp
  withdrawal.save()

  const pool = getPool(withdrawal.poolid)
  pool.lpTokenBalance = pool.lpTokenBalance.minus(withdrawal.amount)
  const lpPrice = getLpTokenPriceUSD(pool)
  pool.tvl = pool.lpTokenBalance.toBigDecimal().div(BIG_DECIMAL_1E18).times(lpPrice)
  pool.apr = getPoolApr(pool)

  const snapshot = getDailyPoolSnapshot(withdrawal.poolid, pool.name, event.block.timestamp)
  snapshot.withdrawalCount = snapshot.withdrawalCount.plus(BIG_INT_ONE)
  snapshot.withdrawalVolume = snapshot.withdrawalVolume.plus(event.params.amount)
  snapshot.withdrawalValue = snapshot.withdrawalValue.plus(event.params.amount.toBigDecimal().times(lpPrice))
  snapshot.lpTokenVirtualPrice = getLpTokenVirtualPrice(pool.lpToken)
  snapshot.tvl = pool.tvl
  snapshot.lpTokenBalance = pool.lpTokenBalance
  snapshot.apr = pool.apr

  pool.baseApr = getPoolBaseApr(pool, snapshot.lpTokenVirtualPrice, event.block.timestamp)
  snapshot.baseApr = pool.baseApr

  pool.save()
  snapshot.save()
}

export function handleDeposited(event: DepositedEvent): void {
  const deposit = new Deposit(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
  deposit.user = event.params.user
  deposit.poolid = event.params.poolid
  deposit.amount = event.params.amount
  deposit.timestamp = event.block.timestamp
  deposit.save()

  const pool = getPool(deposit.poolid)
  pool.lpTokenBalance = pool.lpTokenBalance.plus(deposit.amount)
  const lpPrice = getLpTokenPriceUSD(pool)
  log.debug('LP Token price USD for pool {}: {}', [pool.name, lpPrice.toString()])
  pool.tvl = pool.lpTokenBalance.toBigDecimal().div(BIG_DECIMAL_1E18).times(lpPrice)
  pool.apr = getPoolApr(pool)

  const snapshot = getDailyPoolSnapshot(deposit.poolid, pool.name, event.block.timestamp)
  snapshot.depositCount = snapshot.depositCount.plus(BIG_INT_ONE)
  snapshot.depositVolume = snapshot.depositVolume.plus(event.params.amount)
  snapshot.depositValue = snapshot.depositValue.plus(event.params.amount.toBigDecimal().times(lpPrice))
  snapshot.lpTokenVirtualPrice = getLpTokenVirtualPrice(pool.lpToken)
  snapshot.tvl = pool.tvl
  snapshot.apr = pool.apr
  snapshot.lpTokenBalance = pool.lpTokenBalance

  pool.baseApr = getPoolBaseApr(pool, snapshot.lpTokenVirtualPrice, event.block.timestamp)
  snapshot.baseApr = pool.baseApr

  pool.save()
  snapshot.save()
}
