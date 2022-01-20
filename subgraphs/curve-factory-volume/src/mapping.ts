import { createNewFactoryPool, createNewRegistryPool } from './services/pools'
import { handleExchange } from './services/swaps'
import { ADDRESS_ZERO, BIG_INT_ONE, CURVE_FACTORY_V1_2 } from '../../../packages/constants'
import { Add_existing_metapoolsCall, PlainPoolDeployed } from '../generated/CurveFactoryV12/CurveFactoryV12'
import { MetaPoolDeployed } from '../generated/CurveFactoryV10/CurveFactoryV10'
import {
  TokenExchange,
  TokenExchangeUnderlying,
  AddLiquidity,
  Remove_liquidity_one_coinCall,
  RemoveLiquidity,
  RemoveLiquidityImbalance,
} from '../generated/templates/CurvePoolTemplate/CurvePool'
import { log } from '@graphprotocol/graph-ts'
import { getPlatform } from './services/platform'
import {
  processAddLiquidity,
  processRemoveLiquidity,
  processRemoveLiquidityOneCall,
  processRemoveLiquidityImbalance,
} from './services/liquidity'
import { Add_metapoolCall, Add_pool_without_underlyingCall } from '../generated/CurveRegistryV1/CurveRegistryV1'

export function handlePlainPoolDeployed(event: PlainPoolDeployed): void {
  log.debug('New factory plain pool deployed at {}', [event.transaction.hash.toHexString()])
  createNewFactoryPool(12, false, ADDRESS_ZERO, event.block.timestamp, event.block.number, event.transaction.hash)
}

export function handleAddRegistryV1MetaPool(call: Add_metapoolCall): void {
  log.debug('New meta pool {} added from registry at {}', [
    call.inputs._pool.toHexString(),
    call.transaction.hash.toHexString(),
  ])
  createNewRegistryPool(
    call.inputs._pool,
    call.inputs._base_pool,
    call.inputs._lp_token,
    true,
    false,
    call.block.timestamp,
    call.block.number,
    call.transaction.hash
  )
}

export function handleAddRegistryV1PlainPool(call: Add_pool_without_underlyingCall): void {
  log.debug('New plain pool {} added from registry at {}', [
    call.inputs._pool.toHexString(),
    call.transaction.hash.toHexString(),
  ])
  createNewRegistryPool(
    call.inputs._pool,
    ADDRESS_ZERO,
    call.inputs._lp_token,
    false,
    false,
    call.block.timestamp,
    call.block.number,
    call.transaction.hash
  )
}

export function handleMetaPoolDeployed(event: MetaPoolDeployed): void {
  let version = 10
  if (event.address == CURVE_FACTORY_V1_2) {
    version = 12
  }
  log.debug('New meta pool (version {}), basepool: {}, deployed at {}', [
    version.toString(),
    event.params.base_pool.toHexString(),
    event.transaction.hash.toHexString(),
  ])
  createNewFactoryPool(
    version,
    true,
    event.params.base_pool,
    event.block.timestamp,
    event.block.number,
    event.transaction.hash
  )
}

export function handleTokenExchange(event: TokenExchange): void {
  log.debug('Plain swap for pool: {} at {}', [event.address.toHexString(), event.transaction.hash.toHexString()])
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

export function handleTokenExchangeUnderlying(event: TokenExchangeUnderlying): void {
  log.debug('Underlying swap for pool: {} at {}', [event.address.toHexString(), event.transaction.hash.toHexString()])
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
    platform.poolCountV12 = platform.poolCountV12.plus(BIG_INT_ONE)
    log.info('Existing meta pool {} added to v1.2 factory contract at {} ({})', [
      pools[i].toHexString(),
      call.transaction.hash.toHexString(),
      i.toString(),
    ])
  }
  platform.save()
}

// Liquidity events
export function handleAddLiquidity(event: AddLiquidity): void {
  log.debug('Added liquidity for pool: {} at {}', [event.address.toHexString(), event.transaction.hash.toHexString()])
  processAddLiquidity(event)
}

export function handleRemoveLiquidity(event: RemoveLiquidity): void {
  log.debug('Removed liquidity for pool: {} at {}', [event.address.toHexString(), event.transaction.hash.toHexString()])
  processRemoveLiquidity(event)
}

export function handleRemoveLiquidityImbalance(event: RemoveLiquidityImbalance): void {
  log.debug('Removed liquidity for pool: {} at {}', [event.address.toHexString(), event.transaction.hash.toHexString()])
  processRemoveLiquidityImbalance(event)
}

export function handleRemoveLiquidityOne(call: Remove_liquidity_one_coinCall): void {
  log.debug('Removed liquidity for pool: {} at {}', [call.to.toHexString(), call.transaction.hash.toHexString()])
  processRemoveLiquidityOneCall(call)
}
