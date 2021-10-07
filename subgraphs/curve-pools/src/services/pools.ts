import { Address, BigDecimal, BigInt, log } from '@graphprotocol/graph-ts'
import { Pool, DailyPoolSnapshot, ExtraReward } from '../../generated/schema'
import { BaseRewardPool } from '../../generated/Booster/BaseRewardPool'
import { bytesToAddress } from 'utils'
import {
  ADDRESS_ZERO,
  BIG_DECIMAL_1E18, BIG_DECIMAL_ONE,
  BIG_DECIMAL_ZERO,
  BIG_INT_ZERO,
  CRV_ADDRESS,
  CVX_ADDRESS,
  FOREX_ORACLES,
  WBTC_ADDRESS
} from 'const'
import {
  getBtcRate,
  getEthRate,
  getTokenAValueInTokenB,
  getUsdRate
} from 'utils/pricing'
import { DAY, getIntervalFromTimestamp } from 'utils/time'
import { CurvePool } from '../../generated/Booster/CurvePool'
import { getCvxMintAmount, getForexUsdRate, getLpTokenVirtualPrice, getTokenValueInLpUnderlyingToken } from './apr'
import { ExtraRewardStash } from '../../generated/Booster/ExtraRewardStash'
import { ExtraRewardStashV3 } from '../../generated/Booster/ExtraRewardStashV3'
import { ExtraRewardStashV2 } from '../../generated/Booster/ExtraRewardStashV2'
import { ExtraRewardStashV1 } from '../../generated/Booster/ExtraRewardStashV1'
import { VirtualBalanceRewardPool } from '../../generated/Booster/VirtualBalanceRewardPool'

