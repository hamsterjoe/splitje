import { BillingDomainError } from "../errors";
import type {
  ParticipantId,
  PercentageAllocationInput,
  PercentageAllocationResult,
  Sen,
} from "../types";

const FULL_PERCENTAGE_BASIS_POINTS = 10_000;

function compareParticipantIds(
  first: ParticipantId,
  second: ParticipantId,
): number {
  if (first < second) return -1;
  if (first > second) return 1;
  return 0;
}

export function allocateByPercentage(
  totalSen: Sen,
  inputs: PercentageAllocationInput[],
): PercentageAllocationResult {
  if (
    !Number.isSafeInteger(totalSen) ||
    totalSen < 0
  ) {
    throw new BillingDomainError(
      "INVALID_TOTAL_SEN",
      "The total must be a non-negative safe integer in sen.",
    );
  }

  if (inputs.length === 0) {
    throw new BillingDomainError(
      "NO_PARTICIPANTS",
      "Percentage allocation requires at least one participant.",
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

  const participantIds = inputs.map(
    ({ participantId }) => participantId,
  );

  if (new Set(participantIds).size !== participantIds.length) {
    throw new BillingDomainError(
      "DUPLICATE_PARTICIPANT_ID",
      "Participant IDs must be unique within an allocation.",
    );
  }

  const hasInvalidPercentage = inputs.some(
    ({ percentageBasisPoints }) =>
      !Number.isSafeInteger(percentageBasisPoints) ||
      percentageBasisPoints <= 0 ||
      percentageBasisPoints >
        FULL_PERCENTAGE_BASIS_POINTS,
  );

  if (hasInvalidPercentage) {
    throw new BillingDomainError(
      "INVALID_PERCENTAGE",
      "Percentages must be positive integer basis points no greater than 10,000.",
    );
  }

  const percentageTotalBasisPoints = inputs.reduce(
    (sum, { percentageBasisPoints }) =>
      sum + percentageBasisPoints,
    0,
  );

  if (
    percentageTotalBasisPoints >
    FULL_PERCENTAGE_BASIS_POINTS
  ) {
    throw new BillingDomainError(
      "PERCENTAGE_EXCEEDS_TOTAL",
      "Participant percentages cannot exceed 100%.",
    );
  }

  const canonicalInputs = [...inputs].sort(
    (first, second) =>
      compareParticipantIds(
        first.participantId,
        second.participantId,
      ),
  );

  const denominator = BigInt(
    FULL_PERCENTAGE_BASIS_POINTS,
  );

  const totalBigInt = BigInt(totalSen);

  const allocatedTargetBigInt =
    (totalBigInt *
      BigInt(percentageTotalBasisPoints)) /
    denominator;

  const calculatedShares = canonicalInputs.map(
    ({ participantId, percentageBasisPoints }) => {
      const numerator =
        totalBigInt * BigInt(percentageBasisPoints);

      return {
        participantId,
        percentageBasisPoints,
        baseAmountSen: Number(
          numerator / denominator,
        ),
        fractionalRemainder:
          numerator % denominator,
      };
    },
  );

  const baseAllocatedBigInt = calculatedShares.reduce(
    (sum, { baseAmountSen }) =>
      sum + BigInt(baseAmountSen),
    BigInt(0),
  );

  const remainingRemainderSen = Number(
    allocatedTargetBigInt - baseAllocatedBigInt,
  );

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
      .slice(0, remainingRemainderSen)
      .map(({ participantId }) => participantId),
  );

  const allocations = calculatedShares.map(
    ({
      participantId,
      percentageBasisPoints,
      baseAmountSen,
    }) => {
      const remainderAmountSen: 0 | 1 =
        remainderRecipients.has(participantId)
          ? 1
          : 0;

      return {
        participantId,
        percentageBasisPoints,
        baseAmountSen,
        remainderAmountSen,
        amountSen:
          baseAmountSen + remainderAmountSen,
      };
    },
  );

  const allocatedTotalSen = allocations.reduce(
    (sum, allocation) => sum + allocation.amountSen,
    0,
  );

  return {
    totalSen,
    percentageTotalBasisPoints,
    allocatedTotalSen,
    unassignedSen: totalSen - allocatedTotalSen,
    allocations,
    remainderParticipantIds: allocations
      .filter(
        ({ remainderAmountSen }) =>
          remainderAmountSen === 1,
      )
      .map(({ participantId }) => participantId),
  };
}