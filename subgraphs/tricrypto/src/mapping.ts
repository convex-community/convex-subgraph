import { AddLiquidityEvent, RemoveLiquidityEvent, ExchangeEvent, ClaimAdminFeeEvent } from '../generated/schema'
import {
  ClaimAdminFee,
  AddLiquidity,
  RemoveLiquidity,
  RemoveLiquidityOne,
  TokenExchange,
} from '../generated/Tricrypto2/Tricrypto2'

import { ETHID, WBTCID, USDTID, getPoolSnapshot, getPriceSnapshot } from './services/poolUtils'
import { BIG_DECIMAL_1E18, BIG_DECIMAL_1E6, BIG_DECIMAL_1E8, BIG_DECIMAL_ONE } from '../../../packages/constants'

export function handleTokenExchange(event: TokenExchange): void {
  const tricrypto2Snapshot = getPoolSnapshot(event)
  tricrypto2Snapshot.save()
  const assetPriceSnapshot = getPriceSnapshot(event)
  assetPriceSnapshot.save()

  // parse event:
  const exchangeEvent = new ExchangeEvent(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
  exchangeEvent.blockNumber = event.block.number
  exchangeEvent.timestamp = event.block.timestamp
  exchangeEvent.address = event.params.buyer
  exchangeEvent.txHash = event.transaction.hash
  exchangeEvent.assetPrices = assetPriceSnapshot.id
  exchangeEvent.poolSnapshot = tricrypto2Snapshot.id

  const soldID = event.params.sold_id
  const boughtID = event.params.bought_id
  const amountSold = event.params.tokens_sold
  const amountBought = event.params.tokens_bought

  if (soldID == USDTID) {
    exchangeEvent.amountUSDSold = amountSold.toBigDecimal().div(BIG_DECIMAL_1E6)
  }
  if (soldID == WBTCID) {
    exchangeEvent.amountBTCSold = amountSold.toBigDecimal().div(BIG_DECIMAL_1E8)
    exchangeEvent.amountBTCSoldUSD = exchangeEvent.amountBTCSold.times(assetPriceSnapshot.btcPrice)
  }
  if (soldID == ETHID) {
    exchangeEvent.amountETHSold = amountSold.toBigDecimal().div(BIG_DECIMAL_1E18)
    exchangeEvent.amountETHSoldUSD = exchangeEvent.amountETHSold.times(assetPriceSnapshot.ethPrice)
  }

  if (boughtID == USDTID) {
    exchangeEvent.amountUSDBought = amountBought.toBigDecimal().div(BIG_DECIMAL_1E6)
  }
  if (boughtID == WBTCID) {
    exchangeEvent.amountBTCBought = amountBought.toBigDecimal().div(BIG_DECIMAL_1E8)
    exchangeEvent.amountBTCBoughtUSD = exchangeEvent.amountBTCBought.times(assetPriceSnapshot.btcPrice)
  }
  if (boughtID == ETHID) {
    exchangeEvent.amountETHBought = amountBought.toBigDecimal().div(BIG_DECIMAL_1E18)
    exchangeEvent.amountETHBoughtUSD = exchangeEvent.amountETHBought.times(assetPriceSnapshot.ethPrice)
  }

  // get totals but in dollar-value:
  exchangeEvent.totalBoughtUSD = exchangeEvent.amountUSDBought
    .plus(exchangeEvent.amountBTCBoughtUSD)
    .plus(exchangeEvent.amountETHBoughtUSD)
  exchangeEvent.totalSoldUSD = exchangeEvent.amountUSDSold
    .plus(exchangeEvent.amountBTCSoldUSD)
    .plus(exchangeEvent.amountETHSoldUSD)

  // get trader fees and lp fees:
  // trader fees: in line 658 of tricrypto2 contract: dy -= self._fee(xp) * dy / 10**10
  // while the contract uses self._fee(xp): calculating xp is a bit more complex. we approximate
  // by just using the feeFraction. This means, dy (without fees subtracted is):
  // tokenOutUSD / (1-feeFraction)
  // so fee: outWithoutFees - outWithFees
  const totalOutUSDnoFee = exchangeEvent.totalBoughtUSD.div(BIG_DECIMAL_ONE.minus(tricrypto2Snapshot.feeFraction))
  exchangeEvent.traderFeesUSD = totalOutUSDnoFee.minus(exchangeEvent.totalBoughtUSD)

  exchangeEvent.save()
}

export function handleAddLiquidity(event: AddLiquidity): void {
  const tricrypto2Snapshot = getPoolSnapshot(event)
  tricrypto2Snapshot.save()
  const assetPriceSnapshot = getPriceSnapshot(event)
  assetPriceSnapshot.save()

  // parse event:
  const addLiquidityEvent = new AddLiquidityEvent(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
  addLiquidityEvent.blockNumber = event.block.number
  addLiquidityEvent.timestamp = event.block.timestamp
  addLiquidityEvent.address = event.params.provider
  addLiquidityEvent.txHash = event.transaction.hash
  addLiquidityEvent.assetPrices = assetPriceSnapshot.id
  addLiquidityEvent.poolSnapshot = tricrypto2Snapshot.id

  const tokenAmounts = event.params.token_amounts

  addLiquidityEvent.amountUSD = tokenAmounts[0].toBigDecimal().div(BIG_DECIMAL_1E6)
  addLiquidityEvent.amountBTC = tokenAmounts[1].toBigDecimal().div(BIG_DECIMAL_1E8)
  addLiquidityEvent.amountETH = tokenAmounts[2].toBigDecimal().div(BIG_DECIMAL_1E18)
  addLiquidityEvent.amountBTCUSD = addLiquidityEvent.amountBTC.times(assetPriceSnapshot.btcPrice)
  addLiquidityEvent.amountETHUSD = addLiquidityEvent.amountETH.times(assetPriceSnapshot.ethPrice)
  addLiquidityEvent.totalAddedUSD = addLiquidityEvent.amountUSD
    .plus(addLiquidityEvent.amountETHUSD)
    .plus(addLiquidityEvent.amountBTCUSD)
  addLiquidityEvent.save()
}

export function handleRemoveLiquidity(event: RemoveLiquidity): void {
  const tricrypto2Snapshot = getPoolSnapshot(event)
  tricrypto2Snapshot.save()
  const assetPriceSnapshot = getPriceSnapshot(event)
  assetPriceSnapshot.save()

  // parse event:
  const removeLiquidityEvent = new RemoveLiquidityEvent(
    event.transaction.hash.toHex() + '-' + event.logIndex.toString()
  )
  removeLiquidityEvent.blockNumber = event.block.number
  removeLiquidityEvent.timestamp = event.block.timestamp
  removeLiquidityEvent.address = event.params.provider
  removeLiquidityEvent.txHash = event.transaction.hash
  removeLiquidityEvent.assetPrices = assetPriceSnapshot.id
  removeLiquidityEvent.poolSnapshot = tricrypto2Snapshot.id

  const tokenAmounts = event.params.token_amounts
  removeLiquidityEvent.amountUSD = tokenAmounts[USDTID.toI32()].toBigDecimal().div(BIG_DECIMAL_1E6)
  removeLiquidityEvent.amountBTC = tokenAmounts[WBTCID.toI32()].toBigDecimal().div(BIG_DECIMAL_1E6)
  removeLiquidityEvent.amountETH = tokenAmounts[ETHID.toI32()].toBigDecimal().div(BIG_DECIMAL_1E18)
  removeLiquidityEvent.amountBTCUSD = removeLiquidityEvent.amountBTC.times(assetPriceSnapshot.btcPrice)
  removeLiquidityEvent.amountETHUSD = removeLiquidityEvent.amountETH.times(assetPriceSnapshot.ethPrice)

  removeLiquidityEvent.totalRemovedUSD = removeLiquidityEvent.amountUSD
    .plus(removeLiquidityEvent.amountBTCUSD)
    .plus(removeLiquidityEvent.amountETHUSD)
  removeLiquidityEvent.save()
}

export function handleRemoveLiquidityOne(event: RemoveLiquidityOne): void {
  const tricrypto2Snapshot = getPoolSnapshot(event)
  tricrypto2Snapshot.save()
  const assetPriceSnapshot = getPriceSnapshot(event)
  assetPriceSnapshot.save()

  // parse event:
  const removeLiquidityEvent = new RemoveLiquidityEvent(
    event.transaction.hash.toHex() + '-' + event.logIndex.toString()
  )
  removeLiquidityEvent.blockNumber = event.block.number
  removeLiquidityEvent.timestamp = event.block.timestamp
  removeLiquidityEvent.address = event.params.provider
  removeLiquidityEvent.txHash = event.transaction.hash
  removeLiquidityEvent.assetPrices = assetPriceSnapshot.id
  removeLiquidityEvent.poolSnapshot = tricrypto2Snapshot.id

  const coinAmount = event.params.coin_amount
  const coinID = event.params.coin_index

  if (coinID == USDTID) {
    removeLiquidityEvent.amountUSD = coinAmount.toBigDecimal().div(BIG_DECIMAL_1E6)
  }
  if (coinID == WBTCID) {
    removeLiquidityEvent.amountBTC = coinAmount.toBigDecimal().div(BIG_DECIMAL_1E6)
    removeLiquidityEvent.amountBTCUSD = removeLiquidityEvent.amountBTC.times(assetPriceSnapshot.btcPrice)
  }
  if (coinID == ETHID) {
    removeLiquidityEvent.amountETH = coinAmount.toBigDecimal().div(BIG_DECIMAL_1E18)
    removeLiquidityEvent.amountETHUSD = removeLiquidityEvent.amountETH.times(assetPriceSnapshot.ethPrice)
  }
  removeLiquidityEvent.totalRemovedUSD = removeLiquidityEvent.amountUSD
    .plus(removeLiquidityEvent.amountBTCUSD)
    .plus(removeLiquidityEvent.amountETHUSD)
  removeLiquidityEvent.save()
}

export function handleClaimAdminFee(event: ClaimAdminFee): void {
  const tricrypto2Snapshot = getPoolSnapshot(event)
  tricrypto2Snapshot.save()
  const assetPriceSnapshot = getPriceSnapshot(event)
  assetPriceSnapshot.save()

  // parse event:
  const claimAdminFeeEvent = new ClaimAdminFeeEvent(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
  claimAdminFeeEvent.assetPrices = assetPriceSnapshot.id
  claimAdminFeeEvent.poolSnapshot = tricrypto2Snapshot.id
  claimAdminFeeEvent.blockNumber = event.block.number
  claimAdminFeeEvent.timestamp = event.block.timestamp
  claimAdminFeeEvent.txHash = event.transaction.hash
  claimAdminFeeEvent.amountClaimed = event.params.tokens.toBigDecimal().div(BIG_DECIMAL_1E18)
  claimAdminFeeEvent.claimDollarValue = assetPriceSnapshot.crv3cryptoUSD.times(claimAdminFeeEvent.amountClaimed)
  claimAdminFeeEvent.save()
}
