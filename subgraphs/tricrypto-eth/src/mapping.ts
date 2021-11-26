import {
    TricryptoSnapshot,
    AddLiquidityEvent,
    RemoveLiquidityEvent,
    ExchangeEvent,
    ClaimAdminFeeEvent,
} from '../generated/schema'
import {
    ClaimAdminFee,
    RemoveLiquidity, RemoveLiquidityOne,
    TokenExchange
} from "../generated/Tricrypto2/tricrypto2";

import {
    ETHID,
    WBTCID,
    USDTID,
    poolSnapshot,
    getAssetPrices,
} from "./services/poolUtils";
import {BIG_DECIMAL_1E18, BIG_DECIMAL_1E6} from "../../../packages/constants";
import {AddLiquidity} from "../../curve-pools/generated/Booster/CurvePool";
import {BigDecimal} from "@graphprotocol/graph-ts";


export function handleTokenExchange(event: TokenExchange): void {

    poolSnapshot(event).save()
    const assetPrices = getAssetPrices(event)
    assetPrices.save()

    // parse event:
    const data = new ExchangeEvent(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
    data.blockNumber = event.block.number
    data.timestamp = event.block.timestamp
    data.address = event.params.buyer

    const soldID = event.params.sold_id
    const boughtID = event.params.bought_id
    const amountSold = event.params.tokens_sold
    const amountBought = event.params.tokens_bought

    data.amountUSDBought = BigDecimal.fromString("0")
    data.amountBTCBought = BigDecimal.fromString("0")
    data.amountETHBought = BigDecimal.fromString("0")
    data.amountETHBoughtUSD = BigDecimal.fromString("0")
    data.amountBTCBoughtUSD = BigDecimal.fromString("0")

    data.amountUSDSold = BigDecimal.fromString("0")
    data.amountBTCSold = BigDecimal.fromString("0")
    data.amountETHSold = BigDecimal.fromString("0")
    data.amountETHSoldUSD = BigDecimal.fromString("0")
    data.amountBTCSoldUSD = BigDecimal.fromString("0")


    if (soldID == USDTID) {
        data.amountUSDSold = amountSold.toBigDecimal().div(BIG_DECIMAL_1E6)
    }
    if (soldID == WBTCID) {
        data.amountBTCSold = amountSold.toBigDecimal().div(BIG_DECIMAL_1E6)
        data.amountBTCSoldUSD = data.amountBTCSold.times(assetPrices.btcPrice)
    }
    if (soldID == ETHID) {
        data.amountETHSold = amountSold.toBigDecimal().div(BIG_DECIMAL_1E18)
        data.amountETHSoldUSD = data.amountETHSold.times(assetPrices.ethPrice)
    }

    if (boughtID == USDTID) {
        data.amountUSDBought = amountBought.toBigDecimal().div(BIG_DECIMAL_1E6)
    }
    if (boughtID == WBTCID) {
        data.amountBTCBought = amountBought.toBigDecimal().div(BIG_DECIMAL_1E6)
        data.amountBTCBoughtUSD = data.amountBTCBought.times(assetPrices.btcPrice)
    }
    if (boughtID == ETHID) {
        data.amountETHBought = amountBought.toBigDecimal().div(BIG_DECIMAL_1E18)
        data.amountETHBoughtUSD = data.amountETHBought.times(assetPrices.ethPrice)
    }

    data.totalBoughtUSD = data.amountUSDBought.plus(data.amountBTCBoughtUSD).plus(data.amountETHBoughtUSD)
    data.totalSoldUSD = data.amountUSDSold.plus(data.amountBTCSoldUSD).plus(data.amountETHSoldUSD)
    data.save()

}


export function handleAddLiquidity(event: AddLiquidity): void {

    poolSnapshot(event).save()
    const assetPrices = getAssetPrices(event)
    assetPrices.save()

    // parse event:
    const data = new AddLiquidityEvent(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
    data.blockNumber = event.block.number
    data.timestamp = event.block.timestamp
    data.address = event.params.provider

    const tokenAmounts = event.params.token_amounts

    data.amountUSD = tokenAmounts[0].toBigDecimal().div(BIG_DECIMAL_1E6)
    data.amountBTC = tokenAmounts[1].toBigDecimal().div(BIG_DECIMAL_1E6)
    data.amountETH = tokenAmounts[2].toBigDecimal().div(BIG_DECIMAL_1E18)
    data.amountBTCUSD = data.amountBTC.times(assetPrices.btcPrice)
    data.amountETHUSD = data.amountETH.times(assetPrices.ethPrice)
    data.totalAddedUSD = data.amountUSD.plus(data.amountETHUSD).plus(data.amountBTCUSD)
    data.save()

}


export function handleRemoveLiquidity(event: RemoveLiquidity): void {

    poolSnapshot(event).save()
    const assetPrices = getAssetPrices(event)
    assetPrices.save()

    // parse event:
    const data = new RemoveLiquidityEvent(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
    data.blockNumber = event.block.number
    data.timestamp = event.block.timestamp
    data.address = event.params.provider

    const tokenAmounts = event.params.token_amounts
    data.amountUSD = tokenAmounts[USDTID.toI32()].toBigDecimal().div(BIG_DECIMAL_1E6)
    data.amountBTC = tokenAmounts[WBTCID.toI32()].toBigDecimal().div(BIG_DECIMAL_1E6)
    data.amountETH = tokenAmounts[ETHID.toI32()].toBigDecimal().div(BIG_DECIMAL_1E18)
    data.amountBTCUSD = data.amountBTC.times(assetPrices.btcPrice)
    data.amountETHUSD = data.amountETH.times(assetPrices.ethPrice)

    data.totalRemovedUSD = data.amountUSD.plus(data.amountBTCUSD).plus(data.amountETHUSD)
    data.save()

}


export function handleRemoveLiquidityOne(event: RemoveLiquidityOne): void {

    poolSnapshot(event).save()
    const assetPrices = getAssetPrices(event)
    assetPrices.save()

    // parse event:
    const data = new RemoveLiquidityEvent(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
    data.blockNumber = event.block.number
    data.timestamp = event.block.timestamp
    data.address = event.params.provider

    data.amountUSD = BigDecimal.fromString("0")
    data.amountBTC = BigDecimal.fromString("0")
    data.amountBTCUSD = BigDecimal.fromString("0")
    data.amountETH = BigDecimal.fromString("0")
    data.amountETHUSD = BigDecimal.fromString("0")

    const coinAmount = event.params.coin_amount
    const coinID = event.params.coin_index

    if (coinID == USDTID) {
        data.amountUSD = coinAmount.toBigDecimal().div(BIG_DECIMAL_1E6)
    }
    if (coinID == WBTCID) {
        data.amountBTC = coinAmount.toBigDecimal().div(BIG_DECIMAL_1E6)
        data.amountBTCUSD = data.amountBTC.times(assetPrices.btcPrice)
    }
    if (coinID == ETHID) {
        data.amountETH = coinAmount.toBigDecimal().div(BIG_DECIMAL_1E18)
        data.amountETHUSD = data.amountETH.times(assetPrices.ethPrice)
    }
    data.totalRemovedUSD = data.amountUSD.plus(data.amountBTCUSD).plus(data.amountETHUSD)
    data.save()
}



export function handleClaimAdminFee(event: ClaimAdminFee): void {

    poolSnapshot(event).save()
    const assetPrices = getAssetPrices(event)
    assetPrices.save()

    // parse event:
    const data = new ClaimAdminFeeEvent(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
    data.blockNumber = event.block.number
    data.timestamp = event.block.timestamp
    data.amountClaimed = event.params.tokens.toBigDecimal()
    data.claimDollarValue = assetPrices.crv3cryptoUSD.times(data.amountClaimed)
    data.save()

}