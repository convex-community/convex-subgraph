import { DailySnapshot, ExtraRewardApr, StakingContract } from '../../generated/schema'
import { Address, BigInt } from '@graphprotocol/graph-ts'
import { DAY, getIntervalFromTimestamp } from '../../../../packages/utils/time'
import { getContractApr } from './apr'
import {
  CVX_REWARDS,
  CVXCRV_REWARDS,
  THREE_CRV_TOKEN
} from '../../../../packages/constants'

export function createSnapShot(contract: StakingContract, timestamp: BigInt): DailySnapshot {
  const day = getIntervalFromTimestamp(timestamp, DAY)
  const snapId = contract.name + '-' + day.toString()
  let snapshot = DailySnapshot.load(snapId)
  if (!snapshot) {
    snapshot = new DailySnapshot(snapId)
    snapshot.contract = contract.id
    snapshot.timestamp = timestamp
    snapshot = setSnapshotAprs(contract.id, snapshot)
  }
  return snapshot
}

export function setSnapshotAprs(contract: string, snapshot: DailySnapshot): DailySnapshot {
  if (contract == CVXCRV_REWARDS) {
    return setCvxCrvSnapshotApr(contract, snapshot)
  }
  else if (contract = CVX_REWARDS) {

  }
  return snapshot
}

export function setCvxCrvSnapshotApr(contract: string, snapshot: DailySnapshot): DailySnapshot {
  const aprs = getContractApr(contract)
  snapshot.crvApr = aprs[0]
  snapshot.cvxApr = aprs[1]
  const threeCrvApr = aprs[2]
  const extra = new ExtraRewardApr(snapshot.id + '-' + THREE_CRV_TOKEN)
  extra.snapshot = snapshot.id
  extra.token = Address.fromString(THREE_CRV_TOKEN)
  extra.tokenName = '3Crv'
  extra.apr = threeCrvApr
  extra.save()
  return snapshot
}
