import { createNewPool } from './services/pools'
import { handleExchange } from './services/swaps'
import { ADDRESS_ZERO, BIG_INT_ONE, CURVE_FACTORY_V2 } from '../../../packages/constants'
import { Add_existing_metapoolsCall, PlainPoolDeployed } from '../generated/CurveFactoryV2/CurveFactoryV2'
import { MetaPoolDeployed } from '../generated/CurveFactoryV1/CurveFactoryV1'
import { TokenExchange, TokenExchangeUnderlying } from '../generated/templates/FactoryPool/CurvePool'
import { log } from '@graphprotocol/graph-ts'
import { Add_existing_metapoolsCall__Outputs } from '../generated/CurveFactoryV1/CurveFactoryV2'
import { getPlatform } from './services/platform'

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
  log.debug('Underlying swap for pool: {} at {}', [event.address.toHexString(), event.transaction.hash.toHexString()])
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

export function handleAddExistingMetaPools(call: Add_existing_metapoolsCall): void {
  // This is needed because we keep an internal count of the number of pools in
  // each factory contract's pool_list. The internal accounting, in turn, is
  // needed because events don't give the address of newly deployed pool and we
  // can't use pool_count to grab the latest deployed pool, because several
  // pools may be deployed in the same block (in which case we'd miss all the
  // previous pools aand only record the last.
  const pools = call.inputs._pools
  const platform = getPlatform()
  for (let i = 0; i < pools.length; i++) {
    if (pools[i] == ADDRESS_ZERO) {
      break
    }
    platform.poolCountV2 = platform.poolCountV2.plus(BIG_INT_ONE)
    log.info('Existing metapool {} added to v2 factory contract at {} ({})', [
      pools[i].toHexString(),
      call.transaction.hash.toHexString(),
      i.toString(),
    ])
  }
  platform.save()
}
