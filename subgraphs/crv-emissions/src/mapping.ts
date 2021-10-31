import { Minted } from "../generated/CRVMinter/CRVMinter"
import {DAY, getIntervalFromTimestamp} from "utils/time";
import {getDailyEmissionSnapshot} from "./services/snapshot";

export function handleMinted(event: Minted): void {

    const day = getIntervalFromTimestamp(event.block.timestamp, DAY)
    let snapshot = getDailyEmissionSnapshot(day, event.params.gauge)
    const totalMint = event.params.minted
    const mintedFor =
    snapshot.crvMinted = snapshot.crvMinted.plus(event.params.minted)
    snapshot.save()

}
