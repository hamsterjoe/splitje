import { BillingDomainError } from "../errors";
import type {
  EqualAllocationResult,
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

export function allocateEqual(
  totalSen: Sen,
  participantIds: ParticipantId[],
): EqualAllocationResult {
  if (!Number.isSafeInteger(totalSen) || totalSen < 0) {
    throw new BillingDomainError(
      "INVALID_TOTAL_SEN",
      "The total must be a non-negative safe integer in sen.",
    );
  }

  if (participantIds.length === 0) {
    throw new BillingDomainError(
      "NO_PARTICIPANTS",
      "Equal allocation requires at least one participant.",
    );
  }

  const hasInvalidParticipantId = participantIds.some(
    (participantId) =>
      typeof participantId !== "string" ||
      participantId.trim().length === 0,
  );

  if (hasInvalidParticipantId) {
    throw new BillingDomainError(
      "INVALID_PARTICIPANT_ID",
      "Participant IDs must be non-empty strings.",
    );
  }

  if (new Set(participantIds).size !== participantIds.length) {
    throw new BillingDomainError(
      "DUPLICATE_PARTICIPANT_ID",
      "Participant IDs must be unique within an allocation.",
    );
  }

  const canonicalParticipantIds = [...participantIds].sort(
    compareParticipantIds,
  );

  const participantCount = canonicalParticipantIds.length;
  const baseAmountSen = Math.floor(totalSen / participantCount);
  const remainderSen = totalSen % participantCount;

  const allocations = canonicalParticipantIds.map(
    (participantId, index) => {
      const remainderAmountSen = index < remainderSen ? 1 : 0;

      return {
        participantId,
        baseAmountSen,
        remainderAmountSen,
        amountSen: baseAmountSen + remainderAmountSen,
      };
    },
  );

  const remainderParticipantIds = allocations
    .filter((allocation) => allocation.remainderAmountSen === 1)
    .map((allocation) => allocation.participantId);

  const allocatedTotalSen = allocations.reduce(
    (sum, allocation) => sum + allocation.amountSen,
    0,
  );

  return {
    totalSen,
    participantCount,
    allocatedTotalSen,
    allocations,
    remainderParticipantIds,
  };
}