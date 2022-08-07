import { Address, BigDecimal, BigInt, ByteArray, Bytes, log } from '@graphprotocol/graph-ts'
import { bytesToAddress } from 'utils'
import { CurveRegistry } from '../../generated/Booster/CurveRegistry'
import {
  BIG_DECIMAL_1E18,
  BIG_DECIMAL_ZERO,
  CURVE_REGISTRY,
  FOREX_ORACLES,
  LINK_ADDRESS,
  LINK_LP_TOKEN_ADDRESS,
  WBTC_ADDRESS,
  WETH_ADDRESS,
  BIG_DECIMAL_1E8,
  BIG_DECIMAL_ONE,
  USDT_ADDRESS,
  CVX_CRV_LP_TOKEN,
  CRV_ADDRESS,
  EURT_ADDRESS,
  EUR_LP_TOKEN,
  EURS_ADDRESS,
  CURVE_ONLY_TOKENS,
  BIG_DECIMAL_TWO,
  BIG_INT_ZERO,
} from 'const'

import { ERC20 } from '../../generated/Booster/ERC20'
import { getTokenAValueInTokenB, getUsdRate } from '../../../../packages/utils/pricing'
import { ChainlinkAggregator } from '../../generated/Booster/ChainlinkAggregator'
import { DailyPoolSnapshot, Pool } from '../../generated/schema'
import { exponentToBigDecimal } from '../../../../packages/utils/maths'
import { getDailyPoolSnapshot } from './snapshots'
import { DAY, getIntervalFromTimestamp } from '../../../../packages/utils/time'
import { CurvePool } from '../../generated/Booster/CurvePool'

