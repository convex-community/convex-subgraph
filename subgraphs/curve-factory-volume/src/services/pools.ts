import { FactoryPool } from '../../generated/templates'
import { BasePool, Pool } from '../../generated/schema'
import { BigInt } from '@graphprotocol/graph-ts/index'
import { Address, Bytes, log } from '@graphprotocol/graph-ts'
import { getDecimals } from '../../../../packages/utils/pricing'
import { getPlatform } from './platform'
import { BIG_INT_ONE, CURVE_FACTORY_V1, CURVE_FACTORY_V2 } from '../../../../packages/constants'
import { CurveFactoryV2 } from '../../generated/CurveFactoryV2/CurveFactoryV2'
import { CurveFactoryV1 } from '../../generated/CurveFactoryV1/CurveFactoryV1'
import { CurvePool } from '../../generated/templates/FactoryPool/CurvePool'
import { CurvePoolCoin128 } from '../../generated/templates/FactoryPool/CurvePoolCoin128'

export function createNewPool(
  version: i32,
  metapool: boolean,
  basePool: Address,
  timestamp: BigInt,
  block: BigInt,
  tx: Bytes
): void {
  const platform = getPlatform()
  let poolCount: BigInt
  let factoryPool: Address
  if (version == 2) {
    const factory = CurveFactoryV2.bind(CURVE_FACTORY_V2)
    poolCount = platform.poolCountV2
    factoryPool = factory.pool_list(poolCount)
    log.info('New factory pool added (v2) {} with id {}', [factoryPool.toHexString(), poolCount.toString()])
    platform.poolCountV2 = platform.poolCountV2.plus(BIG_INT_ONE)
  } else {
    const factory = CurveFactoryV1.bind(CURVE_FACTORY_V1)
    poolCount = platform.poolCountV1
    factoryPool = factory.pool_list(poolCount)
    log.info('New factory pool added (v1) {} with id {}', [factoryPool.toHexString(), poolCount.toString()])
    platform.poolCountV1 = platform.poolCountV1.plus(BIG_INT_ONE)
  }
  platform.save()

  FactoryPool.create(factoryPool)
  const pool = new Pool(factoryPool.toHexString())
  const poolContract = CurvePool.bind(factoryPool)
  pool.name = poolContract.name()
  pool.platform = platform.id
  pool.symbol = poolContract.symbol()
  pool.metapool = metapool
  pool.address = factoryPool
  pool.creationBlock = block
  pool.creationTx = tx
  pool.creationDate = timestamp
  pool.assetType = getAssetType(pool.name, pool.symbol)
  pool.basePool = basePool

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
  pool.coinDecimals = coinDecimals
  pool.save()
}

export function getPoolCoins128(pool: BasePool): BasePool {
  const poolContract = CurvePoolCoin128.bind(Address.fromString(pool.id))
  let i = 0
  const coins = pool.coins
  const coinDecimals = pool.coinDecimals
  let coinResult = poolContract.try_coins(BigInt.fromI32(i))
  if (coinResult.reverted) {
    log.warning('Call to int128 coins failed for {}', [pool.id])
  }
  while (!coinResult.reverted) {
    coins.push(coinResult.value)
    coinDecimals.push(getDecimals(coinResult.value))
    i += 1
    coinResult = poolContract.try_coins(BigInt.fromI32(i))
  }
  pool.coins = coins
  pool.coinDecimals = coinDecimals
  pool.save()
  return pool
}

export function getBasePool(pool: Address): BasePool {
  let basePool = BasePool.load(pool.toHexString())
  if (!basePool) {
    log.info('Adding new base pool : {}', [pool.toHexString()])
    basePool = new BasePool(pool.toHexString())
    const poolContract = CurvePool.bind(pool)
    const coins = basePool.coins
    const coinDecimals = basePool.coinDecimals
    let i = 0
    let coinResult = poolContract.try_coins(BigInt.fromI32(i))

    if (coinResult.reverted) {
      // some pools require an int128 for coins and will revert with the
      // regular abi. e.g. 0x7fc77b5c7614e1533320ea6ddc2eb61fa00a9714
      log.debug('Call to coins reverted for pool ({}), attempting 128 bytes call', [basePool.id])
      return getPoolCoins128(basePool)
    }

    while (!coinResult.reverted) {
      coins.push(coinResult.value)
      coinDecimals.push(getDecimals(coinResult.value))
      i += 1
      coinResult = poolContract.try_coins(BigInt.fromI32(i))
    }
    basePool.coins = coins
    basePool.coinDecimals = coinDecimals
    basePool.save()
  }
  return basePool
}

export function getAssetType(name: string, symbol: string): i32 {
  const description = name.toUpperCase() + '-' + name.toUpperCase()
  if (description.indexOf('USD') >= 0 || description.indexOf('DAI') >= 0) {
    return 0
  } else if (description.indexOf('BTC') >= 0) {
    return 2
  } else if (description.indexOf('ETH') >= 0) {
    return 1
  } else {
    return 3
  }
}
