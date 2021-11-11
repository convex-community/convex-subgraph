import { Pool } from '../../generated/schema'
import { Address, BigDecimal, BigInt, Bytes, log } from '@graphprotocol/graph-ts/index'
import { bytesToAddress } from 'utils'
import { ERC20 } from '../../../curve-pools/generated/Booster/ERC20'
import {
  BIG_DECIMAL_1E18,
  BIG_DECIMAL_1E8,
  BIG_DECIMAL_ONE,
  BIG_DECIMAL_ZERO,
  CRV_ADDRESS,
  CURVE_REGISTRY,
  CVX_CRV_LP_TOKEN,
  FOREX_ORACLES,
  LINK_ADDRESS,
  LINK_LP_TOKEN_ADDRESS,
  USDT_ADDRESS,
  V2_POOL_ADDRESSES,
  WBTC_ADDRESS,
  WETH_ADDRESS,
} from 'const'
import { exponentToBigDecimal } from 'utils/maths'
import { getBtcRate, getEthRate, getTokenAValueInTokenB, getUsdRate } from 'utils/pricing'
import { ChainlinkAggregator } from '../../../curve-pools/generated/Booster/ChainlinkAggregator'
import { CurveRegistry } from '../../../curve-pools/generated/Booster/CurveRegistry'
import { CurvePool } from '../../../curve-pools/generated/Booster/CurvePool'

export function getV2LpTokenPrice(pool: Pool): BigDecimal {
  const lpToken = bytesToAddress(pool.lpToken)
  const tokenContract = ERC20.bind(lpToken)
  const supplyResult = tokenContract.try_totalSupply()
  const supply = supplyResult.reverted ? BIG_DECIMAL_ZERO : supplyResult.value.toBigDecimal().div(BIG_DECIMAL_1E18)
  let total = BIG_DECIMAL_ZERO

  for (let i = 0; i < pool.coins.length; ++i) {
    const currentCoin = bytesToAddress(pool.coins[i])
    const coinContract = ERC20.bind(currentCoin)
    const balanceResult = coinContract.try_balanceOf(bytesToAddress(pool.swap))
    const decimalsResult = coinContract.try_decimals()
    let balance = balanceResult.reverted ? BIG_DECIMAL_ZERO : balanceResult.value.toBigDecimal()
    const decimals = decimalsResult.reverted ? BigInt.fromI32(18) : BigInt.fromI32(decimalsResult.value)
    balance = balance.div(exponentToBigDecimal(decimals))
    let price = BIG_DECIMAL_ONE
    switch (pool.assetType) {
      default:
        price = getUsdRate(currentCoin)
        break
      case 1:
        price = getEthRate(currentCoin)
        break
      case 2:
        price = getBtcRate(currentCoin)
        break
    }
    total = total.plus(price.times(balance))
  }
  const value = supply == BIG_DECIMAL_ZERO ? BIG_DECIMAL_ZERO : total.div(supply)
  return value
}

export function getForexUsdRate(lpToken: Bytes): BigDecimal {
  // returns the amount of USD 1 unit of the foreign currency is worth
  const priceOracle = ChainlinkAggregator.bind(FOREX_ORACLES[lpToken.toHexString()])
  const conversionRateReponse = priceOracle.try_latestAnswer()
  const conversionRate = conversionRateReponse.reverted
    ? BIG_DECIMAL_ONE
    : conversionRateReponse.value.toBigDecimal().div(BIG_DECIMAL_1E8)
  log.debug('Answer from Forex oracle {} for token {}: {}', [
    FOREX_ORACLES[lpToken.toHexString()].toHexString(),
    lpToken.toHexString(),
    conversionRate.toString(),
  ])
  return conversionRate
}

export function getTokenValueInLpUnderlyingToken(token: Address, lpToken: Address): BigDecimal {
  if (lpToken == LINK_LP_TOKEN_ADDRESS) {
    return getTokenAValueInTokenB(token, LINK_ADDRESS)
  } else if (lpToken == Address.fromString(CVX_CRV_LP_TOKEN)) {
    return getTokenAValueInTokenB(token, CRV_ADDRESS)
  }
  return BIG_DECIMAL_ONE
}

export function getLpUnderlyingTokenValueInOtherToken(lpToken: Address, token: Address): BigDecimal {
  return BIG_DECIMAL_ONE.div(getTokenValueInLpUnderlyingToken(token, lpToken))
}

export function getLpTokenVirtualPrice(lpToken: Bytes): BigDecimal {
  const lpTokenAddress = bytesToAddress(lpToken)
  const curveRegistry = CurveRegistry.bind(CURVE_REGISTRY)
  let vPriceCallResult = curveRegistry.try_get_virtual_price_from_lp_token(lpTokenAddress)
  let vPrice = BIG_DECIMAL_ZERO
  if (!vPriceCallResult.reverted) {
    log.debug('Virtual price from registry for {} : {}', [lpToken.toHexString(), vPriceCallResult.value.toString()])
    vPrice = vPriceCallResult.value.toBigDecimal().div(BIG_DECIMAL_1E18)
  }
  // most likely for when factory pools are not included in the registry
  else {
    log.debug('Failed to fetch virtual price from registry for {}', [lpToken.toHexString()])
    const lpTokenContract = CurvePool.bind(lpTokenAddress)
    vPriceCallResult = lpTokenContract.try_get_virtual_price()
    vPrice = !vPriceCallResult.reverted ? vPriceCallResult.value.toBigDecimal().div(BIG_DECIMAL_1E18) : vPrice
  }
  return vPrice
}

export function getLpTokenPriceUSD(pool: Pool): BigDecimal {
  const lpTokenAddress = bytesToAddress(pool.lpToken)
  const vPrice = getLpTokenVirtualPrice(pool.lpToken)
  // TODO : check how to determine v1/v2 pool on-chain
  if (V2_POOL_ADDRESSES.includes(lpTokenAddress)) {
    // TODO: this will break for v2 pools whose currency is NOT usd
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
      return vPrice.times(getUsdRate(WETH_ADDRESS))
    case 2: // BTC
      return vPrice.times(getUsdRate(WBTC_ADDRESS))
    case 3:
      return vPrice.times(getLpUnderlyingTokenValueInOtherToken(lpTokenAddress, USDT_ADDRESS)) //quoteInSpecifiedToken(USDT_ADDRESS, pool.lpToken).times(exponentToBigDecimal(BigInt.fromI32(12))))
  }
}
