import { Address, BigDecimal, BigInt, Bytes, log } from '@graphprotocol/graph-ts'
import { Pool, DailyPoolSnapshot, ExtraReward } from '../../generated/schema'
import { BaseRewardPool } from '../../generated/Booster/BaseRewardPool'
import { bytesToAddress } from 'utils'
import {
  ADDRESS_ZERO,
  BIG_DECIMAL_1E18,
  BIG_DECIMAL_ONE,
  BIG_DECIMAL_ZERO,
  BIG_INT_MINUS_ONE,
  BIG_INT_ONE,
  BIG_INT_ZERO, CONVEX_PLATFORM_ID,
  CRV_ADDRESS,
  CVX_ADDRESS,
} from 'const'
import { getUsdRate } from 'utils/pricing'
import { CurvePool } from '../../generated/Booster/CurvePool'
import { getCvxMintAmount } from 'utils/convex'
import { ExtraRewardStashV2 } from '../../generated/Booster/ExtraRewardStashV2'
import { ExtraRewardStashV1 } from '../../generated/Booster/ExtraRewardStashV1'
import { VirtualBalanceRewardPool } from '../../generated/Booster/VirtualBalanceRewardPool'
import { ExtraRewardStashV32 } from '../../generated/Booster/ExtraRewardStashV32'
import { ExtraRewardStashV30 } from '../../generated/Booster/ExtraRewardStashV30'
import { ERC20 } from '../../generated/Booster/ERC20'
import { CurvePoolV2 } from '../../generated/Booster/CurvePoolV2'
import { ExtraRewardStashV33 } from '../../generated/Booster/ExtraRewardStashV33'

export function getPool(pid: string): Pool {
  let pool = Pool.load(pid)
  if (!pool) {
    pool = createNewPool(BigInt.fromString(pid))
  }
  return pool
}

export function createNewPool(pid: BigInt): Pool {
  const pool = new Pool(pid.toString())
  pool.poolid = pid
  pool.platform = CONVEX_PLATFORM_ID
  pool.name = ''
  pool.lpToken = Address.zero()
  pool.lpTokenBalance = BigInt.zero()
  pool.lpTokenUSDPrice = BigDecimal.zero()
  pool.token = Address.zero()
  pool.gauge = Address.zero()
  pool.crvRewardsPool = Address.zero()
  pool.swap = Address.zero()
  pool.stash = Address.zero()
  pool.stashVersion = BigInt.zero()
  pool.stashMinorVersion = BigInt.zero()
  pool.active = true
  pool.isV2 = false
  pool.isLending = false
  pool.creationBlock = BigInt.zero()
  pool.creationDate = BigInt.zero()
  pool.tvl = BigDecimal.zero()
  pool.crvApr = BigDecimal.zero()
  pool.curveTvlRatio = BigDecimal.zero()
  pool.cvxApr = BigDecimal.zero()
  pool.extraRewardsApr = BigDecimal.zero()
  pool.baseApr = BigDecimal.zero()
  pool.rawBaseApr = BigDecimal.zero()
  pool.assetType = 0
  pool.coins = []
  pool.extras = []
  pool.save()
  return pool
}

export function getPoolCoins(pool: Pool): void {
  const curvePool = CurvePool.bind(bytesToAddress(pool.swap))
  let i = 0
  const coins = pool.coins
  let coinResult = curvePool.try_coins(BigInt.fromI32(i))
  while (!coinResult.reverted) {
    coins.push(coinResult.value)
    i += 1
    coinResult = curvePool.try_coins(BigInt.fromI32(i))
  }
  pool.coins = coins
  pool.save()
}

export function getPoolExtras(pool: Pool): void {
  switch (pool.stashVersion.toI32()) {
    case 1:
      getPoolExtrasV1(pool)
      break
    case 2:
      getPoolExtrasV2(pool)
      break
    case 3:
      getPoolExtrasV3(pool)
      break
  }
}

export function createNewExtraReward(poolid: BigInt, rewardContract: Address, rewardToken: Address): string {
  const extraRewardId = poolid.toString() + rewardContract.toHexString() + rewardToken.toHexString()
  const extraReward = new ExtraReward(extraRewardId)
  extraReward.poolid = poolid.toString()
  extraReward.contract = rewardContract
  extraReward.token = rewardToken
  extraReward.save()
  return extraRewardId
}

