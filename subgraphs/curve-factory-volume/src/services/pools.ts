import { BasePool } from '../../generated/templates'
import { Pool } from '../../generated/schema'
import { BigInt } from '@graphprotocol/graph-ts/index'
import { Address, Bytes } from '@graphprotocol/graph-ts'
import { getDecimals } from '../../../../packages/utils/pricing'
import { CurvePool } from '../../generated/templates/BasePool/CurvePool'

export function createNewPool(basePool: Address, metapool: boolean, timestamp: BigInt, block: BigInt, tx: Bytes): void {
  BasePool.create(basePool)
  const pool = new Pool(basePool.toHexString())
  const poolContract = CurvePool.bind(basePool)
  pool.name = poolContract.name()
  pool.symbol = poolContract.symbol()
  pool.metapool = metapool
  pool.address = basePool
  pool.creationBlock = block
  pool.creationTx = tx
  pool.creationDate = timestamp
  pool.assetType = getAssetType(pool.name, pool.symbol)

  const coins = pool.coins
  const coinDecimals = pool.coinDecimals
  let i = 0
  let coinResult = poolContract.try_coins(BigInt.fromI32(i))
  while (!coinResult.reverted) {
    coins.push(coinResult.value)
    coinDecimals.push(getDecimals(coinResult.value))
    i += 1
    coinResult = poolContract.try_coins(BigInt.fromI32(i))
  }
  pool.coins = coins
  pool.save()
}

export function getAssetType(name: string, symbol: string): i32 {
  const description = name.toUpperCase() + '-' + name.toUpperCase()
  if (description.indexOf('BTC') >= 0) {
    return 2
  } else if (description.indexOf('ETH') >= 0) {
    return 1
  } else if (description.indexOf('USD') >= 0 || description.indexOf('DAI') >= 0) {
    return 0
  } else {
    return 3
  }
}
