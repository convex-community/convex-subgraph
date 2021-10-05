import { BigDecimal, BigInt, log } from '@graphprotocol/graph-ts'
import { Pool, DailyPoolSnapshot } from '../../generated/schema'
import { BaseRewardPool } from '../../generated/Booster/BaseRewardPool'
import { bytesToAddress } from 'utils'
import { BIG_DECIMAL_1E18, BIG_DECIMAL_ZERO, CRV_ADDRESS, CVX_ADDRESS, FOREX_ORACLES, WBTC_ADDRESS } from 'const'
import { getEthRate, getTokenAValueInTokenB, getUSDRate } from 'utils/pricing'
import { DAY, getIntervalFromTimestamp } from 'utils/time'
import { CurvePool } from '../../generated/Booster/CurvePool'
import { getCvxMintAmount, getForexUsdRate, getLpTokenVirtualPrice, getTokenValueInLpUnderlyingToken } from './apr'

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

export function getPoolApr(pool: Pool): BigDecimal {
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
    cvxPrice = exchangeRate != BIG_DECIMAL_ZERO ? getUSDRate(CVX_ADDRESS).div(exchangeRate) : getUSDRate(CVX_ADDRESS)
    crvPrice = exchangeRate != BIG_DECIMAL_ZERO ? getUSDRate(CRV_ADDRESS).div(exchangeRate) : getUSDRate(CVX_ADDRESS)
    log.debug('Forex CRV {} Price {}', [pool.name, crvPrice.toString()])
  } else if (pool.assetType == 0) {
    // USD
    cvxPrice = getUSDRate(CVX_ADDRESS)
    crvPrice = getUSDRate(CRV_ADDRESS)
  } else if (pool.assetType == 1) {
    // ETH
    cvxPrice = getEthRate(CVX_ADDRESS)
    crvPrice = getEthRate(CRV_ADDRESS)
    log.debug('{}: CRV ETH Price {}', [pool.name, crvPrice.toString()])
  } else if (pool.assetType == 2) {
    // BTC
    cvxPrice = getTokenAValueInTokenB(CVX_ADDRESS, WBTC_ADDRESS)
    crvPrice = getTokenAValueInTokenB(CRV_ADDRESS, WBTC_ADDRESS)
    log.debug('{}: CRV BTC Price {}', [pool.name, crvPrice.toString()])
  } else {
    // Other
    const lpTokenAddress = bytesToAddress(pool.lpToken)
    cvxPrice = getTokenValueInLpUnderlyingToken(CVX_ADDRESS, lpTokenAddress)
    crvPrice = getTokenValueInLpUnderlyingToken(CRV_ADDRESS, lpTokenAddress)
    log.debug('CRV {} Price {}', [pool.name, crvPrice.toString()])
  }
  let apr = crvPerYear.times(crvPrice)
  apr = apr.plus(cvxPerYear.times(cvxPrice))
  // TODO: add extra token rewards
  return apr
}
