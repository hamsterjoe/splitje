import { BillingDomainError } from "../errors";
import type {
    ItemAllocationInput,
    ItemAllocationState,
    ItemAllocationSummary,
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

export function calculateItemAllocationState(
    itemTotalSen: Sen,
    allocations: ItemAllocationInput[],
): ItemAllocationSummary {
    if (
        !Number.isSafeInteger(itemTotalSen) ||
        itemTotalSen < 0
    ) {
        throw new BillingDomainError(
            "INVALID_TOTAL_SEN",
            "The item total must be a non-negative safe integer in sen.",
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
            "Each participant may have only one allocation per item.",
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

    let allocatedSen = 0;

    for (const allocation of canonicalAllocations) {
        if (
            !Number.isSafeInteger(allocation.amountSen) ||
            allocation.amountSen < 0
        ) {
            throw new BillingDomainError(
                "INVALID_ALLOCATION_AMOUNT",
                "Allocation amounts must be non-negative safe integers in sen.",
            );
        }

        if (allocation.amountSen > itemTotalSen - allocatedSen) {
            throw new BillingDomainError(
                "OVER_ALLOCATED_ITEM",
                "Participant allocations cannot exceed the item total.",
            );
        }

        allocatedSen += allocation.amountSen;
    }

    const remainingSen = itemTotalSen - allocatedSen;

    let state: ItemAllocationState;

    if (remainingSen === 0) {
        state = "fully_assigned";
    } else if (allocatedSen === 0) {
        state = "unassigned";
    } else {
        state = "partially_assigned";
    }

    return {
        itemTotalSen,
        allocatedSen,
        remainingSen,
        state,
        allocations: canonicalAllocations,
    };
}