import {BigDecimal, Bytes} from "@graphprotocol/graph-ts";
import {bytesToAddress} from "utils";
import {CurveRegistry} from "../../generated/Booster/CurveRegistry";
import {
    BIG_DECIMAL_1E18,
    BIG_DECIMAL_ZERO,
    BIG_INT_ZERO,
    CURVE_REGISTRY,
    CVX_CLIFF_COUNT,
    CVX_CLIFF_SIZE,
    CVX_MAX_SUPPLY,
    CVX_TOKEN
} from "const";

import {ERC20} from "../../generated/Booster/ERC20";

export function getLpTokenPrice(lpToken: Bytes): BigDecimal {
    // TODO: handle v2 pools
    const lpTokenAddress = bytesToAddress(lpToken);
    const curveRegistry = CurveRegistry.bind(CURVE_REGISTRY);
    const vPriceCallResult = curveRegistry.try_get_virtual_price_from_lp_token(lpTokenAddress);
    const vPrice = vPriceCallResult.reverted ? BIG_INT_ZERO : vPriceCallResult.value;
    return vPrice.toBigDecimal().div(BIG_DECIMAL_1E18);
}

export function getCvxMintAmount(crvEarned: BigDecimal): BigDecimal {
    const cvxSupplyResult = ERC20.bind(CVX_TOKEN).try_totalSupply();
    if (!cvxSupplyResult.reverted) {
        const cvxSupply = cvxSupplyResult.value.toBigDecimal().div(BIG_DECIMAL_1E18);
        const currentCliff = cvxSupply.div(CVX_CLIFF_SIZE);
        if (currentCliff.lt(CVX_CLIFF_COUNT)) {
            const remaining = CVX_CLIFF_COUNT.minus(currentCliff);
            let cvxEarned = crvEarned.times(remaining).div(CVX_CLIFF_COUNT);
            const amountTillMax = CVX_MAX_SUPPLY.minus(cvxSupply);
            if (cvxEarned.gt(amountTillMax)) {
                cvxEarned = amountTillMax;
            }
            return cvxEarned;
        }
    }
    return BIG_DECIMAL_ZERO;
}
