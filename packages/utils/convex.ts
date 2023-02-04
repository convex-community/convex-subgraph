import { BigDecimal } from '@graphprotocol/graph-ts/index'
import { ERC20 } from 'convex/generated/Booster/ERC20'
import { Address } from '@graphprotocol/graph-ts'

export const CVX_CLIFF_SIZE = BigDecimal.fromString('100000') // * 1e18; //new cliff every 100,000 tokens
export const CVX_CLIFF_COUNT = BigDecimal.fromString('1000') // 1,000 cliffs
export const CVX_MAX_SUPPLY = BigDecimal.fromString('100000000') // * 1e18; //100 mil max supply
const CVX_ADDRESS = Address.fromString('0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B')

export function getCvxMintAmount(crvEarned: BigDecimal): BigDecimal {
  const cvxSupplyResult = ERC20.bind(CVX_ADDRESS).try_totalSupply()
  if (!cvxSupplyResult.reverted) {
    const cvxSupply = cvxSupplyResult.value.toBigDecimal().div(BigDecimal.fromString('1e18'))
    const currentCliff = cvxSupply.div(CVX_CLIFF_SIZE)
    if (currentCliff.lt(CVX_CLIFF_COUNT)) {
      const remaining = CVX_CLIFF_COUNT.minus(currentCliff)
      let cvxEarned = crvEarned.times(remaining).div(CVX_CLIFF_COUNT)
      const amountTillMax = CVX_MAX_SUPPLY.minus(cvxSupply)
      if (cvxEarned.gt(amountTillMax)) {
        cvxEarned = amountTillMax
      }
      return cvxEarned
    }
  }
  return BigDecimal.zero()
}
