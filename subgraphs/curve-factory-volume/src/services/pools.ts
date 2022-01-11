import { BasePool } from '../../generated/templates'
import { Pool } from '../../generated/schema'
import { BigInt } from '@graphprotocol/graph-ts/index'
import { Address, Bytes } from '@graphprotocol/graph-ts'
import { getDecimals } from '../../../../packages/utils/pricing'
import { CurvePool } from '../../generated/templates/BasePool/CurvePool'
import { getPlatform } from './platform'
import { BIG_INT_ONE, CURVE_FACTORY_V1, CURVE_FACTORY_V2 } from '../../../../packages/constants'
import { CurveFactoryV2 } from '../../generated/CurveFactoryV2/CurveFactoryV2'
import { CurveFactoryV1 } from '../../generated/CurveFactoryV1/CurveFactoryV1'

export function createNewPool(version: i32, metapool: boolean, timestamp: BigInt, block: BigInt, tx: Bytes): void {
  const platform = getPlatform()
  let poolCount: BigInt
  let basePool: Address
  if (version == 2) {
    const factory = CurveFactoryV2.bind(CURVE_FACTORY_V2)
    poolCount = platform.poolCountV2
    basePool = factory.pool_list(poolCount)
    platform.poolCountV2 = platform.poolCountV2.plus(BIG_INT_ONE)
  } else {
    const factory = CurveFactoryV1.bind(CURVE_FACTORY_V1)
    poolCount = platform.poolCountV1
    basePool = factory.pool_list(poolCount)
    platform.poolCountV1 = platform.poolCountV1.plus(BIG_INT_ONE)
  }
  platform.save()

  BasePool.create(basePool)
  const pool = new Pool(basePool.toHexString())
  const poolContract = CurvePool.bind(basePool)
  pool.name = poolContract.name()
  pool.platform = platform.id
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
