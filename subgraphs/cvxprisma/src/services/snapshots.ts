import { getIntervalFromTimestamp, HOUR } from 'utils/time'
import { Address, BigDecimal, BigInt } from '@graphprotocol/graph-ts'
import { HourlySnapshot, RewardApr } from '../../generated/schema'
import { getStakingContract } from './entities'
import { getTokenPrice } from './tokens'
import { toDecimal } from 'utils/maths'
import { CVX_PRISMA_STAKING_ADDRESS, CVX_PRISMA_TOKEN_ADDRESS, SECONDS_PER_YEAR } from 'const'
import { cvxPrismaStaking } from '../../generated/cvxPrismaStaking/cvxPrismaStaking'
import { ERC20 } from '../../generated/cvxPrismaStaking/ERC20'

export function takeSnapshot(timestamp: BigInt): void {
  const hourlyTimestamp = getIntervalFromTimestamp(timestamp, HOUR)
  let snapshot = HourlySnapshot.load(timestamp.toString())
  if (snapshot) {
    return
  }
  snapshot = new HourlySnapshot(hourlyTimestamp.toString())
  const staking = getStakingContract()
  snapshot.index = staking.snapshotCount
  staking.snapshotCount += 1
  staking.save()
  const stakingContract = cvxPrismaStaking.bind(CVX_PRISMA_STAKING_ADDRESS)
  snapshot.tokenBalance = staking.tokenBalance
  snapshot.tvl = staking.tvl
  snapshot.totalApr = BigDecimal.zero()
  for (let i = 0; i < staking.rewardTokens.length; i++) {
    const tokenAddress = Address.fromString(staking.rewardTokens[i])
    const rewardDataResponse = stakingContract.try_rewardData(tokenAddress)
    const rewardApr = new RewardApr(tokenAddress.toHexString() + hourlyTimestamp.toString())
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
  snapshot.timestamp = hourlyTimestamp
  snapshot.save()
}
