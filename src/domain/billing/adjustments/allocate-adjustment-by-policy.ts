import { calculateAdjustmentAllocationState } from "../allocation/adjustment-allocation-state";
import { allocateSignedByWeight } from "../allocation/signed-weighted-allocation";
import type {
    AdjustmentAllocationInput,
    AdjustmentAllocationPolicy,
    AdjustmentPolicyResult,
    Sen,
} from "../types";
import { allocateAdjustmentProportionally } from "./allocate-adjustment-proportionally";
import { allocateByPercentage } from "../allocation/percentage-allocation";

function createResult(
    adjustmentAmountSen: Sen,
    method: AdjustmentAllocationPolicy["method"],
    allocations: AdjustmentAllocationInput[],
    remainderParticipantIds: string[],
): AdjustmentPolicyResult {
    const summary = calculateAdjustmentAllocationState(
        adjustmentAmountSen,
        allocations,
    );

    return {
        method,
        adjustmentAmountSen,
        allocatedTotalSen: summary.allocatedSen,
        remainingSen: summary.remainingSen,
        state: summary.state,
        allocations: summary.allocations,
        remainderParticipantIds,
    };
}

export function allocateAdjustmentByPolicy(
    adjustmentAmountSen: Sen,
    policy: AdjustmentAllocationPolicy,
): AdjustmentPolicyResult {
    switch (policy.method) {
        case "proportional": {
            const proportionalResult =
                allocateAdjustmentProportionally(
                    adjustmentAmountSen,
                    policy.bases,
                );

            return createResult(
                adjustmentAmountSen,
                policy.method,
                proportionalResult.allocations.map(
                    ({ participantId, amountSen }) => ({
                        participantId,
                        amountSen,
                    }),
                ),
                proportionalResult.remainderParticipantIds,
            );
        }

        case "equal": {
            const equalResult = allocateSignedByWeight(
                adjustmentAmountSen,
                policy.participantIds.map((participantId) => ({
                    participantId,
                    weight: 1,
                })),
            );

            return createResult(
                adjustmentAmountSen,
                policy.method,
                equalResult.allocations.map(
                    ({ participantId, amountSen }) => ({
                        participantId,
                        amountSen,
                    }),
                ),
                equalResult.remainderParticipantIds,
            );
        }

        case "single":
            return createResult(
                adjustmentAmountSen,
                policy.method,
                [
                    {
                        participantId: policy.participantId,
                        amountSen: adjustmentAmountSen,
                    },
                ],
                [],
            );

        case "percentage": {
            const magnitudeResult = allocateByPercentage(
                Math.abs(adjustmentAmountSen),
                policy.percentages,
            );

            const isNegative =
                adjustmentAmountSen < 0;

            const allocations =
                magnitudeResult.allocations.map(
                    ({ participantId, amountSen }) => ({
                        participantId,
                        amountSen:
                            amountSen === 0
                                ? 0
                                : isNegative
                                    ? -amountSen
                                    : amountSen,
                    }),
                );

            return createResult(
                adjustmentAmountSen,
                policy.method,
                allocations,
                magnitudeResult.remainderParticipantIds,
            );
        }

        case "custom":
            return createResult(
                adjustmentAmountSen,
                policy.method,
                policy.allocations,
                [],
            );
    }
}