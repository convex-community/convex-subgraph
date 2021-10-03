import { Address, BigDecimal } from '@graphprotocol/graph-ts'
import {
  ADDRESS_ZERO,
  BIG_DECIMAL_1E18,
  BIG_DECIMAL_1E6,
  BIG_DECIMAL_ONE,
  BIG_DECIMAL_ZERO,
  SUSHI_FACTORY_ADDRESS,
  SUSHISWAP_WETH_USDT_PAIR_ADDRESS,
  USDT_ADDRESS,
  WETH_ADDRESS,
} from 'const'
import { Factory } from 'locker/generated/CvxLocker/Factory'
import { Pair } from 'locker/generated/CvxLocker/Pair'

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

export function getUSDRate(token: Address): BigDecimal {
  const usdt = BIG_DECIMAL_ONE

  if (token != USDT_ADDRESS) {
    const tokenPriceETH = getEthRate(token)

    const pair = Pair.bind(SUSHISWAP_WETH_USDT_PAIR_ADDRESS)

    const reserves = pair.getReserves()

    const reserve0 = reserves.value0.toBigDecimal().times(BIG_DECIMAL_1E18)

    const reserve1 = reserves.value1.toBigDecimal().times(BIG_DECIMAL_1E18)

    const ethPriceUSD = reserve1.div(reserve0).div(BIG_DECIMAL_1E6).times(BIG_DECIMAL_1E18)

    return ethPriceUSD.times(tokenPriceETH)
  }

  return usdt
}
