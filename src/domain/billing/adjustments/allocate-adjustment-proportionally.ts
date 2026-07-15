import { allocateSignedByWeight } from "../allocation/signed-weighted-allocation";
import { BillingDomainError } from "../errors";
import type {
  ParticipantId,
  ProportionalAdjustmentBase,
  ProportionalAdjustmentResult,
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

export function allocateAdjustmentProportionally(
  adjustmentAmountSen: Sen,
  bases: ProportionalAdjustmentBase[],
): ProportionalAdjustmentResult {
  if (!Number.isSafeInteger(adjustmentAmountSen)) {
    throw new BillingDomainError(
      "INVALID_ADJUSTMENT_AMOUNT",
      "The adjustment amount must be a safe integer in sen.",
    );
  }

  if (bases.length === 0) {
    throw new BillingDomainError(
      "NO_PARTICIPANTS",
      "Proportional allocation requires at least one participant.",
    );
  }

  const hasInvalidParticipantId = bases.some(
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

  const participantIds = bases.map(
    ({ participantId }) => participantId,
  );

  if (new Set(participantIds).size !== participantIds.length) {
    throw new BillingDomainError(
      "DUPLICATE_PARTICIPANT_ID",
      "Participant IDs must be unique within a proportional allocation.",
    );
  }

  const hasInvalidBase = bases.some(
    ({ itemSubtotalSen }) =>
      !Number.isSafeInteger(itemSubtotalSen) ||
      itemSubtotalSen < 0,
  );

  if (hasInvalidBase) {
    throw new BillingDomainError(
      "INVALID_PROPORTIONAL_BASE",
      "Proportional bases must be non-negative safe integers in sen.",
    );
  }

  const canonicalBases = [...bases].sort(
    (first, second) =>
      compareParticipantIds(
        first.participantId,
        second.participantId,
      ),
  );

  const eligibleSubtotalBigInt = canonicalBases.reduce(
    (sum, { itemSubtotalSen }) =>
      sum + BigInt(itemSubtotalSen),
    BigInt(0),
  );

  if (
    eligibleSubtotalBigInt >
    BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    throw new BillingDomainError(
      "UNSAFE_CALCULATION",
      "The combined proportional base exceeds the safe-integer range.",
    );
  }

  const eligibleSubtotalSen = Number(
    eligibleSubtotalBigInt,
  );

  const positiveBases = canonicalBases.filter(
    ({ itemSubtotalSen }) => itemSubtotalSen > 0,
  );

  if (
    positiveBases.length === 0 &&
    adjustmentAmountSen !== 0
  ) {
    throw new BillingDomainError(
      "NO_PROPORTIONAL_BASE",
      "A non-zero adjustment cannot be allocated without a positive item subtotal.",
    );
  }

  if (positiveBases.length === 0) {
    return {
      adjustmentAmountSen,
      eligibleSubtotalSen,
      allocatedTotalSen: 0,
      allocations: canonicalBases.map(
        ({ participantId, itemSubtotalSen }) => ({
          participantId,
          itemSubtotalSen,
          baseAmountSen: 0,
          remainderAmountSen: 0,
          amountSen: 0,
        }),
      ),
      remainderParticipantIds: [],
    };
  }

  const weightedResult = allocateSignedByWeight(
    adjustmentAmountSen,
    positiveBases.map(
      ({ participantId, itemSubtotalSen }) => ({
        participantId,
        weight: itemSubtotalSen,
      }),
    ),
  );

  const weightedAllocations = new Map(
    weightedResult.allocations.map((allocation) => [
      allocation.participantId,
      allocation,
    ]),
  );

  const allocations = canonicalBases.map(
    ({ participantId, itemSubtotalSen }) => {
      const weightedAllocation =
        weightedAllocations.get(participantId);

      if (!weightedAllocation) {
        return {
          participantId,
          itemSubtotalSen,
          baseAmountSen: 0,
          remainderAmountSen: 0 as const,
          amountSen: 0,
        };
      }

      return {
        participantId,
        itemSubtotalSen,
        baseAmountSen:
          weightedAllocation.baseAmountSen,
        remainderAmountSen:
          weightedAllocation.remainderAmountSen,
        amountSen: weightedAllocation.amountSen,
      };
    },
  );

  return {
    adjustmentAmountSen,
    eligibleSubtotalSen,
    allocatedTotalSen:
      weightedResult.allocatedTotalSen,
    allocations,
    remainderParticipantIds:
      weightedResult.remainderParticipantIds,
  };
}