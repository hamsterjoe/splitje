import { BillingDomainError } from "../errors";
import type {
    AdjustmentAllocationInput,
    AdjustmentAllocationState,
    AdjustmentAllocationSummary,
    ParticipantId,
    Sen,
} from "../types";

function compareParticipantIds(
    first: ParticipantId,
    second: ParticipantId,
): number {
    if (first < second) return -1;
    if (first > second) return 1;
    return 0;
}

export function calculateAdjustmentAllocationState(
    adjustmentAmountSen: Sen,
    allocations: AdjustmentAllocationInput[],
): AdjustmentAllocationSummary {
    if (!Number.isSafeInteger(adjustmentAmountSen)) {
        throw new BillingDomainError(
            "INVALID_ADJUSTMENT_AMOUNT",
            "The adjustment amount must be a safe integer in sen.",
        );
    }

    const hasInvalidParticipantId = allocations.some(
        ({ participantId }) =>
            typeof participantId !== "string" ||
            participantId.trim().length === 0,
    );

    if (hasInvalidParticipantId) {
        throw new BillingDomainError(
            "INVALID_PARTICIPANT_ID",
            "Participant IDs must be non-empty strings.",
        );
    }

    const participantIds = allocations.map(
        ({ participantId }) => participantId,
    );

    if (new Set(participantIds).size !== participantIds.length) {
        throw new BillingDomainError(
            "DUPLICATE_PARTICIPANT_ID",
            "Each participant may have only one allocation per adjustment.",
        );
    }

    const canonicalAllocations = allocations
        .map((allocation) => ({ ...allocation }))
        .sort((first, second) =>
            compareParticipantIds(
                first.participantId,
                second.participantId,
            ),
        );

    for (const allocation of canonicalAllocations) {
        if (!Number.isSafeInteger(allocation.amountSen)) {
            throw new BillingDomainError(
                "INVALID_ADJUSTMENT_ALLOCATION_AMOUNT",
                "Adjustment allocations must be safe integers in sen.",
            );
        }

        const hasSignMismatch =
            (adjustmentAmountSen > 0 &&
                allocation.amountSen < 0) ||
            (adjustmentAmountSen < 0 &&
                allocation.amountSen > 0);

        if (hasSignMismatch) {
            throw new BillingDomainError(
                "ADJUSTMENT_ALLOCATION_SIGN_MISMATCH",
                "Adjustment allocations must have the same sign as their adjustment.",
            );
        }
    }

    const allocatedBigInt = canonicalAllocations.reduce(
        (sum, { amountSen }) => sum + BigInt(amountSen),
        BigInt(0),
    );

    const adjustmentBigInt = BigInt(adjustmentAmountSen);

    const isOverAllocated =
        adjustmentBigInt > BigInt(0)
            ? allocatedBigInt > adjustmentBigInt
            : adjustmentBigInt < BigInt(0)
                ? allocatedBigInt < adjustmentBigInt
                : allocatedBigInt !== BigInt(0);

    if (isOverAllocated) {
        throw new BillingDomainError(
            "OVER_ALLOCATED_ADJUSTMENT",
            "Participant allocations cannot exceed the adjustment amount.",
        );
    }

    const allocatedSen = Number(allocatedBigInt);
    const remainingSen = Number(
        adjustmentBigInt - allocatedBigInt,
    );

    let state: AdjustmentAllocationState;

    if (remainingSen === 0) {
        state = "fully_assigned";
    } else if (allocatedSen === 0) {
        state = "unassigned";
    } else {
        state = "partially_assigned";
    }

    return {
        adjustmentAmountSen,
        allocatedSen,
        remainingSen,
        state,
        allocations: canonicalAllocations,
    };
}