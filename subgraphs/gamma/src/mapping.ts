import { BigInt } from '@graphprotocol/graph-ts'
import { CurveRegistryV2, PoolAdded, PoolRemoved } from '../generated/CurveRegistryV2/CurveRegistryV2'
import { ExampleEntity } from '../generated/schema'

export function handlePoolAdded(event: PoolAdded): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  let entity = ExampleEntity.load(event.transaction.from.toHex())

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (!entity) {
    entity = new ExampleEntity(event.transaction.from.toHex())

    // Entity fields can be set using simple assignments
    entity.count = BigInt.fromI32(0)
  }

  // BigInt and BigDecimal math are supported
  entity.count = entity.count + BigInt.fromI32(1)

  // Entity fields can be set based on event parameters
  entity.pool = event.params.pool

  // Entities can be written to the store with `.save()`
  entity.save()

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract.find_pool_for_coins(...)
  // - contract.find_pool_for_coins(...)
  // - contract.get_n_coins(...)
  // - contract.get_coins(...)
  // - contract.get_decimals(...)
  // - contract.get_gauges(...)
  // - contract.get_balances(...)
  // - contract.get_virtual_price_from_lp_token(...)
  // - contract.get_A(...)
  // - contract.get_D(...)
  // - contract.get_gamma(...)
  // - contract.get_fees(...)
  // - contract.get_admin_balances(...)
  // - contract.get_coin_indices(...)
  // - contract.get_pool_name(...)
  // - contract.get_coin_swap_count(...)
  // - contract.get_coin_swap_complement(...)
  // - contract.address_provider(...)
  // - contract.pool_list(...)
  // - contract.pool_count(...)
  // - contract.coin_count(...)
  // - contract.get_coin(...)
  // - contract.get_pool_from_lp_token(...)
  // - contract.get_lp_token(...)
  // - contract.last_updated(...)
}
