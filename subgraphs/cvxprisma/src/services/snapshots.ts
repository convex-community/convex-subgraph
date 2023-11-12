import { getIntervalFromTimestamp, HOUR } from 'utils/time'
import { Address, BigDecimal, BigInt } from '@graphprotocol/graph-ts'
import { HourlySnapshot, RewardApr } from '../../generated/schema'
import { getStakingContract } from './entities'
import { getTokenPrice } from './tokens'
import { toDecimal } from 'utils/maths'
import {
  CVX_PRISMA_STAKING_ADDRESS,
  CVX_PRISMA_TOKEN_ADDRESS,
  SECONDS_PER_YEAR,
  YPRISMA_STAKING_ADDRESS,
  YPRISMA_TOKEN_ADDRESS,
} from 'const'
import { cvxPrismaStaking } from '../../generated/cvxPrismaStaking/cvxPrismaStaking'
import { ERC20 } from '../../generated/cvxPrismaStaking/ERC20'
import { yPrismaStaking } from '../../generated/yPrismaStaking/yPrismaStaking'

export function takeCvxPrismaSnapshot(timestamp: BigInt): void {
  const hourlyTimestamp = getIntervalFromTimestamp(timestamp, HOUR)
  let snapshot = HourlySnapshot.load(timestamp.toString())
  if (snapshot) {
    return
  }
  snapshot = new HourlySnapshot(hourlyTimestamp.toString())
  snapshot.timestamp = hourlyTimestamp
  const staking = getStakingContract(CVX_PRISMA_STAKING_ADDRESS)

  snapshot.index = staking.snapshotCount
  snapshot.stakingContract = staking.id
  staking.snapshotCount += 1
  staking.save()
  const stakingContract = cvxPrismaStaking.bind(CVX_PRISMA_STAKING_ADDRESS)
  snapshot.tokenBalance = staking.tokenBalance
  snapshot.tvl = staking.tvl
  snapshot.peg = staking.peg
  snapshot.totalApr = BigDecimal.zero()
  for (let i = 0; i < staking.rewardTokens.length; i++) {
    const tokenAddress = Address.fromString(staking.rewardTokens[i])
    const rewardDataResponse = stakingContract.try_rewardData(tokenAddress)
    const rewardApr = new RewardApr(staking.id + tokenAddress.toHexString() + hourlyTimestamp.toString())
    rewardApr.stakingContract = staking.id
    rewardApr.token = tokenAddress.toHexString()
    rewardApr.snapshot = snapshot.id
    if (
      rewardDataResponse.reverted ||
      staking.tvl == BigDecimal.zero() ||
      rewardDataResponse.value.value0 < hourlyTimestamp
    ) {
      rewardApr.apr = BigDecimal.zero()
      rewardApr.save()
      continue
    }
    const rewardRate = toDecimal(rewardDataResponse.value.value1, 18)
    const rewardTokenPrice = getTokenPrice(tokenAddress, hourlyTimestamp)
    const annualRewards = rewardRate.times(SECONDS_PER_YEAR).times(rewardTokenPrice.price)
    rewardApr.apr = annualRewards.div(staking.tvl)
    rewardApr.save()
    snapshot.totalApr = snapshot.totalApr.plus(rewardApr.apr)
  }
  const cvxPrismaContract = ERC20.bind(CVX_PRISMA_TOKEN_ADDRESS)
  const totalSupply = cvxPrismaContract.try_totalSupply()
  snapshot.totalSupply = totalSupply.reverted ? BigDecimal.zero() : toDecimal(totalSupply.value, 18)
  snapshot.save()
}

export function takeYPrismaSnapshot(timestamp: BigInt): void {
  const hourlyTimestamp = getIntervalFromTimestamp(timestamp, HOUR)
  let snapshot = HourlySnapshot.load(timestamp.toString())
  if (snapshot) {
    return
  }
  snapshot = new HourlySnapshot(hourlyTimestamp.toString())
  snapshot.timestamp = hourlyTimestamp
  const staking = getStakingContract(YPRISMA_STAKING_ADDRESS)

  snapshot.index = staking.snapshotCount
  snapshot.stakingContract = staking.id
  staking.snapshotCount += 1
  staking.save()
  const stakingContract = yPrismaStaking.bind(YPRISMA_STAKING_ADDRESS)

  snapshot.tokenBalance = staking.tokenBalance
  snapshot.tvl = staking.tvl
  snapshot.peg = staking.peg
  snapshot.totalApr = BigDecimal.zero()
  for (let i = 0; i < staking.rewardTokens.length; i++) {
    const tokenAddress = Address.fromString(staking.rewardTokens[i])
    const rewardRateResponse = stakingContract.try_rewardRate()
    const periodFinishResponse = stakingContract.try_periodFinish()
    const rewardApr = new RewardApr(staking.id + tokenAddress.toHexString() + hourlyTimestamp.toString())
    rewardApr.stakingContract = staking.id
    rewardApr.token = tokenAddress.toHexString()
    rewardApr.snapshot = snapshot.id
    if (
      periodFinishResponse.reverted ||
      rewardRateResponse.reverted ||
      staking.tvl == BigDecimal.zero() ||
      periodFinishResponse.value < hourlyTimestamp
    ) {
      rewardApr.apr = BigDecimal.zero()
      rewardApr.save()
      continue
    }
    const rewardRate = toDecimal(rewardRateResponse.value, 18)
    const rewardTokenPrice = getTokenPrice(tokenAddress, hourlyTimestamp)
    const annualRewards = rewardRate.times(SECONDS_PER_YEAR).times(rewardTokenPrice.price)
    rewardApr.apr = annualRewards.div(staking.tvl)
    rewardApr.save()
    snapshot.totalApr = snapshot.totalApr.plus(rewardApr.apr)
  }
  const yPrismaContract = ERC20.bind(YPRISMA_TOKEN_ADDRESS)
  const totalSupply = yPrismaContract.try_totalSupply()
  snapshot.totalSupply = totalSupply.reverted ? BigDecimal.zero() : toDecimal(totalSupply.value, 18)
  snapshot.save()
}

export function takeSnapshot(timestamp: BigInt): void {
  takeCvxPrismaSnapshot(timestamp)
  takeYPrismaSnapshot(timestamp)
}
