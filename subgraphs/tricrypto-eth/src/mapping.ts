import {
    AddLiquidityEvent,
    RemoveLiquidityEvent,
    ExchangeEvent,
    ClaimAdminFeeEvent, TricryptoSnapshot,
} from '../generated/schema'
import {
    ClaimAdminFee,
    AddLiquidity,
    RemoveLiquidity,
    RemoveLiquidityOne,
    TokenExchange
} from "../generated/Tricrypto2/tricrypto2";

import {
    ETHID,
    WBTCID,
    USDTID,
    poolSnapshot,
    priceSnapshot,
} from "./services/poolUtils";
import {
    BIG_DECIMAL_1E18,
    BIG_DECIMAL_1E6,
    BIG_DECIMAL_1E8, BIG_DECIMAL_ONE
} from "../../../packages/constants";
import {BigDecimal} from "@graphprotocol/graph-ts";


export function handleTokenExchange(event: TokenExchange): void {

    const tricrypto2Snapshot = poolSnapshot(event)
    tricrypto2Snapshot.save()
    const assetPriceSnapshot = priceSnapshot(event)
    assetPriceSnapshot.save()

    // parse event:
    const data = new ExchangeEvent(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
    data.blockNumber = event.block.number
    data.timestamp = event.block.timestamp
    data.address = event.params.buyer
    data.txHash = event.transaction.hash
    data.gasPriceETH = event.transaction.gasPrice.toBigDecimal().div(BIG_DECIMAL_1E18)
    data.gasPriceUSD = data.gasPriceETH.times(assetPriceSnapshot.ethPrice)
    data.assetPrices = assetPriceSnapshot.id
    data.poolSnapshot = tricrypto2Snapshot.id

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
        data.amountBTCSold = amountSold.toBigDecimal().div(BIG_DECIMAL_1E8)
        data.amountBTCSoldUSD = data.amountBTCSold.times(assetPriceSnapshot.btcPrice)
    }
    if (soldID == ETHID) {
        data.amountETHSold = amountSold.toBigDecimal().div(BIG_DECIMAL_1E18)
        data.amountETHSoldUSD = data.amountETHSold.times(assetPriceSnapshot.ethPrice)
    }

    if (boughtID == USDTID) {
        data.amountUSDBought = amountBought.toBigDecimal().div(BIG_DECIMAL_1E6)
    }
    if (boughtID == WBTCID) {
        data.amountBTCBought = amountBought.toBigDecimal().div(BIG_DECIMAL_1E8)
        data.amountBTCBoughtUSD = data.amountBTCBought.times(assetPriceSnapshot.btcPrice)
    }
    if (boughtID == ETHID) {
        data.amountETHBought = amountBought.toBigDecimal().div(BIG_DECIMAL_1E18)
        data.amountETHBoughtUSD = data.amountETHBought.times(assetPriceSnapshot.ethPrice)
    }

    // get totals but in dollar-value:
    data.totalBoughtUSD = data.amountUSDBought.plus(data.amountBTCBoughtUSD).plus(data.amountETHBoughtUSD)
    data.totalSoldUSD = data.amountUSDSold.plus(data.amountBTCSoldUSD).plus(data.amountETHSoldUSD)

    // get trader fees and lp fees:
    // trader fees: in line 658 of tricrypto2 contract: dy -= self._fee(xp) * dy / 10**10
    // while the contract uses self._fee(xp): calculating xp is a bit more complex. we approximate
    // by just using the feeFraction. This means, dy (without fees subtracted is):
    // tokenOutUSD / (1-feeFraction)
    // so fee: outWithoutFees - outWithFees
    const totalOutUSDnoFee = data.totalBoughtUSD.div(BIG_DECIMAL_ONE.minus(tricrypto2Snapshot.feeFraction))
    data.traderFeesUSD = totalOutUSDnoFee.minus(data.totalBoughtUSD)

    data.save()

}


