import {
  KickReward,
  RewardPaid,
  Staked,
  Withdrawn
} from "../generated/CvxLocker/CvxLocker"
import {Lock, Reward, Withdrawal} from "../generated/schema"
import {getUser} from "./services/users";
import {
  getEventId, updateAggregatedLocks,
  updateAggregatedRewards, updateAggregatedWithdrawals
} from "./services/events";
import {getOrCreateToken} from "./services/tokens";
import {CVX_ADDRESS} from "const";
import {getUsdRate} from "utils/pricing"
import {Address} from '@graphprotocol/graph-ts';
import {exponentToBigDecimal} from "utils/maths";

const cvx = getOrCreateToken(CVX_ADDRESS);

export function handleKickReward(event: KickReward): void {

  const user = getUser(event.params._user);
  const reward = new Reward(getEventId(event));
  reward.user = user.id;
  reward.amount = event.params._reward;
  reward.amountUSD = getUsdRate(CVX_ADDRESS).times(reward.amount.toBigDecimal()
      .div(exponentToBigDecimal(cvx.decimals)));
  reward.token = cvx.id;
  reward.time = event.block.timestamp;
  reward.save()

  updateAggregatedRewards(reward.time,
      cvx,
      reward.amount,
      reward.amountUSD
      );

}

export function handleRewardPaid(event: RewardPaid): void {

  const user = getUser(event.params._user);
  const reward = new Reward(getEventId(event));
  reward.user = user.id;
  reward.amount = event.params._reward;
  const token = getOrCreateToken(event.params._rewardsToken);
  reward.amountUSD = getUsdRate(Address.fromString(token.id)).times(reward.amount.toBigDecimal()
      .div(exponentToBigDecimal(token.decimals)));
  reward.token = token.id;
  reward.time = event.block.timestamp;
  reward.save();

  updateAggregatedRewards(reward.time,
      token,
      reward.amount,
      reward.amountUSD);
}

export function handleStaked(event: Staked): void {

  const user = getUser(event.params._user);
  const lock = new Lock(getEventId(event));
  lock.user = user.id;
  lock.lockAmount = event.params._lockedAmount;
  lock.amountUSD = getUsdRate(CVX_ADDRESS).times(lock.lockAmount.toBigDecimal().div(exponentToBigDecimal(cvx.decimals)));
  lock.boostedAmount = event.params._boostedAmount;
  lock.time = event.block.timestamp;
  user.totalLocked = user.totalLocked.plus(lock.lockAmount);
  user.save();
  lock.save();
  updateAggregatedLocks(lock.time, lock.lockAmount,
      lock.amountUSD);
}

export function handleWithdrawn(event: Withdrawn): void {

  const user = getUser(event.params._user);
  const withdrawal = new Withdrawal(getEventId(event));
  withdrawal.user = user.id;
  withdrawal.amount = event.params._amount;
  withdrawal.amountUSD = getUsdRate(CVX_ADDRESS).times(withdrawal.amount.toBigDecimal().div(exponentToBigDecimal(cvx.decimals)));
  withdrawal.time = event.block.timestamp;
  user.totalLocked = user.totalLocked.minus(withdrawal.amount);
  user.save();
  withdrawal.save();
  updateAggregatedWithdrawals(withdrawal.time, withdrawal.amount,
      withdrawal.amountUSD)
}