export function getV2LpTokenPrice(pool: Pool): BigDecimal {
  const lpToken = bytesToAddress(pool.lpToken)
  const tokenContract = ERC20.bind(lpToken)
  const supplyResult = tokenContract.try_totalSupply()
  const supply = supplyResult.reverted ? BIG_DECIMAL_ZERO : supplyResult.value.toBigDecimal().div(BIG_DECIMAL_1E18)
  let total = BIG_DECIMAL_ZERO
  let missingCoins = 0

  for (let i = 0; i < pool.coins.length; ++i) {
    const currentCoin = bytesToAddress(pool.coins[i])
    const coinContract = ERC20.bind(currentCoin)
    const balanceResult = coinContract.try_balanceOf(bytesToAddress(pool.swap))
    const decimalsResult = coinContract.try_decimals()
    let balance = balanceResult.reverted ? BIG_DECIMAL_ZERO : balanceResult.value.toBigDecimal()
    const decimals = decimalsResult.reverted ? BigInt.fromI32(18) : BigInt.fromI32(decimalsResult.value)
    balance = balance.div(exponentToBigDecimal(decimals))
    let price = BIG_DECIMAL_ONE
    // handling edge cases that are not traded on Sushi
    if (currentCoin == EURT_ADDRESS || currentCoin == EURS_ADDRESS) {
      price = getForexUsdRate(ByteArray.fromHexString(EUR_LP_TOKEN) as Bytes)
    } else {
      price = getUsdRate(currentCoin)
    }
    // for wrapped tokens and synths, we use a mapping
    // get the price of the original asset and multiply that by the pool's price oracle
    if (price == BIG_DECIMAL_ZERO && CURVE_ONLY_TOKENS.has(currentCoin.toHexString())) {
      const oracleInfo = CURVE_ONLY_TOKENS[currentCoin.toHexString()]
      price = getUsdRate(oracleInfo.pricingToken)
      const poolContract = CurvePool.bind(bytesToAddress(pool.swap))
      const priceOracleResult = poolContract.try_price_oracle()
      let priceOracle = priceOracleResult.reverted
        ? BIG_DECIMAL_ONE
        : priceOracleResult.value.toBigDecimal().div(BIG_DECIMAL_1E18)
      priceOracle =
        oracleInfo.tokenIndex == 1 && priceOracle != BIG_DECIMAL_ZERO ? priceOracle : BIG_DECIMAL_ONE.div(priceOracle)
      price = price.times(priceOracle)
    }
    // Some pools have WETH listed under "coins" but actually use native ETH
    // In case we encounter similar missing coins, we keep track of all
    // And will multiply the final result as if the pool was perfectly balanced
    // as there is no way to get native ETH balance with the graph for now
    if (balance == BIG_DECIMAL_ZERO && currentCoin == WETH_ADDRESS) {
      missingCoins += 1
    }
    total = total.plus(price.times(balance))
  }
  let value = supply == BIG_DECIMAL_ZERO ? BIG_DECIMAL_ZERO : total.div(supply)

  if (missingCoins > 0) {
    log.warning('Missing {} coins for {}', [missingCoins.toString(), pool.name])
    const missingProportion = BigDecimal.fromString((pool.coins.length / missingCoins).toString())
    value = value.times(missingProportion)
  }
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

export function getLpTokenVirtualPrice(pool: Pool): BigDecimal {
  const lpTokenAddress = bytesToAddress(pool.lpToken)
  const curveRegistry = CurveRegistry.bind(CURVE_REGISTRY)
  let vPriceCallResult = curveRegistry.try_get_virtual_price_from_lp_token(lpTokenAddress)
  let vPrice = BIG_DECIMAL_ZERO
  if (!vPriceCallResult.reverted) {
    vPrice = vPriceCallResult.value.toBigDecimal().div(BIG_DECIMAL_1E18)
  }
  // most likely for when factory pools are not included in the registry
  else {
    log.debug('Failed to fetch virtual price from registry for {}', [pool.lpToken.toHexString()])
    const lpTokenContract = CurvePool.bind(lpTokenAddress)
    vPriceCallResult = lpTokenContract.try_get_virtual_price()
    if (!vPriceCallResult.reverted) {
      vPrice = vPriceCallResult.value.toBigDecimal().div(BIG_DECIMAL_1E18)
    }
    // for v2 pools
    else {
      const poolContract = CurvePool.bind(bytesToAddress(pool.swap))
      vPriceCallResult = poolContract.try_get_virtual_price()
      vPrice = vPriceCallResult.reverted ? vPrice : vPriceCallResult.value.toBigDecimal().div(BIG_DECIMAL_1E18)
    }
  }
  return vPrice
}

function getPreviousDaySnapshot(pool: Pool, timestamp: BigInt): DailyPoolSnapshot | null {
  const yesterday = getIntervalFromTimestamp(timestamp.minus(DAY), DAY)
  const snapId = pool.name + '-' + pool.poolid.toString() + '-' + yesterday.toString()
  return DailyPoolSnapshot.load(snapId)
}

export function getV2PoolBaseApr(
  pool: Pool,
  currentXcpProfit: BigDecimal,
  currentXcpProfitA: BigDecimal,
  timestamp: BigInt
): BigDecimal {
  const previousSnapshot = getPreviousDaySnapshot(pool, timestamp)
  if (!previousSnapshot) {
    return BIG_DECIMAL_ZERO
  }
  const previousSnapshotXcpProfit = previousSnapshot.xcpProfit
  // avoid creating an artificial apr jump if pool was just created
  if (previousSnapshotXcpProfit == BIG_DECIMAL_ZERO) {
    return BIG_DECIMAL_ZERO
  }
  const previousSnapshotXcpProfitA = previousSnapshot.xcpProfitA
  const currentProfit = currentXcpProfit
    .div(BIG_DECIMAL_TWO)
    .plus(currentXcpProfitA.div(BIG_DECIMAL_TWO))
    .plus(BIG_DECIMAL_1E18)
    .div(BIG_DECIMAL_TWO)
  const previousProfit = previousSnapshotXcpProfit
    .div(BIG_DECIMAL_TWO)
    .plus(previousSnapshotXcpProfitA.div(BIG_DECIMAL_TWO))
    .plus(BIG_DECIMAL_1E18)
    .div(BIG_DECIMAL_TWO)
  const rate =
    previousProfit == BIG_DECIMAL_ZERO ? BIG_DECIMAL_ZERO : currentProfit.minus(previousProfit).div(previousProfit)
  return rate
}

export function getPoolBaseApr(pool: Pool, currentVirtualPrice: BigDecimal, timestamp: BigInt): BigDecimal {
  const previousSnapshot = getPreviousDaySnapshot(pool, timestamp.minus(DAY))
  const previousSnapshotVPrice = previousSnapshot ? previousSnapshot.lpTokenVirtualPrice : BIG_DECIMAL_ZERO
  const rate =
    previousSnapshotVPrice == BIG_DECIMAL_ZERO
      ? BIG_DECIMAL_ZERO
      : currentVirtualPrice.minus(previousSnapshotVPrice).div(previousSnapshotVPrice)
  return rate
}

export function getLpTokenPriceUSD(pool: Pool): BigDecimal {
  const lpTokenAddress = bytesToAddress(pool.lpToken)
  const vPrice = getLpTokenVirtualPrice(pool)
  if (pool.isV2) {
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
