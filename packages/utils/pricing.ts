import { Address, BigDecimal, BigInt } from '@graphprotocol/graph-ts'
import {
  ADDRESS_ZERO,
  BIG_DECIMAL_1E18,
  BIG_DECIMAL_1E6,
  BIG_DECIMAL_ONE,
  BIG_DECIMAL_ZERO,
  SUSHI_FACTORY_ADDRESS,
  SUSHISWAP_WETH_USDT_PAIR_ADDRESS,
  USDT_ADDRESS, WBTC_ADDRESS,
  WETH_ADDRESS
} from 'const'
import { Factory } from 'curve-pools/generated/Booster/Factory'
import { Pair } from 'curve-pools/generated/Booster/Pair'
import { ERC20 } from 'curve-pools/generated/Booster/ERC20'
import { exponentToBigDecimal } from './maths'

export function getEthRate(token: Address): BigDecimal {
  let eth = BIG_DECIMAL_ONE

  if (token != WETH_ADDRESS) {
    const factory = Factory.bind(SUSHI_FACTORY_ADDRESS)
    const address = factory.getPair(token, WETH_ADDRESS)

    if (address == ADDRESS_ZERO) {
      return BIG_DECIMAL_ZERO
    }

    const pair = Pair.bind(address)

    const reserves = pair.getReserves()

    eth =
      pair.token0() == WETH_ADDRESS
        ? reserves.value0.toBigDecimal().times(BIG_DECIMAL_1E18).div(reserves.value1.toBigDecimal())
        : reserves.value1.toBigDecimal().times(BIG_DECIMAL_1E18).div(reserves.value0.toBigDecimal())

    return eth.div(BIG_DECIMAL_1E18)
  }

  return eth
}

export function getDecimals(token: Address): BigInt {
  const tokenContract = ERC20.bind(token)
  const decimalsResult = tokenContract.try_decimals()
  return decimalsResult.reverted ? BigInt.fromI32(18) : BigInt.fromI32(decimalsResult.value)
}

// Computes the value of one unit of Token A in units of Token B
// Only works if both tokens have an ETH pair on Sushi
export function getTokenAValueInTokenB(tokenA: Address, tokenB: Address): BigDecimal {
  const decimalsA = getDecimals(tokenA)
  const decimalsB = getDecimals(tokenB)
  const ethRateA = getEthRate(tokenA).times(BIG_DECIMAL_1E18)
  const ethRateB = getEthRate(tokenB).times(BIG_DECIMAL_1E18)

  return (ethRateA.div(ethRateB)).times(exponentToBigDecimal(decimalsA)).div(exponentToBigDecimal(decimalsB))
}

export function getUsdRate(token: Address): BigDecimal {
  const usdt = BIG_DECIMAL_ONE

  if (token != USDT_ADDRESS) {
    return getTokenAValueInTokenB(token, USDT_ADDRESS)
  }

  return usdt
}


export function getBtcRate(token: Address): BigDecimal {
  const wbtc = BIG_DECIMAL_ONE

  if (token != WBTC_ADDRESS) {
    return getTokenAValueInTokenB(token, WBTC_ADDRESS)
  }

  return wbtc
}