export function getPoolExtrasV1(pool: Pool): void {
  // rewards already set
  if (pool.extras.length > 0) {
    return
  }
  const stashContract = ExtraRewardStashV1.bind(bytesToAddress(pool.stash))
  const tokenInfoResult = stashContract.try_tokenInfo()
  if (tokenInfoResult.reverted) {
    log.warning('Failed to get token info for {}', [pool.stash.toHexString()])
    return
  }
  const rewardToken = tokenInfoResult.value.value0
  const rewardContract = tokenInfoResult.value.value1
  if (rewardToken != ADDRESS_ZERO || rewardContract != ADDRESS_ZERO) {
    const extras = pool.extras
    extras.push(createNewExtraReward(pool.poolid, rewardContract, rewardToken))
    pool.extras = extras
    pool.save()
  }
}

export function getPoolExtrasV2(pool: Pool): void {
  const stashContract = ExtraRewardStashV2.bind(bytesToAddress(pool.stash))
  const tokenCountResult = stashContract.try_tokenCount()
  const tokenCount = tokenCountResult.reverted ? BigInt.fromI32(pool.extras.length) : tokenCountResult.value
  // we only add new rewards if tokenCount is different from what we already know
  for (let i = pool.extras.length; i < tokenCount.toI32(); i++) {
    const tokenInfoResult = stashContract.try_tokenInfo(BigInt.fromI32(i))
    if (tokenInfoResult.reverted) {
      log.warning('Failed to get token info for {}', [pool.stash.toHexString()])
      continue
    }
    const rewardToken = tokenInfoResult.value.value0
    const rewardContract = tokenInfoResult.value.value1
    if (rewardToken != ADDRESS_ZERO || rewardContract != ADDRESS_ZERO) {
      const extras = pool.extras
      extras.push(createNewExtraReward(pool.poolid, rewardContract, rewardToken))
      pool.extras = extras
      pool.save()
    }
  }
}

export function getPoolExtrasV30(pool: Pool): void {
  // TODO: DRY this by using common ABI for v3.0 & v2 since logic and methods
  // are the same
  const stashContract = ExtraRewardStashV30.bind(bytesToAddress(pool.stash))
  const tokenCountResult = stashContract.try_tokenCount()
  const tokenCount = tokenCountResult.reverted ? BigInt.fromI32(pool.extras.length) : tokenCountResult.value
  // we only add new rewards if tokenCount is different from what we already know
  for (let i = pool.extras.length; i < tokenCount.toI32(); i++) {
    const tokenInfoResult = stashContract.try_tokenInfo(BigInt.fromI32(i))
    if (tokenInfoResult.reverted) {
      log.warning('Failed to get token info for {}', [pool.stash.toHexString()])
      continue
    }
    const rewardToken = tokenInfoResult.value.value0
    const rewardContract = tokenInfoResult.value.value1
    if (rewardToken != ADDRESS_ZERO || rewardContract != ADDRESS_ZERO) {
      const extras = pool.extras
      extras.push(createNewExtraReward(pool.poolid, rewardContract, rewardToken))
      pool.extras = extras
      pool.save()
    }
  }
}

export function getPoolExtrasV33(pool: Pool): void {
  const stashContract = ExtraRewardStashV33.bind(bytesToAddress(pool.stash))
  const tokenCountResult = stashContract.try_tokenCount()
  const tokenCount = tokenCountResult.reverted ? BigInt.fromI32(pool.extras.length) : tokenCountResult.value
  // we only add new rewards if tokenCount is different from what we already know
  for (let i = pool.extras.length; i < tokenCount.toI32(); i++) {
    const tokenListResult = stashContract.try_tokenList(BigInt.fromI32(i))
    if (tokenListResult.reverted) {
      log.warning('Failed to get token list from {}', [pool.stash.toHexString()])
      continue
    }
    const tokenInfoResult = stashContract.try_tokenInfo(tokenListResult.value)
    if (tokenInfoResult.reverted) {
      log.warning('Failed to get token info for {}', [tokenListResult.value.toHexString()])
      continue
    }
    const rewardToken = tokenInfoResult.value.value0
    const rewardContract = tokenInfoResult.value.value1
    if (rewardToken != ADDRESS_ZERO || rewardContract != ADDRESS_ZERO) {
      const extras = pool.extras
      extras.push(createNewExtraReward(pool.poolid, rewardContract, rewardToken))
      pool.extras = extras
      pool.save()
    }
  }
}

