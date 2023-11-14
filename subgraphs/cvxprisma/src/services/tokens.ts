import { ETH_TOKEN_ADDRESS } from '@protofire/subgraph-toolkit'
import { BigInt, Address } from '@graphprotocol/graph-ts/index'
import { Token, TokenPrice } from '../../generated/schema'
import { ERC20 } from '../../generated/cvxPrismaStaking/ERC20'
import { BigDecimal } from '@graphprotocol/graph-ts'
import {
  BIG_INT_ONE,
  CVX_ADDRESS,
  CVX_ETH_POOL,
  CVX_PRISMA_TOKEN_ADDRESS,
  CVXPRISMA_PRISMA_CURVE_POOL,
  PRISMA_ETH_POOL,
  PRISMA_TOKEN_ADDRESS,
  TRICRYPTONG_POOL,
  YPRISMA_PRISMA_CURVE_POOL,
  YPRISMA_TOKEN_ADDRESS,
} from 'const'
import { toDecimal } from 'utils/maths'
import { getIntervalFromTimestamp, HOUR } from 'utils/time'
import { TriCryptoNg } from '../../generated/cvxPrismaStaking/TriCryptoNg'
import { CurvePoolV2 } from '../../generated/cvxPrismaStaking/CurvePoolV2'
import { getUsdRate } from 'utils/pricing'

export function getOrCreateToken(address: Address): Token {
  let token = Token.load(address.toHexString())

  if (token == null) {
    token = new Token(address.toHexString())
    token.address = address

    if (token.id == ETH_TOKEN_ADDRESS) {
      token.symbol = 'ETH'
      token.decimals = 18
    } else {
      const erc20 = ERC20.bind(address)
      const symbol = erc20.try_symbol()
      const decimals = erc20.try_decimals()
      token.symbol = symbol.reverted ? '' : symbol.value.toString()
      token.decimals = decimals.reverted ? 18 : decimals.value
    }

    token.save()
  }
  return token
}

export function getEthPriceInUsd(): BigDecimal {
  const triCryptoContract = TriCryptoNg.bind(TRICRYPTONG_POOL)
  const priceResult = triCryptoContract.try_price_oracle(BIG_INT_ONE)
  return priceResult.reverted ? BigDecimal.zero() : toDecimal(priceResult.value, 18)
}

export function getPrismaPriceInEth(): BigDecimal {
  const prismaEthPool = CurvePoolV2.bind(PRISMA_ETH_POOL)
  const priceResult = prismaEthPool.try_price_oracle()
  return priceResult.reverted ? BigDecimal.zero() : toDecimal(priceResult.value, 18)
}

export function getCvxPriceInEth(): BigDecimal {
  const cvxEthPool = CurvePoolV2.bind(CVX_ETH_POOL)
  const priceResult = cvxEthPool.try_price_oracle()
  return priceResult.reverted ? BigDecimal.zero() : toDecimal(priceResult.value, 18)
}

export function getCvxPrismaPeg(): BigDecimal {
  const pool = CurvePoolV2.bind(CVXPRISMA_PRISMA_CURVE_POOL)
  const priceResult = pool.try_price_oracle()
  return priceResult.reverted ? BigDecimal.fromString('1') : toDecimal(priceResult.value, 18)
}

export function getYPrismaPeg(): BigDecimal {
  const pool = CurvePoolV2.bind(YPRISMA_PRISMA_CURVE_POOL)
  const priceResult = pool.try_price_oracle()
  return priceResult.reverted ? BigDecimal.fromString('1') : toDecimal(priceResult.value, 18)
}

export function getCvxPrismaPriceInEth(): BigDecimal {
  return getPrismaPriceInEth()
}

export function getTokenPrice(token: Address, timestamp: BigInt): TokenPrice {
  const hourlyTimestamp = getIntervalFromTimestamp(timestamp, HOUR)
  let tokenPrice = TokenPrice.load(token.toHexString() + timestamp.toString())
  if (tokenPrice) {
    return tokenPrice
  }
  tokenPrice = new TokenPrice(token.toHexString() + timestamp.toString())
  tokenPrice.token = getOrCreateToken(token).id
  tokenPrice.timestamp = hourlyTimestamp
  if (token == Address.fromString(ETH_TOKEN_ADDRESS)) {
    tokenPrice.price = getEthPriceInUsd()
  } else if (token == PRISMA_TOKEN_ADDRESS) {
    const ethTokenPrice = getTokenPrice(Address.fromString(ETH_TOKEN_ADDRESS), timestamp)
    const prismaEthPrice = getPrismaPriceInEth()
    tokenPrice.price = prismaEthPrice.times(ethTokenPrice.price)
  } else if (token == CVX_PRISMA_TOKEN_ADDRESS) {
    const ethTokenPrice = getTokenPrice(Address.fromString(ETH_TOKEN_ADDRESS), timestamp)
    const cvxPrismaEthPrice = getPrismaPriceInEth()
    const peg = getCvxPrismaPeg()
    tokenPrice.price = cvxPrismaEthPrice.times(ethTokenPrice.price).times(peg)
  } else if (token == YPRISMA_TOKEN_ADDRESS) {
    const ethTokenPrice = getTokenPrice(Address.fromString(ETH_TOKEN_ADDRESS), timestamp)
    const cvxPrismaEthPrice = getPrismaPriceInEth()
    const peg = getYPrismaPeg()
    tokenPrice.price = cvxPrismaEthPrice.times(ethTokenPrice.price).times(peg)
  } else if (token == CVX_ADDRESS) {
    const ethTokenPrice = getTokenPrice(Address.fromString(ETH_TOKEN_ADDRESS), timestamp)
    const cvxEthPrice = getCvxPriceInEth()
    tokenPrice.price = cvxEthPrice.times(ethTokenPrice.price)
  } else {
    tokenPrice.price = getUsdRate(token)
  }
  tokenPrice.save()
  return tokenPrice
}