export function getPool(pid: BigInt): Pool {
  let pool = Pool.load(pid.toString())
  if (!pool) {
    pool = new Pool(pid.toString())
  }
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

export function getDailyPoolSnapshot(poolid: BigInt, name: string, timestamp: BigInt): DailyPoolSnapshot {
  const day = getIntervalFromTimestamp(timestamp, DAY)
  const snapId = name + '-' + poolid.toString() + '-' + day.toString()
  let dailySnapshot = DailyPoolSnapshot.load(snapId)
  if (!dailySnapshot) {
    dailySnapshot = new DailyPoolSnapshot(snapId)
    dailySnapshot.poolid = poolid
    dailySnapshot.poolName = name.toString()
    dailySnapshot.timestamp = day
  }
  return dailySnapshot
}

export function getExtraReward(id: string): ExtraReward {
  let extraReward = ExtraReward.load(id)
  if (!extraReward) {
    extraReward = new ExtraReward(id)
  }
  return extraReward
}

export function getPoolExtras(pool: Pool): void {
  switch(pool.stashVersion.toI32()){
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
  extraReward.poolid = poolid
  extraReward.contract = rewardContract
  extraReward.token = rewardToken
  extraReward.save()
  return extraRewardId
}

export function getPoolExtrasV1(pool: Pool): void {
  const stashContract = ExtraRewardStashV1.bind(bytesToAddress(pool.stash))
  const tokenInfoResult = stashContract.try_tokenInfo()
  if (tokenInfoResult.reverted) {
    return
  }
  const rewardToken = tokenInfoResult.value.value0
  const rewardContract = tokenInfoResult.value.value1
  if (rewardToken != ADDRESS_ZERO || rewardContract != ADDRESS_ZERO) {
    let extras = pool.extras
    extras.push(createNewExtraReward(pool.poolid, rewardContract, rewardToken))
    pool.extras = extras
    pool.save()
  }
}

export function getPoolExtrasV2(pool: Pool): void {
  const stashContract = ExtraRewardStashV2.bind(bytesToAddress(pool.stash))
  const tokenCountResult = stashContract.try_tokenCount()
  const tokenCount = tokenCountResult.reverted ? BigInt.fromI32(pool.extras.length) : tokenCountResult.value
  for (let i = pool.extras.length; i < tokenCount.toI32(); i++) {
    const tokenInfoResult = stashContract.try_tokenInfo(BigInt.fromI32(i))
    if (tokenInfoResult.reverted) {
      continue
    }
    const rewardToken = tokenInfoResult.value.value0
    const rewardContract = tokenInfoResult.value.value1
    if (rewardToken != ADDRESS_ZERO || rewardContract != ADDRESS_ZERO) {
      let extras = pool.extras
      extras.push(createNewExtraReward(pool.poolid, rewardContract, rewardToken))
      pool.extras = extras
      pool.save()
    }
  }
}

export function getPoolExtrasV3(pool: Pool): void {
  const stashContract = ExtraRewardStashV3.bind(bytesToAddress(pool.stash))
  const tokenCountResult = stashContract.try_tokenCount()
  const tokenCount = tokenCountResult.reverted ? BigInt.fromI32(pool.extras.length) : tokenCountResult.value

  for (let i = pool.extras.length; i < tokenCount.toI32(); i++) {
    const tokenListResult = stashContract.try_tokenList(BigInt.fromI32(i))
    if (tokenListResult.reverted) {
      continue
    }
    const tokenInfoResult = stashContract.try_tokenInfo(tokenListResult.value)
    if (tokenInfoResult.reverted) {
      continue
    }
    const rewardToken = tokenInfoResult.value.value0
    const rewardContract = tokenInfoResult.value.value1
    if (rewardToken != ADDRESS_ZERO || rewardContract != ADDRESS_ZERO) {
      let extras = pool.extras
      extras.push(createNewExtraReward(pool.poolid, rewardContract, rewardToken))
      pool.extras = extras
      pool.save()
    }
  }
}

export function getTokenPriceForAssetType(token: Address, pool: Pool): BigDecimal {
  if ((pool.assetType == 0) || (pool.assetType == 4)) { // USD
    return getUsdRate(token)
  }
  else if (pool.assetType == 1) { // ETH
    return getEthRate(token)
  }
  else if (pool.assetType == 2) { // BTC
    return getBtcRate(token)
  }
  else { // Other
    return getTokenValueInLpUnderlyingToken(CVX_ADDRESS, bytesToAddress(pool.lpToken))
  }
}

export function getPoolApr(pool: Pool): Array<BigDecimal> {
  const vPrice = getLpTokenVirtualPrice(pool.lpToken)
  const rewardContract = BaseRewardPool.bind(bytesToAddress(pool.crvRewardsPool))
  // TODO: getSupply function also to be used in CVXMint to DRY
  const supplyResult = rewardContract.try_totalSupply()
  const supply = supplyResult.reverted ? BIG_DECIMAL_ZERO : supplyResult.value.toBigDecimal().div(BIG_DECIMAL_1E18)
  const virtualSupply = supply.times(vPrice)
  const rateResult = rewardContract.try_rewardRate()
  const rate = rateResult.reverted ? BIG_DECIMAL_ZERO : rateResult.value.toBigDecimal().div(BIG_DECIMAL_1E18)

  let crvPerUnderlying = BIG_DECIMAL_ZERO
  if (virtualSupply.gt(BIG_DECIMAL_ZERO)) {
    crvPerUnderlying = rate.div(virtualSupply)
  }

  const crvPerYear = crvPerUnderlying.times(BigDecimal.fromString('31536000'))
  const cvxPerYear = getCvxMintAmount(crvPerYear)

  let cvxPrice: BigDecimal, crvPrice: BigDecimal
  if (FOREX_ORACLES.has(pool.lpToken.toHexString())) {
    const exchangeRate = getForexUsdRate(pool.lpToken)
    cvxPrice = exchangeRate != BIG_DECIMAL_ZERO ? getUsdRate(CVX_ADDRESS).div(exchangeRate) : getUsdRate(CVX_ADDRESS)
    crvPrice = exchangeRate != BIG_DECIMAL_ZERO ? getUsdRate(CRV_ADDRESS).div(exchangeRate) : getUsdRate(CVX_ADDRESS)
    log.debug('Forex CRV {} Price {}', [pool.name, crvPrice.toString()])
  } else {
    cvxPrice = getTokenPriceForAssetType(CVX_ADDRESS, pool)
    crvPrice = getTokenPriceForAssetType(CRV_ADDRESS, pool)
    log.debug('CRV {} Price {} Asset type {}', [pool.name, crvPrice.toString(), pool.assetType.toString()])
  }
  const crvApr = crvPerYear.times(crvPrice)
  const cvxApr = cvxPerYear.times(cvxPrice)
  // TODO: add extra token rewards
  let extraRewardsApr = BIG_DECIMAL_ZERO
  // look for updates to extra rewards
  getPoolExtras(pool)
  log.warning("POOL EXTRAS {}", [pool.extras.length.toString()])
  for (let i = 0; i < pool.extras.length; i++) {
    const extra = ExtraReward.load(pool.extras[i])
    log.warning("EXTRA ID {}", [pool.extras[i]])
    if (extra) {
      const rewardContractAddress = bytesToAddress(extra.contract)
      const rewardTokenAddress = bytesToAddress(extra.token)
      const rewardContract = VirtualBalanceRewardPool.bind(rewardContractAddress)
      const rewardRateResult = rewardContract.try_rewardRate()
      const rewardRate = rewardRateResult.reverted ? BIG_DECIMAL_ZERO : rewardRateResult.value.toBigDecimal().div(BIG_DECIMAL_1E18)
      log.error("REWARD RATE POOL {} : {}", [pool.name, rewardRate.toString()])
      const perUnderlying = (virtualSupply == BIG_DECIMAL_ZERO) ? BIG_DECIMAL_ZERO : rewardRate.div(virtualSupply)
      const perYear = perUnderlying.times(BigDecimal.fromString("31536000")) // (86400 * 365))
      const rewardTokenPrice = getTokenPriceForAssetType(rewardTokenAddress, pool)
      log.warning("REWARD TOKEN PRICE {} : {}", [pool.name, rewardTokenPrice.toString()])
      extraRewardsApr = extraRewardsApr.plus(rewardTokenPrice.times(perYear))
      log.debug("Extra rewards APR for token {}: {}", [rewardTokenAddress.toHexString(), rewardTokenPrice.toString()])
    }
  }
  return [crvApr, cvxApr, extraRewardsApr]
}
