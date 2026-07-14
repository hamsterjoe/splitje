import { BillingDomainError } from "../errors";
import type {
    Sen,
    SignedWeightedAllocationResult,
    WeightedAllocationInput,
} from "../types";
import { allocateByWeight } from "./weighted-allocation";

export function allocateSignedByWeight(
    totalSen: Sen,
    inputs: WeightedAllocationInput[],
): SignedWeightedAllocationResult {
    if (!Number.isSafeInteger(totalSen)) {
        throw new BillingDomainError(
            "INVALID_ADJUSTMENT_AMOUNT",
            "The signed total must be a safe integer in sen.",
        );
    }

    if (totalSen >= 0) {
        return allocateByWeight(totalSen, inputs);
    }

    const magnitudeResult = allocateByWeight(
        Math.abs(totalSen),
        inputs,
    );

    const allocations = magnitudeResult.allocations.map(
        ({
            participantId,
            weight,
            baseAmountSen,
            remainderAmountSen,
            amountSen,
        }) => ({
            participantId,
            weight,
            baseAmountSen: baseAmountSen === 0 ? 0 : -baseAmountSen,
            remainderAmountSen:
                remainderAmountSen === 1 ? (-1 as const) : (0 as const),
            amountSen: amountSen === 0 ? 0 : -amountSen,
        }),
    );

    const allocatedTotalSen = allocations.reduce(
        (sum, allocation) => sum + allocation.amountSen,
        0,
    );

    return {
        totalSen,
        totalWeight: magnitudeResult.totalWeight,
        allocatedTotalSen,
        allocations,
        remainderParticipantIds:
            magnitudeResult.remainderParticipantIds,
    };
}