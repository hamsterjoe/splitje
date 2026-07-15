import { BillingDomainError } from "../errors";
import type {
  ParticipantAdjustmentAllocation,
  ParticipantAdjustmentTotals,
  ParticipantFinancialSummary,
  ParticipantFinancialSummaryResult,
  ParticipantId,
  ParticipantItemAllocation,
} from "../types";

interface SummaryAccumulator {
  itemSubtotal: bigint;
  discount: bigint;
  serviceCharge: bigint;
  tax: bigint;
  rounding: bigint;
  other: bigint;
}

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
      "Participant summary arithmetic exceeds the safe-integer range.",
    );
  }

  return Number(value);
}

function createAccumulator(): SummaryAccumulator {
  return {
    itemSubtotal: BigInt(0),
    discount: BigInt(0),
    serviceCharge: BigInt(0),
    tax: BigInt(0),
    rounding: BigInt(0),
    other: BigInt(0),
  };
}

function createAllocationPairKey(
  sourceId: string,
  participantId: ParticipantId,
): string {
  return JSON.stringify([sourceId, participantId]);
}

export function calculateParticipantFinancialSummaries(
  participantIds: ParticipantId[],
  itemAllocations: ParticipantItemAllocation[],
  adjustmentAllocations: ParticipantAdjustmentAllocation[],
): ParticipantFinancialSummaryResult {
  if (participantIds.length === 0) {
    throw new BillingDomainError(
      "NO_PARTICIPANTS",
      "Participant summaries require at least one participant.",
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

  const summariesByParticipant = new Map<
    ParticipantId,
    SummaryAccumulator
  >(
    canonicalParticipantIds.map((participantId) => [
      participantId,
      createAccumulator(),
    ]),
  );

  const itemAllocationPairs = new Set<string>();

  for (const allocation of itemAllocations) {
    if (isInvalidId(allocation.itemId)) {
      throw new BillingDomainError(
        "INVALID_ITEM_ID",
        "Item IDs must be non-empty strings.",
      );
    }

    if (isInvalidId(allocation.participantId)) {
      throw new BillingDomainError(
        "INVALID_PARTICIPANT_ID",
        "Participant IDs must be non-empty strings.",
      );
    }

    if (
      !knownParticipantIds.has(allocation.participantId)
    ) {
      throw new BillingDomainError(
        "UNKNOWN_PARTICIPANT_ID",
        "Item allocations must reference a known participant.",
      );
    }

    if (
      !Number.isSafeInteger(allocation.amountSen) ||
      allocation.amountSen < 0
    ) {
      throw new BillingDomainError(
        "INVALID_ALLOCATION_AMOUNT",
        "Item allocations must be non-negative safe integers in sen.",
      );
    }

    const pairKey = createAllocationPairKey(
      allocation.itemId,
      allocation.participantId,
    );

    if (itemAllocationPairs.has(pairKey)) {
      throw new BillingDomainError(
        "DUPLICATE_ITEM_ALLOCATION",
        "Each participant may have only one allocation per item.",
      );
    }

    itemAllocationPairs.add(pairKey);

    const accumulator = summariesByParticipant.get(
      allocation.participantId,
    );

    if (!accumulator) {
      throw new BillingDomainError(
        "UNKNOWN_PARTICIPANT_ID",
        "Item allocations must reference a known participant.",
      );
    }

    accumulator.itemSubtotal += BigInt(
      allocation.amountSen,
    );
  }

  const adjustmentAllocationPairs = new Set<string>();

  for (const allocation of adjustmentAllocations) {
    if (isInvalidId(allocation.adjustmentId)) {
      throw new BillingDomainError(
        "INVALID_ADJUSTMENT_ID",
        "Adjustment IDs must be non-empty strings.",
      );
    }

    if (isInvalidId(allocation.participantId)) {
      throw new BillingDomainError(
        "INVALID_PARTICIPANT_ID",
        "Participant IDs must be non-empty strings.",
      );
    }

    if (
      !knownParticipantIds.has(allocation.participantId)
    ) {
      throw new BillingDomainError(
        "UNKNOWN_PARTICIPANT_ID",
        "Adjustment allocations must reference a known participant.",
      );
    }

    if (!Number.isSafeInteger(allocation.amountSen)) {
      throw new BillingDomainError(
        "INVALID_ADJUSTMENT_ALLOCATION_AMOUNT",
        "Adjustment allocations must be safe integers in sen.",
      );
    }

    const pairKey = createAllocationPairKey(
      allocation.adjustmentId,
      allocation.participantId,
    );

    if (adjustmentAllocationPairs.has(pairKey)) {
      throw new BillingDomainError(
        "DUPLICATE_ADJUSTMENT_ALLOCATION",
        "Each participant may have only one allocation per adjustment.",
      );
    }

    adjustmentAllocationPairs.add(pairKey);

    const accumulator = summariesByParticipant.get(
      allocation.participantId,
    );

    if (!accumulator) {
      throw new BillingDomainError(
        "UNKNOWN_PARTICIPANT_ID",
        "Adjustment allocations must reference a known participant.",
      );
    }

    const amount = BigInt(allocation.amountSen);

    switch (allocation.type) {
      case "discount":
        accumulator.discount += amount;
        break;

      case "service_charge":
        accumulator.serviceCharge += amount;
        break;

      case "tax":
        accumulator.tax += amount;
        break;

      case "rounding":
        accumulator.rounding += amount;
        break;

      case "other":
        accumulator.other += amount;
        break;
    }
  }

  const participantSummaries: ParticipantFinancialSummary[] =
    canonicalParticipantIds.map((participantId) => {
      const accumulator =
        summariesByParticipant.get(participantId);

      if (!accumulator) {
        throw new BillingDomainError(
          "UNKNOWN_PARTICIPANT_ID",
          "Unable to create a summary for an unknown participant.",
        );
      }

      const adjustmentTotal =
        accumulator.discount +
        accumulator.serviceCharge +
        accumulator.tax +
        accumulator.rounding +
        accumulator.other;

      const finalAmount =
        accumulator.itemSubtotal + adjustmentTotal;

      const adjustments: ParticipantAdjustmentTotals = {
        discountSen: toSafeNumber(accumulator.discount),
        serviceChargeSen: toSafeNumber(
          accumulator.serviceCharge,
        ),
        taxSen: toSafeNumber(accumulator.tax),
        roundingSen: toSafeNumber(accumulator.rounding),
        otherSen: toSafeNumber(accumulator.other),
        totalSen: toSafeNumber(adjustmentTotal),
      };

      return {
        participantId,
        itemSubtotalSen: toSafeNumber(
          accumulator.itemSubtotal,
        ),
        adjustments,
        finalAmountSen: toSafeNumber(finalAmount),
      };
    });

  const itemAllocatedTotalBigInt =
    participantSummaries.reduce(
      (sum, summary) =>
        sum + BigInt(summary.itemSubtotalSen),
      BigInt(0),
    );

  const adjustmentAllocatedTotalBigInt =
    participantSummaries.reduce(
      (sum, summary) =>
        sum + BigInt(summary.adjustments.totalSen),
      BigInt(0),
    );

  const finalAllocatedTotalBigInt =
    itemAllocatedTotalBigInt +
    adjustmentAllocatedTotalBigInt;

  return {
    participantSummaries,
    itemAllocatedTotalSen: toSafeNumber(
      itemAllocatedTotalBigInt,
    ),
    adjustmentAllocatedTotalSen: toSafeNumber(
      adjustmentAllocatedTotalBigInt,
    ),
    finalAllocatedTotalSen: toSafeNumber(
      finalAllocatedTotalBigInt,
    ),
    hasNegativeParticipantTotal:
      participantSummaries.some(
        ({ finalAmountSen }) => finalAmountSen < 0,
      ),
  };
}