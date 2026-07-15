import { calculateItemAllocationState } from "../allocation/item-allocation-state";
import { BillingDomainError } from "../errors";
import type {
  AdjustmentBasesResult,
  CalculateAdjustmentBasesInput,
  ParticipantId,
} from "../types";

function compareIds(first: string, second: string): number {
  if (first < second) return -1;
  if (first > second) return 1;
  return 0;
}

function isInvalidId(id: string): boolean {
  return typeof id !== "string" || id.trim().length === 0;
}

function toSafeNumber(value: bigint): number {
  if (
    value < BigInt(Number.MIN_SAFE_INTEGER) ||
    value > BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    throw new BillingDomainError(
      "UNSAFE_CALCULATION",
      "Eligible adjustment bases exceed the safe-integer range.",
    );
  }

  return Number(value);
}

export function calculateAdjustmentBases(
  input: CalculateAdjustmentBasesInput,
): AdjustmentBasesResult {
  const {
    participantIds,
    items,
    applicableItemIds,
  } = input;

  if (participantIds.length === 0) {
    throw new BillingDomainError(
      "NO_PARTICIPANTS",
      "Adjustment bases require at least one participant.",
    );
  }

  if (participantIds.some(isInvalidId)) {
    throw new BillingDomainError(
      "INVALID_PARTICIPANT_ID",
      "Participant IDs must be non-empty strings.",
    );
  }

  if (new Set(participantIds).size !== participantIds.length) {
    throw new BillingDomainError(
      "DUPLICATE_PARTICIPANT_ID",
      "Participant IDs must be unique within a bill.",
    );
  }

  const canonicalParticipantIds = [...participantIds].sort(
    compareIds,
  );

  const knownParticipantIds = new Set(
    canonicalParticipantIds,
  );

  if (items.some(({ itemId }) => isInvalidId(itemId))) {
    throw new BillingDomainError(
      "INVALID_ITEM_ID",
      "Item IDs must be non-empty strings.",
    );
  }

  const itemIds = items.map(({ itemId }) => itemId);

  if (new Set(itemIds).size !== itemIds.length) {
    throw new BillingDomainError(
      "DUPLICATE_ITEM_ID",
      "Item IDs must be unique within a bill.",
    );
  }

  const itemsById = new Map(
    items.map((item) => [item.itemId, item]),
  );

  for (const item of items) {
    calculateItemAllocationState(
      item.lineTotalSen,
      item.allocations,
    );

    for (const allocation of item.allocations) {
      if (
        !knownParticipantIds.has(
          allocation.participantId,
        )
      ) {
        throw new BillingDomainError(
          "UNKNOWN_PARTICIPANT_ID",
          "Item allocations must reference a known participant.",
        );
      }
    }
  }

  let selectedItemIds: string[];

  if (
    applicableItemIds === null ||
    applicableItemIds === undefined
  ) {
    selectedItemIds = [...itemIds];
  } else {
    if (applicableItemIds.length === 0) {
      throw new BillingDomainError(
        "NO_ELIGIBLE_ITEMS",
        "At least one applicable item must be selected.",
      );
    }

    if (
      applicableItemIds.some((itemId) =>
        isInvalidId(itemId),
      )
    ) {
      throw new BillingDomainError(
        "INVALID_ITEM_ID",
        "Applicable item IDs must be non-empty strings.",
      );
    }

    if (
      new Set(applicableItemIds).size !==
      applicableItemIds.length
    ) {
      throw new BillingDomainError(
        "DUPLICATE_ITEM_ID",
        "Applicable item IDs must be unique.",
      );
    }

    for (const itemId of applicableItemIds) {
      if (!itemsById.has(itemId)) {
        throw new BillingDomainError(
          "UNKNOWN_ITEM_ID",
          "An applicable item does not exist in the bill.",
        );
      }
    }

    selectedItemIds = [...applicableItemIds];
  }

  if (selectedItemIds.length === 0) {
    throw new BillingDomainError(
      "NO_ELIGIBLE_ITEMS",
      "There are no items available for the adjustment base.",
    );
  }

  const canonicalApplicableItemIds =
    selectedItemIds.sort(compareIds);

  const selectedItemIdSet = new Set(
    canonicalApplicableItemIds,
  );

  const subtotalByParticipant = new Map<
    ParticipantId,
    bigint
  >(
    canonicalParticipantIds.map((participantId) => [
      participantId,
      BigInt(0),
    ]),
  );

  for (const item of items) {
    if (!selectedItemIdSet.has(item.itemId)) {
      continue;
    }

    for (const allocation of item.allocations) {
      const currentSubtotal =
        subtotalByParticipant.get(
          allocation.participantId,
        );

      if (currentSubtotal === undefined) {
        throw new BillingDomainError(
          "UNKNOWN_PARTICIPANT_ID",
          "Item allocations must reference a known participant.",
        );
      }

      subtotalByParticipant.set(
        allocation.participantId,
        currentSubtotal + BigInt(allocation.amountSen),
      );
    }
  }

  const bases = canonicalParticipantIds.map(
    (participantId) => ({
      participantId,
      itemSubtotalSen: toSafeNumber(
        subtotalByParticipant.get(participantId) ??
          BigInt(0),
      ),
    }),
  );

  const eligibleAllocatedSubtotalSen = toSafeNumber(
    bases.reduce(
      (sum, { itemSubtotalSen }) =>
        sum + BigInt(itemSubtotalSen),
      BigInt(0),
    ),
  );

  return {
    applicableItemIds: canonicalApplicableItemIds,
    eligibleAllocatedSubtotalSen,
    bases,
  };
}