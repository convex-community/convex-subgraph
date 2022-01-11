import { PlainPoolDeployed, MetaPoolDeployed } from '../generated/CurveFactory/CurveFactory'

import { createNewPool } from './services/pools'
import { TokenExchangeUnderlying, TokenExchange } from '../generated/templates/BasePool/CurvePool'
import { handleExchange } from './services/swaps'

export function handlePlainPoolDeployed(event: PlainPoolDeployed): void {
  createNewPool(false, event.block.timestamp, event.block.number, event.transaction.hash)
}

export function handleMetaPoolDeployed(event: MetaPoolDeployed): void {
  createNewPool(true, event.block.timestamp, event.block.number, event.transaction.hash)
}

export function handleTokenExchange(event: TokenExchange): void {
  const trade = event.params
  handleExchange(
    trade.sold_id,
    trade.bought_id,
    trade.tokens_sold,
    trade.tokens_bought,
    event.block.timestamp,
    event.address,
    event.transaction.hash
  )
}

export function handleTokenExchangeUnderlying(event: TokenExchangeUnderlying): void {
  const trade = event.params
  handleExchange(
    trade.sold_id,
    trade.bought_id,
    trade.tokens_sold,
    trade.tokens_bought,
    event.block.timestamp,
    event.address,
    event.transaction.hash
  )
}