export function handleAddLiquidity(event: AddLiquidity): void {

    const tricrypto2Snapshot = poolSnapshot(event)
    tricrypto2Snapshot.save()
    const assetPriceSnapshot = priceSnapshot(event)
    assetPriceSnapshot.save()

    // parse event:
    const data = new AddLiquidityEvent(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
    data.blockNumber = event.block.number
    data.timestamp = event.block.timestamp
    data.address = event.params.provider
    data.txHash = event.transaction.hash
    data.assetPrices = assetPriceSnapshot.id
    data.poolSnapshot = tricrypto2Snapshot.id

    const tokenAmounts = event.params.token_amounts

    data.amountUSD = tokenAmounts[0].toBigDecimal().div(BIG_DECIMAL_1E6)
    data.amountBTC = tokenAmounts[1].toBigDecimal().div(BIG_DECIMAL_1E8)
    data.amountETH = tokenAmounts[2].toBigDecimal().div(BIG_DECIMAL_1E18)
    data.amountBTCUSD = data.amountBTC.times(assetPriceSnapshot.btcPrice)
    data.amountETHUSD = data.amountETH.times(assetPriceSnapshot.ethPrice)
    data.totalAddedUSD = data.amountUSD.plus(data.amountETHUSD).plus(data.amountBTCUSD)
    data.save()

}


export function handleRemoveLiquidity(event: RemoveLiquidity): void {

    const tricrypto2Snapshot = poolSnapshot(event)
    tricrypto2Snapshot.save()
    const assetPriceSnapshot = priceSnapshot(event)
    assetPriceSnapshot.save()

    // parse event:
    const data = new RemoveLiquidityEvent(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
    data.blockNumber = event.block.number
    data.timestamp = event.block.timestamp
    data.address = event.params.provider
    data.txHash = event.transaction.hash
    data.assetPrices = assetPriceSnapshot.id
    data.poolSnapshot = tricrypto2Snapshot.id

    const tokenAmounts = event.params.token_amounts
    data.amountUSD = tokenAmounts[USDTID.toI32()].toBigDecimal().div(BIG_DECIMAL_1E6)
    data.amountBTC = tokenAmounts[WBTCID.toI32()].toBigDecimal().div(BIG_DECIMAL_1E6)
    data.amountETH = tokenAmounts[ETHID.toI32()].toBigDecimal().div(BIG_DECIMAL_1E18)
    data.amountBTCUSD = data.amountBTC.times(assetPriceSnapshot.btcPrice)
    data.amountETHUSD = data.amountETH.times(assetPriceSnapshot.ethPrice)

    data.totalRemovedUSD = data.amountUSD.plus(data.amountBTCUSD).plus(data.amountETHUSD)
    data.save()

}


export function handleRemoveLiquidityOne(event: RemoveLiquidityOne): void {

    const tricrypto2Snapshot = poolSnapshot(event)
    tricrypto2Snapshot.save()
    const assetPriceSnapshot = priceSnapshot(event)
    assetPriceSnapshot.save()

    // parse event:
    const data = new RemoveLiquidityEvent(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
    data.blockNumber = event.block.number
    data.timestamp = event.block.timestamp
    data.address = event.params.provider
    data.txHash = event.transaction.hash
    data.assetPrices = assetPriceSnapshot.id
    data.poolSnapshot = tricrypto2Snapshot.id

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
        data.amountBTCUSD = data.amountBTC.times(assetPriceSnapshot.btcPrice)
    }
    if (coinID == ETHID) {
        data.amountETH = coinAmount.toBigDecimal().div(BIG_DECIMAL_1E18)
        data.amountETHUSD = data.amountETH.times(assetPriceSnapshot.ethPrice)
    }
    data.totalRemovedUSD = data.amountUSD.plus(data.amountBTCUSD).plus(data.amountETHUSD)
    data.save()
}



export function handleClaimAdminFee(event: ClaimAdminFee): void {

    const tricrypto2Snapshot = poolSnapshot(event)
    tricrypto2Snapshot.save()
    const assetPriceSnapshot = priceSnapshot(event)
    assetPriceSnapshot.save()

    // parse event:
    const data = new ClaimAdminFeeEvent(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
    data.assetPrices = assetPriceSnapshot.id
    data.poolSnapshot = tricrypto2Snapshot.id
    data.blockNumber = event.block.number
    data.timestamp = event.block.timestamp
    data.txHash = event.transaction.hash
    data.amountClaimed = event.params.tokens.toBigDecimal().div(BIG_DECIMAL_1E18)
    data.claimDollarValue = assetPriceSnapshot.crv3cryptoUSD.times(data.amountClaimed)
    data.save()

}