import {AssetPrices, TricryptoSnapshot} from "../../generated/schema";
import {
    BIG_DECIMAL_1E18,
    BIG_DECIMAL_1E6,
    BIG_DECIMAL_1E8,
    TRICRYPTO2_ETH_POOL_ADDRESS, TRICRYPTO2_LP_ADDRESS
} from "../../../../packages/constants";
import {BigInt, Bytes} from "@graphprotocol/graph-ts/index";
import {BigDecimal, ethereum} from "@graphprotocol/graph-ts";
import {tricrypto2} from "../../generated/Tricrypto2/tricrypto2";
import {crv3Crypto} from "../../generated/Tricrypto2/crv3Crypto";


export const USDTID = BigInt.fromI32(0)
export const WBTCID = BigInt.fromI32(1)
export const ETHID = BigInt.fromI32(2)

export const TRICRYPTO_ETH = tricrypto2.bind(TRICRYPTO2_ETH_POOL_ADDRESS)
export const CRV3CRYPTO_ETH = crv3Crypto.bind(TRICRYPTO2_LP_ADDRESS)

export function poolSnapshot(event: ethereum.Event): TricryptoSnapshot {

    const pool = new TricryptoSnapshot(event.block.timestamp.toString())

    pool.blockNumber = event.block.number
    pool.timestamp = event.block.timestamp

    // get pool properties after swap
    pool.usdtBalance = TRICRYPTO_ETH.balances(USDTID).toBigDecimal().div(BIG_DECIMAL_1E6)
    pool.wbtcBalance = TRICRYPTO_ETH.balances(WBTCID).toBigDecimal().div(BIG_DECIMAL_1E6)
    pool.ethBalance = TRICRYPTO_ETH.balances(ETHID).toBigDecimal().div(BIG_DECIMAL_1E18)

    // price oracle & price scale values for btc, eth
    pool.virtualPrice = getVirtualPrice(event)
    pool.ethOraclePrice = getEthOraclePrice(event)
    pool.btcOraclePrice = getBtcOraclePrice(event)
    pool.ethOraclePrice = TRICRYPTO_ETH.price_scale(BigInt.fromI32(1)).toBigDecimal().div(BIG_DECIMAL_1E18)
    pool.btcOraclePrice = TRICRYPTO_ETH.price_scale(BigInt.fromI32(2)).toBigDecimal().div(BIG_DECIMAL_1E18)

    pool.fee = TRICRYPTO_ETH.fee().toBigDecimal().div(BIG_DECIMAL_1E8)
    pool.crv3CryptoSupply = CRV3CRYPTO_ETH.totalSupply().toBigDecimal().div(BIG_DECIMAL_1E18)

    return pool
}


export function getEthOraclePrice(event: ethereum.Event): BigDecimal {
    return TRICRYPTO_ETH.price_oracle(BigInt.fromI32(1)).toBigDecimal().div(BIG_DECIMAL_1E18)
}


export function getBtcOraclePrice(event: ethereum.Event): BigDecimal {
    return TRICRYPTO_ETH.price_oracle(BigInt.fromI32(2)).toBigDecimal().div(BIG_DECIMAL_1E18)
}


export function getVirtualPrice(event: ethereum.Event): BigDecimal {
    return TRICRYPTO_ETH.get_virtual_price().toBigDecimal().div(BIG_DECIMAL_1E18)
}


export function getCoinExchangedId(coinID: BigInt): Bytes {

    if ( coinID == USDTID ) {
        return Bytes.fromUTF8("USDT")
    }
    if ( coinID == WBTCID ) {
        return Bytes.fromUTF8("WBTC")
    }
    if ( coinID == ETHID ) {
        return Bytes.fromUTF8("ETH")
    }

}


export function recordAssetPrices(event: ethereum.Event): AssetPrices {

    const btcPrice = getBtcOraclePrice(event)
    const ethPrice = getEthOraclePrice(event)
    const virtualPrice = getVirtualPrice(event)
    const tokenPrice = getCrv3CryptoPriceUSD(btcPrice, ethPrice, virtualPrice)

    const assetPricesEntity = new AssetPrices(event.block.timestamp.toString())

    assetPricesEntity.blockNumber = event.block.number
    assetPricesEntity.timestamp = event.block.timestamp
    assetPricesEntity.crv3cryptoUSD = tokenPrice
    assetPricesEntity.crv3cryptoBTC = tokenPrice.div(btcPrice)
    assetPricesEntity.crv3cryptoETH = tokenPrice.div(ethPrice)
    assetPricesEntity.btcPrice = btcPrice
    assetPricesEntity.ethPrice = ethPrice

    return assetPricesEntity

}


export function getCrv3CryptoPriceUSD(btcPrice: BigDecimal, ethPrice: BigDecimal, virtualPrice: BigDecimal): BigDecimal {

    const mulBtcEthVirtualPrice = btcPrice.times(ethPrice).times(virtualPrice)
    const toBeCubeRooted = BigDecimal.fromString('3').times(mulBtcEthVirtualPrice).times(BigDecimal.fromString("3"))

    return BigDecimal.fromString(Math.cbrt(Number.parseFloat(toBeCubeRooted.toString())).toString())

}