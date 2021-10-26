import { DailySnapshot, ExtraRewardApr, StakingContract } from '../../generated/schema'
import { Address, BigInt } from '@graphprotocol/graph-ts'
import { DAY, getIntervalFromTimestamp } from '../../../../packages/utils/time'
import { getContractApr } from './apr'
import { THREE_CRV_TOKEN } from '../../../../packages/constants'

export function createSnapShot(contract: StakingContract, timestamp: BigInt): DailySnapshot {
  const day = getIntervalFromTimestamp(timestamp, DAY)
  const snapId = contract.name + '-' + day.toString()
  let snapshot = DailySnapshot.load(snapId)
  if (!snapshot) {
    snapshot = new DailySnapshot(snapId)
    snapshot.contract = contract.id.toString()
    const aprs = getContractApr(contract.id)
    snapshot.crvApr = aprs[0]
    snapshot.timestamp = timestamp
    snapshot.cvxApr = aprs[1]
    const threeCrvApr = aprs[2]
    const extra = new ExtraRewardApr(snapId + '-' + THREE_CRV_TOKEN)
    extra.snapshot = snapId
    extra.token = Address.fromString(THREE_CRV_TOKEN)
    extra.tokenName = '3Crv'
    extra.apr = threeCrvApr
    extra.save()
  }

  return snapshot
}
