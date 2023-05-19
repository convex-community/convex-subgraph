import { BigDecimal, BigInt } from '@graphprotocol/graph-ts'
import { BIG_DECIMAL_ONE, BIG_DECIMAL_TWO, BIG_INT_ONE, BIG_INT_ZERO } from 'const'

export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
  let bd = BigDecimal.fromString('1')
  for (let i = BIG_INT_ZERO; i.lt(decimals as BigInt); i = i.plus(BIG_INT_ONE)) {
    bd = bd.times(BigDecimal.fromString('10'))
  }
  return bd
}

export function exponentToBigInt(decimals: BigInt): BigInt {
  let bd = BigInt.fromString('1')
  for (let i = BIG_INT_ZERO; i.lt(decimals as BigInt); i = i.plus(BIG_INT_ONE)) {
    bd = bd.times(BigInt.fromString('10'))
  }
  return bd
}

export function pow(base: BigDecimal, exp: i32): BigDecimal {
  let res = BigDecimal.fromString('1')
  for (let i = 0; i < exp; i++) {
    res = res.times(base)
  }
  return res
}
// a fast approximation of (1 + rate)^exponent
// https://github.com/messari/subgraphs/blob/fa253e06de13f9b78849efe8da3481d53d92620a/subgraphs/_reference_/src/common/utils/numbers.ts
export function bigDecimalExponential(rate: BigDecimal, exponent: BigDecimal): BigDecimal {
  // binomial expansion to obtain (1 + x)^n : (1 + rate)^exponent
  // 1 + n *x + (n/2*(n-1))*x**2+(n/6*(n-1)*(n-2))*x**3+(n/12*(n-1)*(n-2)*(n-3))*x**4
  // this is less precise, but more efficient than `powerBigDecimal` when power is big
  const firstTerm = exponent.times(rate)
  const secondTerm = exponent.div(BIG_DECIMAL_TWO).times(exponent.minus(BIG_DECIMAL_ONE)).times(rate.times(rate))
  const thirdTerm = exponent
    .div(BigDecimal.fromString('6'))
    .times(exponent.minus(BIG_DECIMAL_TWO))
    .times(rate.times(rate).times(rate))
  const fourthTerm = exponent
    .div(BigDecimal.fromString('12'))
    .times(exponent.minus(BigDecimal.fromString('3')))
    .times(rate.times(rate).times(rate).times(rate))
  return firstTerm.plus(secondTerm).plus(thirdTerm).plus(fourthTerm)
}
