import {
    TricryptoSnapshot,
    AddLiquidityEvent,
    RemoveLiquidityEvent,
    ExchangeEvent,
    ClaimAdminFeeEvent,
    User
} from '../generated/schema'
import {
    tricrypto2,
    TokenExchange
} from "../generated/Tricrypto2/tricrypto2";
import { crv3Crypto } from "../generated/Tricrypto2/crv3Crypto";
import {
    BIG_DECIMAL_1E18,
    BIG_DECIMAL_1E6,
    BIG_DECIMAL_1E8,
    TRICRYPTO2_ETH_POOL_ADDRESS
} from "../../../packages/constants";
import {BigInt} from "@graphprotocol/graph-ts/index";


export const USDTID = BigInt.fromI32(0)
export const WBTCID = BigInt.fromI32(1)
export const ETHID = BigInt.fromI32(2)
export const TRICRYPTO_ETH = tricrypto2.bind(TRICRYPTO2_ETH_POOL_ADDRESS)

export function handleTokenExchange(event: TokenExchange): void {

    let pool = new TricryptoSnapshot(event.block.timestamp.toString())

    pool.blockNumber = event.block.number
    pool.timestamp = event.block.timestamp

    // get pool properties after swap
    pool.usdtBalance = TRICRYPTO_ETH.balances(USDTID).toBigDecimal().div(BIG_DECIMAL_1E6)
    pool.wbtcBalance = TRICRYPTO_ETH.balances(WBTCID).toBigDecimal().div(BIG_DECIMAL_1E6)
    pool.ethBalance = TRICRYPTO_ETH.balances(ETHID).toBigDecimal().div(BIG_DECIMAL_1E18)
    pool.virtualPrice = TRICRYPTO_ETH.get_virtual_price().toBigDecimal().div(BIG_DECIMAL_1E18)
    pool.fee = TRICRYPTO_ETH.fee().toBigDecimal().div(BIG_DECIMAL_1E8)

    // price oracle & price scale values for btc, eth
    pool.ethOraclePrice = TRICRYPTO_ETH.price_oracle(BigInt.fromI32(1)).toBigDecimal().div(BIG_DECIMAL_1E18)
    pool.btcOraclePrice = TRICRYPTO_ETH.price_oracle(BigInt.fromI32(2)).toBigDecimal().div(BIG_DECIMAL_1E18)
    pool.ethOraclePrice = TRICRYPTO_ETH.price_scale(BigInt.fromI32(1)).toBigDecimal().div(BIG_DECIMAL_1E18)
    pool.btcOraclePrice = TRICRYPTO_ETH.price_scale(BigInt.fromI32(2)).toBigDecimal().div(BIG_DECIMAL_1E18)

    pool.save()

    // parse event:
    let exchange = new ExchangeEvent(event.block.timestamp.toString())
    exchange.blockNumber = event.block.number
    exchange.timestamp = event.block.timestamp
    exchange.user = event.params.buyer.toString()

    if ( event.params.sold_id == USDTID ) {
        exchange.assetIn = "USDT"
    }
    if ( event.params.sold_id == WBTCID ) {
        exchange.assetIn = "WBTC"
    }
    if ( event.params.sold_id == ETHID ) {
        exchange.assetIn = "ETH"
    }

    exchange.save()

}


export function handleAddLiquidity(event: TokenExchange): void {

    // get event values


    // get pool coin balances


    // get virtual price


    // get price oracle values for btc, eth


    // get price scale values for btc, eth


    // get swap fee


    // get swap rates

}


export function handleRemoveLiquidity(event: TokenExchange): void {

    // get event values


    // get pool coin balances


    // get virtual price


    // get price oracle values for btc, eth


    // get price scale values for btc, eth


    // get swap fee


    // get swap rates

}


export function handleClaimAdminFee(event: TokenExchange): void {

    // get event values


    // get pool coin balances


    // get virtual price


    // get price oracle values for btc, eth


    // get price scale values for btc, eth


    // get swap fee


    // get swap rates

}