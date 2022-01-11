import { createNewPool } from './services/pools'
import { handleExchange } from './services/swaps'
import { ADDRESS_ZERO, CURVE_FACTORY_V2 } from '../../../packages/constants'
import { PlainPoolDeployed } from '../generated/CurveFactoryV2/CurveFactoryV2'
import { MetaPoolDeployed } from '../generated/CurveFactoryV1/CurveFactoryV1'
import { TokenExchange, TokenExchangeUnderlying } from '../generated/templates/FactoryPool/CurvePool'

export function handlePlainPoolDeployed(event: PlainPoolDeployed): void {
  createNewPool(2, false, ADDRESS_ZERO, event.block.timestamp, event.block.number, event.transaction.hash)
}

export function handleMetaPoolDeployed(event: MetaPoolDeployed): void {
  let version = 1
  if (event.address == CURVE_FACTORY_V2) {
    version = 2
  }
  createNewPool(
    version,
    true,
    event.params.base_pool,
    event.block.timestamp,
    event.block.number,
    event.transaction.hash
  )
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
    event.transaction.hash,
    false
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
    event.transaction.hash,
    true
  )
}
