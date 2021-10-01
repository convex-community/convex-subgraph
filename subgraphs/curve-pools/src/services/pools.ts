import {BigDecimal, BigInt} from "@graphprotocol/graph-ts";
import {Pool, DailyPoolSnapshot} from "../../generated/schema";
import {BaseRewardPool} from "../../generated/Booster/BaseRewardPool";
import {bytesToAddress} from "utils";
import {
    BIG_DECIMAL_1E18,
    BIG_DECIMAL_ZERO,
    CRV_TOKEN,
    CVX_TOKEN
} from "const";
import {getCvxMintAmount, getLpTokenPrice} from "./apr";
import {getUSDRate} from "utils/pricing"
import {DAY, getIntervalFromTimestamp} from "utils/time";


export function getPool(pid: BigInt): Pool {

    let pool = Pool.load(pid.toString())
    if (!pool) {
        pool = new Pool(pid.toString());
    }
    return pool

}

export function getDailyPoolSnapshot(poolid: BigInt, name: string, timestamp: BigInt): DailyPoolSnapshot {
    const day = getIntervalFromTimestamp(timestamp, DAY);
    const snapId = name + '-' + poolid.toString() + '-' + day.toString();
    let dailySnapshot = DailyPoolSnapshot.load(snapId);
    if (!dailySnapshot) {
        dailySnapshot = new DailyPoolSnapshot(snapId);
        dailySnapshot.poolid = poolid;
        dailySnapshot.poolName = name.toString();
        dailySnapshot.timestamp = day;
    }
    return dailySnapshot;
}

export function getPoolApr(pool: Pool): BigDecimal {
    const vPrice = getLpTokenPrice(pool.lpToken);
    const rewardContract = BaseRewardPool.bind(bytesToAddress(pool.crvRewardsPool));
    // TODO: getSupply function also to be used in CVXMint to DRY
    const supplyResult = rewardContract.try_totalSupply();
    const supply = supplyResult.reverted ? BIG_DECIMAL_ZERO : supplyResult.value.toBigDecimal().div(BIG_DECIMAL_1E18);
    const virtualSupply = supply.times(vPrice);
    const rateResult = rewardContract.try_rewardRate();
    const rate = rateResult.reverted ? BIG_DECIMAL_ZERO : rateResult.value.toBigDecimal().div(BIG_DECIMAL_1E18);

    let crvPerUnderlying = BIG_DECIMAL_ZERO
    if (virtualSupply.gt(BIG_DECIMAL_ZERO)) {
        crvPerUnderlying = rate.div(virtualSupply);
    }

    const crvPerYear = crvPerUnderlying.times(BigDecimal.fromString("31536000"));
    const cvxPerYear = getCvxMintAmount(crvPerYear);
    // TODO: make this dependent on pool currency
    const cvxPrice = getUSDRate(CVX_TOKEN);
    const crvPrice = getUSDRate(CRV_TOKEN);
    let apr = crvPerYear.times(crvPrice);
    apr = apr.plus(cvxPerYear.times(cvxPrice));
    // TODO: add extra token rewards
    return apr;
}