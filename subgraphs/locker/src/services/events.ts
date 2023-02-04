import { ethereum } from '@graphprotocol/graph-ts/index'
import { DAY, getIntervalFromTimestamp, WEEK } from 'utils/time'
import {
  DailyLock,
  DailyReward,
  DailyWithdrawal,
  Token,
  WeeklyLock,
  WeeklyReward,
  WeeklyWithdrawal,
} from '../../generated/schema'
import { BigDecimal, BigInt } from '@graphprotocol/graph-ts'
import { BIG_INT_ONE, BIG_INT_ZERO } from 'const'

export function getEventId(event: ethereum.Event): string {
  return event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
}

export function getDailyLocks(timestamp: BigInt): DailyLock {
  const day = getIntervalFromTimestamp(timestamp, DAY)
  let dailyLocks = DailyLock.load(day.toString())
  if (!dailyLocks) {
    dailyLocks = new DailyLock(day.toString())
    dailyLocks.time = day
    dailyLocks.count = BIG_INT_ZERO
  }
  return dailyLocks
}

export function getWeeklyLocks(timestamp: BigInt): WeeklyLock {
  const week = getIntervalFromTimestamp(timestamp, WEEK)
  let weeklyLocks = WeeklyLock.load(week.toString())
  if (!weeklyLocks) {
    weeklyLocks = new WeeklyLock(week.toString())
    weeklyLocks.time = week
    weeklyLocks.count = BIG_INT_ZERO
  }
  return weeklyLocks
}

export function getDailyWithdrawals(timestamp: BigInt): DailyWithdrawal {
  const day = getIntervalFromTimestamp(timestamp, DAY)
  let dailyWithdrawals = DailyWithdrawal.load(day.toString())
  if (!dailyWithdrawals) {
    dailyWithdrawals = new DailyWithdrawal(day.toString())
    dailyWithdrawals.time = day
    dailyWithdrawals.count = BIG_INT_ZERO
  }
  return dailyWithdrawals
}

export function getWeeklyWithdrawals(timestamp: BigInt): WeeklyWithdrawal {
  const week = getIntervalFromTimestamp(timestamp, WEEK)
  let weeklyWithdrawals = WeeklyWithdrawal.load(week.toString())
  if (!weeklyWithdrawals) {
    weeklyWithdrawals = new WeeklyWithdrawal(week.toString())
    weeklyWithdrawals.time = week
    weeklyWithdrawals.count = BIG_INT_ZERO
  }
  return weeklyWithdrawals
}

export function getDailyRewards(timestamp: BigInt, token: Token): DailyReward {
  const day = getIntervalFromTimestamp(timestamp, DAY)
  let dailyRewards = DailyReward.load(day.toString())
  if (!dailyRewards) {
    dailyRewards = new DailyReward(day.toString())
    dailyRewards.token = token.id
    dailyRewards.time = day
  }
  return dailyRewards
}

export function getWeeklyRewards(timestamp: BigInt, token: Token): WeeklyReward {
  const week = getIntervalFromTimestamp(timestamp, WEEK)
  let weeklyRewards = WeeklyReward.load(week.toString())
  if (!weeklyRewards) {
    weeklyRewards = new WeeklyReward(week.toString())
    weeklyRewards.token = token.id
    weeklyRewards.time = week
  }
  return weeklyRewards
}

export function updateAggregatedRewards(timestamp: BigInt, token: Token, amount: BigInt, amountUSD: BigDecimal): void {
  const dailyRewards = getDailyRewards(timestamp, token)
  dailyRewards.amount = dailyRewards.amount.plus(amount)
  dailyRewards.amountUSD = dailyRewards.amountUSD.plus(amountUSD)
  dailyRewards.count = dailyRewards.count.plus(BIG_INT_ONE)
  dailyRewards.save()
  const weeklyRewards = getWeeklyRewards(timestamp, token)
  weeklyRewards.count = weeklyRewards.count.plus(BIG_INT_ONE)
  weeklyRewards.amount = weeklyRewards.amount.plus(amount)
  weeklyRewards.amountUSD = weeklyRewards.amountUSD.plus(amountUSD)
  weeklyRewards.save()
}

export function updateAggregatedWithdrawals(timestamp: BigInt, amount: BigInt, amountUSD: BigDecimal): void {
  const dailyWithdrawals = getDailyWithdrawals(timestamp)
  dailyWithdrawals.amount = dailyWithdrawals.amount.plus(amount)
  dailyWithdrawals.amountUSD = dailyWithdrawals.amountUSD.plus(amountUSD)
  dailyWithdrawals.count = dailyWithdrawals.count.plus(BIG_INT_ONE)
  dailyWithdrawals.save()
  const weeklyWithdrawals = getWeeklyWithdrawals(timestamp)
  weeklyWithdrawals.amount = weeklyWithdrawals.amount.plus(amount)
  weeklyWithdrawals.count = weeklyWithdrawals.count.plus(BIG_INT_ONE)
  weeklyWithdrawals.amountUSD = weeklyWithdrawals.amountUSD.plus(amountUSD)
  weeklyWithdrawals.save()
}

export function updateAggregatedLocks(timestamp: BigInt, amount: BigInt, amountUSD: BigDecimal): void {
  const dailyLocks = getDailyLocks(timestamp)
  dailyLocks.amount = dailyLocks.amount.plus(amount)
  dailyLocks.amountUSD = dailyLocks.amountUSD.plus(amountUSD)
  dailyLocks.count = dailyLocks.count.plus(BIG_INT_ONE)
  dailyLocks.save()
  const weeklyLocks = getWeeklyLocks(timestamp)
  weeklyLocks.amount = weeklyLocks.amount.plus(amount)
  weeklyLocks.count = weeklyLocks.count.plus(BIG_INT_ONE)
  weeklyLocks.amountUSD = weeklyLocks.amountUSD.plus(amountUSD)
  weeklyLocks.save()
}