export function getPoolExtrasV3(pool: Pool): void {
  const stashContract = ExtraRewardStashV32.bind(bytesToAddress(pool.stash))

  // determine what minor version of version 3 contracts we are using
  // if it hasn't been determined before.
  if (pool.stashMinorVersion == BIG_INT_MINUS_ONE) {
    const contractNameResult = stashContract.try_getName()
    if (!contractNameResult.reverted) {
      // Need to account for "ExtraRewardStashV3", "ExtraRewardStashV3.1" and "ExtraRewardStashV3.2"
      const suffix = contractNameResult.value.slice(
        contractNameResult.value.length - 2,
        contractNameResult.value.length
      )
      let minorVersion = 0
      if (suffix == '.1') {
        minorVersion = 1
      } else if (suffix == '.2') {
        minorVersion = 2
      } else if (suffix == '.3') {
        minorVersion = 3
      }
      pool.stashMinorVersion = BigInt.fromI32(minorVersion)
      pool.save()
    }
  }

  // we need separate functions even though it's repetitive
  // since we can't reassign stashContract to a different type
  if (pool.stashMinorVersion == BIG_INT_ZERO) {
    getPoolExtrasV30(pool)
    return
  }
  if (pool.stashMinorVersion == BigInt.fromI32(3)) {
    getPoolExtrasV33(pool)
    return
  }

  // v3.1 and v3.2 share the same ABI
  const tokenCountResult = stashContract.try_tokenCount()
  const tokenCount = tokenCountResult.reverted ? BigInt.fromI32(pool.extras.length) : tokenCountResult.value
  if (tokenCountResult.reverted) {
    log.warning('Failed to get token count for', [pool.stash.toHexString()])
  }
  for (let i = pool.extras.length; i < tokenCount.toI32(); i++) {
    const tokenListResult = stashContract.try_tokenList(BigInt.fromI32(i))
    if (tokenListResult.reverted) {
      log.warning('Failed to get token list from {}', [pool.stash.toHexString()])
      continue
    }
    const tokenInfoResult = stashContract.try_tokenInfo(tokenListResult.value)
    if (tokenInfoResult.reverted) {
      log.warning('Failed to get token info for {}', [tokenListResult.value.toHexString()])
      continue
    }
    const rewardToken = tokenInfoResult.value.value0
    const rewardContract = tokenInfoResult.value.value1
    if (rewardToken != ADDRESS_ZERO || rewardContract != ADDRESS_ZERO) {
      const extras = pool.extras
      extras.push(createNewExtraReward(pool.poolid, rewardContract, rewardToken))
      pool.extras = extras
      pool.save()
    }
  }
}

export function getLpTokenSupply(lpToken: Bytes): BigInt {
  const lpTokenAddress = bytesToAddress(lpToken)
  const lpTokenSupplyResult = ERC20.bind(lpTokenAddress).try_totalSupply()
  let totalSupply = BIG_INT_ZERO
  if (lpTokenSupplyResult.reverted) {
    log.warning('Failed to fetch total supply for LP Token {}', [lpTokenAddress.toHexString()])
  } else {
    totalSupply = lpTokenSupplyResult.value
  }
  return totalSupply
}

export function getXcpProfitResult(pool: Pool): Array<BigDecimal> {
  const poolContract = CurvePoolV2.bind(bytesToAddress(pool.swap))
  const xcpProfitResult = poolContract.try_xcp_profit()
  const xcpProfitAResult = poolContract.try_xcp_profit_a()
  const xcpProfit = xcpProfitResult.reverted ? BIG_DECIMAL_ZERO : xcpProfitResult.value.toBigDecimal()
  const xcpProfitA = xcpProfitAResult.reverted ? BIG_DECIMAL_ZERO : xcpProfitAResult.value.toBigDecimal()
  return [xcpProfit, xcpProfitA]
}

