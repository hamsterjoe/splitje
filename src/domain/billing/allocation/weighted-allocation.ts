import { BillingDomainError } from "../errors";
import type {
    ParticipantId,
    Sen,
    WeightedAllocationInput,
    WeightedAllocationResult,
} from "../types";

function compareParticipantIds(
    first: ParticipantId,
    second: ParticipantId,
): number {
    if (first < second) return -1;
    if (first > second) return 1;
    return 0;
}

export function allocateByWeight(
    totalSen: Sen,
    inputs: WeightedAllocationInput[],
): WeightedAllocationResult {
    if (!Number.isSafeInteger(totalSen) || totalSen < 0) {
        throw new BillingDomainError(
            "INVALID_TOTAL_SEN",
            "The total must be a non-negative safe integer in sen.",
        );
    }

    if (inputs.length === 0) {
        throw new BillingDomainError(
            "NO_PARTICIPANTS",
            "Weighted allocation requires at least one participant.",
        );
    }

    const hasInvalidParticipantId = inputs.some(
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

    const participantIds = inputs.map(({ participantId }) => participantId);

    if (new Set(participantIds).size !== participantIds.length) {
        throw new BillingDomainError(
            "DUPLICATE_PARTICIPANT_ID",
            "Participant IDs must be unique within an allocation.",
        );
    }

    const hasInvalidWeight = inputs.some(
        ({ weight }) => !Number.isSafeInteger(weight) || weight <= 0,
    );

    if (hasInvalidWeight) {
        throw new BillingDomainError(
            "INVALID_WEIGHT",
            "Weights must be positive safe integers.",
        );
    }

    const canonicalInputs = [...inputs].sort((first, second) =>
        compareParticipantIds(
            first.participantId,
            second.participantId,
        ),
    );

    const totalWeightBigInt = canonicalInputs.reduce(
        (sum, { weight }) => sum + BigInt(weight),
        BigInt(0),
    );

    if (totalWeightBigInt > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new BillingDomainError(
            "INVALID_WEIGHT",
            "The combined allocation weight exceeds the supported range.",
        );
    }

    const totalWeight = Number(totalWeightBigInt);
    const totalSenBigInt = BigInt(totalSen);

    const calculatedShares = canonicalInputs.map(
        ({ participantId, weight }) => {
            const numerator = totalSenBigInt * BigInt(weight);
            const baseAmountSen = Number(
                numerator / totalWeightBigInt,
            );

            return {
                participantId,
                weight,
                baseAmountSen,
                fractionalRemainder:
                    numerator % totalWeightBigInt,
            };
        },
    );

    const allocatedBaseTotalSen = calculatedShares.reduce(
        (sum, share) => sum + share.baseAmountSen,
        0,
    );

    const remainingSen = totalSen - allocatedBaseTotalSen;

    const remainderRanking = [...calculatedShares].sort(
        (first, second) => {
            if (
                first.fractionalRemainder >
                second.fractionalRemainder
            ) {
                return -1;
            }

            if (
                first.fractionalRemainder <
                second.fractionalRemainder
            ) {
                return 1;
            }

            return compareParticipantIds(
                first.participantId,
                second.participantId,
            );
        },
    );

    const remainderRecipients = new Set(
        remainderRanking
            .slice(0, remainingSen)
            .map(({ participantId }) => participantId),
    );

    const allocations = calculatedShares.map(
        ({ participantId, weight, baseAmountSen }) => {
            const remainderAmountSen: 0 | 1 =
                remainderRecipients.has(participantId) ? 1 : 0;

            return {
                participantId,
                weight,
                baseAmountSen,
                remainderAmountSen,
                amountSen: baseAmountSen + remainderAmountSen,
            };
        },
    );

    const allocatedTotalSen = allocations.reduce(
        (sum, allocation) => sum + allocation.amountSen,
        0,
    );

    const remainderParticipantIds = allocations
        .filter(
            (allocation) => allocation.remainderAmountSen === 1,
        )
        .map((allocation) => allocation.participantId);

    return {
        totalSen,
        totalWeight,
        allocatedTotalSen,
        allocations,
        remainderParticipantIds,
    };
}