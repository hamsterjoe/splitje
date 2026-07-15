import { BillingDomainError } from "../errors";
import type {
  ParticipantId,
  QuantityAllocationInput,
  QuantityAllocationResult,
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

export function allocateByQuantity(
  totalSen: Sen,
  itemQuantity: number,
  inputs: QuantityAllocationInput[],
): QuantityAllocationResult {
  if (
    !Number.isSafeInteger(totalSen) ||
    totalSen < 0
  ) {
    throw new BillingDomainError(
      "INVALID_TOTAL_SEN",
      "The total must be a non-negative safe integer in sen.",
    );
  }

  if (
    !Number.isSafeInteger(itemQuantity) ||
    itemQuantity <= 0
  ) {
    throw new BillingDomainError(
      "INVALID_QUANTITY",
      "Item quantity must be a positive safe integer.",
    );
  }

  if (inputs.length === 0) {
    throw new BillingDomainError(
      "NO_PARTICIPANTS",
      "Quantity allocation requires at least one participant.",
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

  const hasInvalidQuantity = inputs.some(
    ({ quantity }) =>
      !Number.isSafeInteger(quantity) ||
      quantity <= 0,
  );

  if (hasInvalidQuantity) {
    throw new BillingDomainError(
      "INVALID_QUANTITY",
      "Participant quantities must be positive safe integers.",
    );
  }

  const assignedQuantityBigInt = inputs.reduce(
    (sum, { quantity }) => sum + BigInt(quantity),
    BigInt(0),
  );

  const itemQuantityBigInt = BigInt(itemQuantity);

  if (assignedQuantityBigInt > itemQuantityBigInt) {
    throw new BillingDomainError(
      "QUANTITY_EXCEEDS_TOTAL",
      "Assigned quantities cannot exceed the item quantity.",
    );
  }

  const canonicalInputs = [...inputs].sort(
    (first, second) =>
      compareParticipantIds(
        first.participantId,
        second.participantId,
      ),
  );

  const totalBigInt = BigInt(totalSen);

  const allocatedTargetBigInt =
    (totalBigInt * assignedQuantityBigInt) /
    itemQuantityBigInt;

  const calculatedShares = canonicalInputs.map(
    ({ participantId, quantity }) => {
      const numerator =
        totalBigInt * BigInt(quantity);

      return {
        participantId,
        quantity,
        baseAmountSen: Number(
          numerator / itemQuantityBigInt,
        ),
        fractionalRemainder:
          numerator % itemQuantityBigInt,
      };
    },
  );

  const baseAllocatedBigInt = calculatedShares.reduce(
    (sum, { baseAmountSen }) =>
      sum + BigInt(baseAmountSen),
    BigInt(0),
  );

  const remainderSen = Number(
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
      .slice(0, remainderSen)
      .map(({ participantId }) => participantId),
  );

  const allocations = calculatedShares.map(
    ({
      participantId,
      quantity,
      baseAmountSen,
    }) => {
      const remainderAmountSen: 0 | 1 =
        remainderRecipients.has(participantId)
          ? 1
          : 0;

      return {
        participantId,
        quantity,
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

  const assignedQuantity = Number(
    assignedQuantityBigInt,
  );

  return {
    totalSen,
    itemQuantity,
    assignedQuantity,
    unassignedQuantity:
      itemQuantity - assignedQuantity,
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