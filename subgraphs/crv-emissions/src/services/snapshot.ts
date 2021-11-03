import {DailyEmissionSnapshot} from "../../generated/schema";
import {Address, BigInt} from "@graphprotocol/graph-ts";

export function getDailyEmissionSnapshot(day: BigInt, gauge: Address) : DailyEmissionSnapshot {
    let snapshot = DailyEmissionSnapshot.load(day.toString() + '-' + gauge.toHexString())
    if (!snapshot) {
        snapshot = new DailyEmissionSnapshot(day.toString() + '-' + gauge.toHexString())
        snapshot.gauge = gauge
        snapshot.timestamp = day
    }
    return snapshot
}
