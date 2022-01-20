import { Add_poolCall } from '../generated/CurveRegistryV2/CurveRegistryV2'
import { log } from '@graphprotocol/graph-ts/index'
import { createNewRegistryPool } from './services/pools'
import { ADDRESS_ZERO } from '../../../packages/constants'
import { TokenExchange } from '../generated/templates/CurvePoolTemplateV2/CurvePoolV2'
import { handleExchange } from './services/swaps'

export function handleAddRegistryV2Pool(call: Add_poolCall): void {
  log.debug('New registry v2 pool {} deployed at {}', [
    call.inputs._pool.toHexString(),
    call.transaction.hash.toHexString(),
  ])
  createNewRegistryPool(
    call.inputs._pool,
    ADDRESS_ZERO,
    call.inputs._lp_token,
    false,
    true,
    call.block.timestamp,
    call.block.number,
    call.transaction.hash
  )
}

export function handleTokenExchangeV2(event: TokenExchange): void {
  log.debug('swap for v2 pool: {} at {}', [event.address.toHexString(), event.transaction.hash.toHexString()])
  const trade = event.params
  handleExchange(
    trade.buyer,
    trade.sold_id,
    trade.bought_id,
    trade.tokens_sold,
    trade.tokens_bought,
    event.block.timestamp,
    event.block.number,
    event.address,
    event.transaction.hash,
    false
  )
}