export function getPoolApr(pool: Pool, timestamp: BigInt, vPrice: BigDecimal): Array<BigDecimal> {
  const rewardContract = BaseRewardPool.bind(bytesToAddress(pool.crvRewardsPool))
  const finishPeriodResult = rewardContract.try_periodFinish()
  const finishPeriod = finishPeriodResult.reverted ? timestamp.plus(BIG_INT_ONE) : finishPeriodResult.value
  const supplyResult = rewardContract.try_totalSupply()
  const supply = supplyResult.reverted ? BIG_DECIMAL_ZERO : supplyResult.value.toBigDecimal().div(BIG_DECIMAL_1E18)
  const virtualSupply = supply.times(vPrice)
  const exchangeRate = BIG_DECIMAL_ONE

  const crvPrice = getUsdRate(CRV_ADDRESS)
  const cvxPrice = getUsdRate(CVX_ADDRESS)
  log.warning('CRV {} Price {} Asset type {}', [pool.name, crvPrice.toString(), pool.assetType.toString()])

  let crvApr = BIG_DECIMAL_ZERO
  let cvxApr = BIG_DECIMAL_ZERO
  if (timestamp < finishPeriod) {
    // TODO: getSupply function also to be used in CVXMint to DRY

    const rateResult = rewardContract.try_rewardRate()
    const rate = rateResult.reverted ? BIG_DECIMAL_ZERO : rateResult.value.toBigDecimal().div(BIG_DECIMAL_1E18)
    if (rateResult.reverted) {
      log.warning('Failed to get CRV reward rate for {}', [pool.crvRewardsPool.toHexString()])
    }
    let crvPerUnderlying = BIG_DECIMAL_ZERO
    if (virtualSupply.gt(BIG_DECIMAL_ZERO)) {
      crvPerUnderlying = rate.div(virtualSupply)
    }

    const crvPerYear = crvPerUnderlying.times(BigDecimal.fromString('31536000'))
    const cvxPerYear = getCvxMintAmount(crvPerYear)

    crvApr = crvPerYear.times(crvPrice)
    cvxApr = cvxPerYear.times(cvxPrice)
  }

  let extraRewardsApr = BIG_DECIMAL_ZERO
  // look for updates to extra rewards
  getPoolExtras(pool)
  log.debug('POOL EXTRAS {}: {}', [pool.name, pool.extras.length.toString()])
  for (let i = 0; i < pool.extras.length; i++) {
    const extra = ExtraReward.load(pool.extras[i])
    if (extra) {
      const rewardContractAddress = bytesToAddress(extra.contract)
      const rewardTokenAddress = bytesToAddress(extra.token)
      const rewardContract = VirtualBalanceRewardPool.bind(rewardContractAddress)
      const finishPeriodResult = rewardContract.try_periodFinish()
      const finishPeriod = finishPeriodResult.reverted ? timestamp.plus(BIG_INT_ONE) : finishPeriodResult.value
      if (timestamp >= finishPeriod) {
        continue
      }

      const rewardRateResult = rewardContract.try_rewardRate()
      const rewardRate = rewardRateResult.reverted
        ? BIG_DECIMAL_ZERO
        : rewardRateResult.value.toBigDecimal().div(BIG_DECIMAL_1E18)
      const perUnderlying = virtualSupply == BIG_DECIMAL_ZERO ? BIG_DECIMAL_ZERO : rewardRate.div(virtualSupply)
      const perYear = perUnderlying.times(BigDecimal.fromString('31536000')) // (86400 * 365))
      log.debug('Per underlying {}, rewardRate {}, vsupply {}', [
        perUnderlying.toString(),
        rewardRate.toString(),
        virtualSupply.toString(),
      ])
      const rewardTokenPrice = getUsdRate(rewardTokenAddress).div(exchangeRate)
      extraRewardsApr = extraRewardsApr.plus(rewardTokenPrice.times(perYear))
      log.debug('Extra rewards APR for token {}: {}', [rewardTokenAddress.toHexString(), rewardTokenPrice.toString()])
    }
  }
  return [crvApr, cvxApr, extraRewardsApr]
}
