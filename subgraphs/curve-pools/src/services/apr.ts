import { Address, BigDecimal, BigInt, Bytes, log } from '@graphprotocol/graph-ts'
import { bytesToAddress } from 'utils'
import { CurveRegistry } from '../../generated/Booster/CurveRegistry'
import {
  BIG_DECIMAL_1E18,
  BIG_DECIMAL_ZERO,
  BIG_INT_ZERO,
  CURVE_REGISTRY,
  CVX_CLIFF_COUNT,
  CVX_CLIFF_SIZE,
  CVX_MAX_SUPPLY,
  CVX_ADDRESS,
  FOREX_ORACLES,
  LINK_ADDRESS,
  LINK_LP_TOKEN_ADDRESS,
  WBTC_ADDRESS,
  WETH_ADDRESS,
  BIG_DECIMAL_1E8,
  V2_POOL_ADDRESSES,
  BIG_DECIMAL_ONE,
  USDT_ADDRESS,
} from 'const'

import { ERC20 } from '../../generated/Booster/ERC20'
import { getBTCRate, getEthRate, getTokenAValueInTokenB, getUSDRate } from '../../../../packages/utils/pricing'
import { ChainlinkAggregator } from '../../generated/Booster/ChainlinkAggregator'
import { Pool } from '../../generated/schema'
import { exponentToBigDecimal } from '../../../../packages/utils/maths'
import { getDailyPoolSnapshot } from './pools'
import { DAY } from '../../../../packages/utils/time'

export function getV2LpTokenPrice(pool: Pool): BigDecimal {
  const lpToken = bytesToAddress(pool.lpToken)
  const tokenContract = ERC20.bind(lpToken)
  const supplyResult = tokenContract.try_totalSupply()
  const supply = supplyResult.reverted ? BIG_INT_ZERO : supplyResult.value
  let total = BIG_DECIMAL_ZERO
  for (let i = 0; i < pool.coins.length; ++i) {
    const currentCoin = bytesToAddress(pool.coins[i])
    const coinContract = ERC20.bind(currentCoin)
    const balanceResult = coinContract.try_balanceOf(lpToken)
    const decimalsResult = coinContract.try_decimals()
    let balance = balanceResult.reverted ? BIG_DECIMAL_ZERO : balanceResult.value.toBigDecimal()
    const decimals = decimalsResult.reverted ? BigInt.fromI32(18) : BigInt.fromI32(decimalsResult.value)
    balance = balance.div(exponentToBigDecimal(decimals))
    let price = BIG_DECIMAL_ONE
    switch (pool.assetType) {
      default:
        price = getUSDRate(currentCoin)
        break
      case 1:
        price = getEthRate(currentCoin)
        break
      case 2:
        price = getBTCRate(currentCoin)
        break
    }
    total = total.plus(price.times(balance))
  }
  const value = total.div(supply.toBigDecimal())
  return value
}

export function getForexUsdRate(lpToken: Bytes): BigDecimal {
  // returns the amount of USD 1 unit of the foreign currency is worth
  const priceOracle = ChainlinkAggregator.bind(FOREX_ORACLES[lpToken.toHexString()])
  const conversionRateReponse = priceOracle.try_latestAnswer()
  const conversionRate = conversionRateReponse.reverted
    ? BIG_DECIMAL_ONE
    : conversionRateReponse.value.toBigDecimal().div(BIG_DECIMAL_1E8)
  log.debug('Answer from Forex oracle {} for token {}: {}', [FOREX_ORACLES[lpToken.toHexString()].toHexString(), lpToken.toHexString(), conversionRate.toString()])
  return conversionRate
}

export function getTokenValueInLpUnderlyingToken(token: Address, lpToken: Address): BigDecimal {
  if (lpToken == LINK_LP_TOKEN_ADDRESS) {
    return getTokenAValueInTokenB(token, LINK_ADDRESS)
  }
  return BIG_DECIMAL_ONE
}

export function getLpUnderlyingTokenValueInOtherToken(lpToken: Address, token: Address): BigDecimal {
  return BIG_DECIMAL_ONE.div(getTokenValueInLpUnderlyingToken(token, lpToken))
}

export function getLpTokenVirtualPrice(lpToken: Bytes): BigDecimal {
  const lpTokenAddress = bytesToAddress(lpToken)
  const curveRegistry = CurveRegistry.bind(CURVE_REGISTRY)
  const vPriceCallResult = curveRegistry.try_get_virtual_price_from_lp_token(lpTokenAddress)
  const vPrice = vPriceCallResult.reverted
    ? BIG_DECIMAL_ZERO
    : vPriceCallResult.value.toBigDecimal().div(BIG_DECIMAL_1E18)
  return vPrice
}

export function getPoolBaseApr(pool: Pool, currentVirtualPrice: BigDecimal, timestamp: BigInt): BigDecimal {
  const previousDaySnapshot = getDailyPoolSnapshot(BigInt.fromString(pool.id), pool.name, timestamp.minus(DAY))
  const previousDayVPrice = previousDaySnapshot.lpTokenVirtualPrice
  const baseApr =
    previousDayVPrice == BIG_DECIMAL_ZERO
      ? BIG_DECIMAL_ZERO
      : currentVirtualPrice.minus(previousDayVPrice).div(previousDayVPrice).times(BigDecimal.fromString('365'))
  return baseApr
}

export function getLpTokenPriceUSD(pool: Pool): BigDecimal {
  const lpTokenAddress = bytesToAddress(pool.lpToken)
  const vPrice = getLpTokenVirtualPrice(pool.lpToken)
  // TODO : check how to determine v1/v2 pool on-chain
  if (V2_POOL_ADDRESSES.includes(lpTokenAddress)) {
    return getV2LpTokenPrice(pool)
  }
  if (FOREX_ORACLES.has(pool.lpToken.toHexString())) {
    return vPrice.times(getForexUsdRate(pool.lpToken))
  }
  switch (pool.assetType) {
    default:
      // USD
      return vPrice
    case 1: // ETH
      return vPrice.times(getUSDRate(WETH_ADDRESS))
    case 2: // BTC
      return vPrice.times(getUSDRate(WBTC_ADDRESS))
    case 3:
      return vPrice.times(getLpUnderlyingTokenValueInOtherToken(lpTokenAddress, USDT_ADDRESS)) //quoteInSpecifiedToken(USDT_ADDRESS, pool.lpToken).times(exponentToBigDecimal(BigInt.fromI32(12))))
  }
}

export function getCvxMintAmount(crvEarned: BigDecimal): BigDecimal {
  const cvxSupplyResult = ERC20.bind(CVX_ADDRESS).try_totalSupply()
  if (!cvxSupplyResult.reverted) {
    const cvxSupply = cvxSupplyResult.value.toBigDecimal().div(BIG_DECIMAL_1E18)
    const currentCliff = cvxSupply.div(CVX_CLIFF_SIZE)
    if (currentCliff.lt(CVX_CLIFF_COUNT)) {
      const remaining = CVX_CLIFF_COUNT.minus(currentCliff)
      let cvxEarned = crvEarned.times(remaining).div(CVX_CLIFF_COUNT)
      const amountTillMax = CVX_MAX_SUPPLY.minus(cvxSupply)
      if (cvxEarned.gt(amountTillMax)) {
        cvxEarned = amountTillMax
      }
      return cvxEarned
    }
  }
  return BIG_DECIMAL_ZERO
}
