import { AssetPrice, TricryptoSnapshot } from '../../generated/schema'
import {
  BIG_DECIMAL_1E18,
  BIG_DECIMAL_1E6,
  BIG_DECIMAL_1E8,
  BIG_DECIMAL_1E10,
  BIG_INT_ONE,
  BIG_INT_ZERO,
  TRICRYPTO_ARBITRUM_POOL_ADDRESS,
  TRICRYPTO_ARBITRUM_LP_TOKEN_ADDRESS,
} from '../../../../../packages/constants'

import { BigInt } from '@graphprotocol/graph-ts/index'
import { BigDecimal, ethereum } from '@graphprotocol/graph-ts'
import { Tricrypto } from '../../generated/Tricrypto/Tricrypto'
import { Crv3Crypto } from '../../generated/Tricrypto/Crv3Crypto'

export const USDTID = BigInt.fromI32(0)
export const WBTCID = BigInt.fromI32(1)
export const ETHID = BigInt.fromI32(2)

export const TRICRYPTO = Tricrypto.bind(TRICRYPTO_ARBITRUM_POOL_ADDRESS)
export const CRV3CRYPTO = Crv3Crypto.bind(TRICRYPTO_ARBITRUM_LP_TOKEN_ADDRESS)

export function getPoolSnapshot(event: ethereum.Event): TricryptoSnapshot {
  const pool = new TricryptoSnapshot(event.transaction.hash.toHex() + '-' + event.logIndex.toString())

  pool.blockNumber = event.block.number
  pool.timestamp = event.block.timestamp

  // get pool balances
  pool.usdtBalance = TRICRYPTO.balances(USDTID).toBigDecimal().div(BIG_DECIMAL_1E6)
  pool.btcBalance = TRICRYPTO.balances(WBTCID).toBigDecimal().div(BIG_DECIMAL_1E8)
  pool.ethBalance = TRICRYPTO.balances(ETHID).toBigDecimal().div(BIG_DECIMAL_1E18)

  // price oracle & price scale values for btc, eth
  pool.virtualPrice = getVirtualPrice()
  pool.ethOraclePrice = getEthOraclePrice()
  pool.btcOraclePrice = getBtcOraclePrice()
  pool.ethScalePrice = TRICRYPTO.price_scale(BigInt.fromI32(1)).toBigDecimal().div(BIG_DECIMAL_1E18)
  pool.btcScalePrice = TRICRYPTO.price_scale(BigInt.fromI32(0)).toBigDecimal().div(BIG_DECIMAL_1E18)

  pool.xcpProfit = TRICRYPTO.xcp_profit().toBigDecimal().div(BIG_DECIMAL_1E18)
  pool.xcpProfitA = TRICRYPTO.xcp_profit_a().toBigDecimal().div(BIG_DECIMAL_1E18)

  // continue tvl calcs:
  pool.ethBalanceUSD = pool.ethBalance.times(pool.ethOraclePrice)
  pool.btcBalanceUSD = pool.btcBalance.times(pool.btcOraclePrice)

  pool.feeFraction = TRICRYPTO.fee().toBigDecimal().div(BIG_DECIMAL_1E10)
  pool.crv3CryptoSupply = CRV3CRYPTO.totalSupply().toBigDecimal().div(BIG_DECIMAL_1E18)

  return pool
}

export function getPriceSnapshot(event: ethereum.Event): AssetPrice {
  const btcPrice = getBtcOraclePrice()
  const ethPrice = getEthOraclePrice()
  const virtualPrice = getVirtualPrice()
  const tokenPrice = getCrv3CryptoPriceUSD(btcPrice, ethPrice, virtualPrice)

  const assetPrice = new AssetPrice(event.transaction.hash.toHex() + '-' + event.logIndex.toString())

  assetPrice.blockNumber = event.block.number
  assetPrice.timestamp = event.block.timestamp
  assetPrice.crv3cryptoUSD = tokenPrice
  assetPrice.crv3cryptoBTC = tokenPrice.div(btcPrice)
  assetPrice.crv3cryptoETH = tokenPrice.div(ethPrice)
  assetPrice.btcPrice = btcPrice
  assetPrice.ethPrice = ethPrice

  // index constituents: 33% USD, 33% BTC, 33% ETH
  assetPrice.indexNumUSD = assetPrice.crv3cryptoUSD.div(BigDecimal.fromString('3'))
  assetPrice.indexNumETH = assetPrice.crv3cryptoUSD.div(BigDecimal.fromString('3')).div(assetPrice.ethPrice)
  assetPrice.indexNumBTC = assetPrice.crv3cryptoUSD.div(BigDecimal.fromString('3')).div(assetPrice.btcPrice)

  return assetPrice
}

export function getEthOraclePrice(): BigDecimal {
  return TRICRYPTO.price_oracle(BIG_INT_ONE).toBigDecimal().div(BIG_DECIMAL_1E18)
}

export function getBtcOraclePrice(): BigDecimal {
  return TRICRYPTO.price_oracle(BIG_INT_ZERO).toBigDecimal().div(BIG_DECIMAL_1E18)
}

export function getVirtualPrice(): BigDecimal {
  return TRICRYPTO.get_virtual_price().toBigDecimal().div(BIG_DECIMAL_1E18)
}

export function getCrv3CryptoPriceUSD(
  btcPrice: BigDecimal,
  ethPrice: BigDecimal,
  virtualPrice: BigDecimal
): BigDecimal {
  // formula is: 3 * virtual_price * (eth_price * btc_price)**(1/3)
  // the following gives (eth_price * btc_price) ** (1/3)
  const cubeRootEthBtcPrices: BigDecimal = BigDecimal.fromString(
    Math.cbrt(Number.parseFloat(btcPrice.times(ethPrice).toString())).toString()
  )

  // the following gives 3 * virtual_priec
  const threeTimesVirtualPrice = BigDecimal.fromString('3').times(virtualPrice)

  return threeTimesVirtualPrice.times(cubeRootEthBtcPrices)
}
