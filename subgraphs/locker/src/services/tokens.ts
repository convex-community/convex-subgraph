import { ETH_TOKEN_ADDRESS } from '@protofire/subgraph-toolkit'
import { BigInt, Address } from '@graphprotocol/graph-ts/index'
import { Token } from '../../generated/schema'
import { ERC20 } from 'convex/generated/Booster/ERC20'

class TokenInfo {
  constructor(readonly name: string | null, readonly symbol: string | null, readonly decimals: BigInt) {}
}

export function getOrCreateToken(address: Address): Token {
  let token = Token.load(address.toHexString())

  if (token == null) {
    token = new Token(address.toHexString())
    token.address = address

    if (token.id == ETH_TOKEN_ADDRESS) {
      token.name = 'Ether'
      token.symbol = 'ETH'
      token.decimals = new BigInt(18)
    } else {
      const info = getTokenInfo(address)

      token.name = info.name
      token.symbol = info.symbol
      token.decimals = info.decimals
    }

    token.save()
  }
  return token
}

function getTokenInfo(address: Address): TokenInfo {
  const erc20 = ERC20.bind(address)

  const name = erc20.try_name()
  const symbol = erc20.try_symbol()
  const decimals = erc20.try_decimals()

  return new TokenInfo(
    name.reverted ? '' : name.value.toString(),
    symbol.reverted ? '' : symbol.value.toString(),
    decimals.reverted ? new BigInt(18) : BigInt.fromI32(decimals.value)
  )
}
