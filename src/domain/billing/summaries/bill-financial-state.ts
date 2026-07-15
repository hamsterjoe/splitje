import { BillingDomainError } from "../errors";
import type {
  AdjustmentAllocationSummary,
  BillFinalisationBlocker,
  BillFinancialState,
  ItemAllocationSummary,
  ParticipantFinancialSummaryResult,
  ReceiptReconciliationResult,
} from "../types";

function toSafeNumber(value: bigint): number {
  if (
    value < BigInt(Number.MIN_SAFE_INTEGER) ||
    value > BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    throw new BillingDomainError(
      "UNSAFE_CALCULATION",
      "Bill financial-state arithmetic exceeds the safe-integer range.",
    );
  }

  return Number(value);
}

export function evaluateBillFinancialState(
  receipt: ReceiptReconciliationResult,
  itemStates: ItemAllocationSummary[],
  adjustmentStates: AdjustmentAllocationSummary[],
  participantResult: ParticipantFinancialSummaryResult,
): BillFinancialState {
  const itemSourceTotalBigInt = itemStates.reduce(
    (sum, state) => sum + BigInt(state.itemTotalSen),
    BigInt(0),
  );

  const itemAllocatedBigInt = itemStates.reduce(
    (sum, state) => sum + BigInt(state.allocatedSen),
    BigInt(0),
  );

  const itemUnassignedBigInt = itemStates.reduce(
    (sum, state) => sum + BigInt(state.remainingSen),
    BigInt(0),
  );

  const adjustmentSourceTotalBigInt =
    adjustmentStates.reduce(
      (sum, state) =>
        sum + BigInt(state.adjustmentAmountSen),
      BigInt(0),
    );

  const adjustmentAllocatedBigInt =
    adjustmentStates.reduce(
      (sum, state) => sum + BigInt(state.allocatedSen),
      BigInt(0),
    );

  const adjustmentUnassignedBigInt =
    adjustmentStates.reduce(
      (sum, state) => sum + BigInt(state.remainingSen),
      BigInt(0),
    );

  const itemAllocatedSen = toSafeNumber(
    itemAllocatedBigInt,
  );

  const itemUnassignedSen = toSafeNumber(
    itemUnassignedBigInt,
  );

  const adjustmentAllocatedSen = toSafeNumber(
    adjustmentAllocatedBigInt,
  );

  const adjustmentUnassignedSen = toSafeNumber(
    adjustmentUnassignedBigInt,
  );

  const participantFinalTotalSen =
    participantResult.finalAllocatedTotalSen;

  const assignmentDifferenceSen = toSafeNumber(
    BigInt(receipt.calculatedTotalSen) -
      BigInt(participantFinalTotalSen),
  );

  const sourceTotalsMatch =
    itemSourceTotalBigInt ===
      BigInt(receipt.itemSubtotalSen) &&
    adjustmentSourceTotalBigInt ===
      BigInt(receipt.adjustmentTotalSen);

  const participantTotalsMatch =
    participantResult.itemAllocatedTotalSen ===
      itemAllocatedSen &&
    participantResult.adjustmentAllocatedTotalSen ===
      adjustmentAllocatedSen &&
    participantResult.finalAllocatedTotalSen ===
      itemAllocatedSen + adjustmentAllocatedSen;

  const allItemsAssigned =
    itemStates.length > 0 &&
    itemStates.every(
      ({ state }) => state === "fully_assigned",
    );

  const allAdjustmentsAssigned =
    adjustmentStates.every(
      ({ state }) => state === "fully_assigned",
    );

  const blockingReasons: BillFinalisationBlocker[] = [];

  if (itemStates.length === 0) {
    blockingReasons.push("no_items");
  }

  if (!receipt.isReconciled) {
    blockingReasons.push("receipt_not_reconciled");
  }

  if (!sourceTotalsMatch) {
    blockingReasons.push("source_totals_mismatch");
  }

  if (!allItemsAssigned && itemStates.length > 0) {
    blockingReasons.push("items_not_fully_assigned");
  }

  if (!allAdjustmentsAssigned) {
    blockingReasons.push(
      "adjustments_not_fully_assigned",
    );
  }

  if (!participantTotalsMatch) {
    blockingReasons.push("participant_totals_mismatch");
  }

  if (assignmentDifferenceSen !== 0) {
    blockingReasons.push("assignment_total_mismatch");
  }

  if (participantResult.hasNegativeParticipantTotal) {
    blockingReasons.push("negative_participant_total");
  }

  return {
    canFinalise: blockingReasons.length === 0,
    blockingReasons,
    calculatedReceiptTotalSen:
      receipt.calculatedTotalSen,
    participantFinalTotalSen,
    assignmentDifferenceSen,
    itemAllocatedSen,
    itemUnassignedSen,
    adjustmentAllocatedSen,
    adjustmentUnassignedSen,
  };
}