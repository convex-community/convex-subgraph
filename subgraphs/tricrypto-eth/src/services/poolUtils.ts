import {AssetPrice, TricryptoSnapshot} from "../../generated/schema";
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

    const pool = new TricryptoSnapshot(event.transaction.hash.toHex() + '-' + event.logIndex.toString())

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
    pool.btcOraclePrice = TRICRYPTO_ETH.price_scale(BigInt.fromI32(0)).toBigDecimal().div(BIG_DECIMAL_1E18)

    pool.fee = TRICRYPTO_ETH.fee().toBigDecimal().div(BIG_DECIMAL_1E8)
    pool.crv3CryptoSupply = CRV3CRYPTO_ETH.totalSupply().toBigDecimal().div(BIG_DECIMAL_1E18)

    return pool
}


export function priceSnapshot(event: ethereum.Event): AssetPrice {

    const btcPrice = getBtcOraclePrice(event)
    const ethPrice = getEthOraclePrice(event)
    const virtualPrice = getVirtualPrice(event)
    const tokenPrice = getCrv3CryptoPriceUSD(btcPrice, ethPrice, virtualPrice)

    const data = new AssetPrice(event.transaction.hash.toHex() + '-' + event.logIndex.toString())

    data.blockNumber = event.block.number
    data.timestamp = event.block.timestamp
    data.crv3cryptoUSD = tokenPrice
    data.crv3cryptoBTC = tokenPrice.div(btcPrice)
    data.crv3cryptoETH = tokenPrice.div(ethPrice)
    data.btcPrice = btcPrice
    data.ethPrice = ethPrice

    // index constituents: 33% USD, 33% BTC, 33% ETH
    data.indexNumUSD = data.crv3cryptoUSD.div(BigDecimal.fromString("3"))
    data.indexNumETH = data.crv3cryptoUSD.div(BigDecimal.fromString("3")).div(data.ethPrice)
    data.indexNumBTC = data.crv3cryptoUSD.div(BigDecimal.fromString("3")).div(data.btcPrice)

    return data

}


export function getEthOraclePrice(event: ethereum.Event): BigDecimal {
    return TRICRYPTO_ETH.price_oracle(BigInt.fromI32(1)).toBigDecimal().div(BIG_DECIMAL_1E18)
}


export function getBtcOraclePrice(event: ethereum.Event): BigDecimal {
    return TRICRYPTO_ETH.price_oracle(BigInt.fromI32(0)).toBigDecimal().div(BIG_DECIMAL_1E18)
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


export function getCrv3CryptoPriceUSD(btcPrice: BigDecimal, ethPrice: BigDecimal, virtualPrice: BigDecimal): BigDecimal {

    // formula is: 3 * virtual_price * (eth_price * btc_price)**(1/3)
    // the following gives (eth_price * btc_price) ** (1/3)
    const cubeRootEthBtcPrices: BigDecimal = BigDecimal.fromString(Math.cbrt(Number.parseFloat(btcPrice.times(ethPrice).toString())).toString())

    // the following gives 3 * virtual_priec
    const threeTimesVirtualPrice = BigDecimal.fromString('3').times(virtualPrice)

    return threeTimesVirtualPrice.times(cubeRootEthBtcPrices)

}