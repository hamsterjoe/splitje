import { calculateAdjustmentAllocationState } from "./allocation/adjustment-allocation-state";
import { calculateItemAllocationState } from "./allocation/item-allocation-state";
import { reconcileReceipt } from "./reconciliation/receipt-reconciliation";
import { evaluateBillFinancialState } from "./summaries/bill-financial-state";
import { calculateParticipantFinancialSummaries } from "./summaries/participant-financial-summary";
import type {
  BillCalculationInput,
  BillCalculationResult,
} from "./types";

export function calculateBill(
  input: BillCalculationInput,
): BillCalculationResult {
  const {
    printedTotalSen,
    participantIds,
    items,
    adjustments,
  } = input;

  const receipt = reconcileReceipt(
    printedTotalSen,
    items.map(({ itemId, lineTotalSen }) => ({
      itemId,
      lineTotalSen,
    })),
    adjustments.map(
      ({ adjustmentId, type, amountSen }) => ({
        adjustmentId,
        type,
        amountSen,
      }),
    ),
  );

  const itemStates = items.map(
    ({ itemId, lineTotalSen, allocations }) => ({
      itemId,
      ...calculateItemAllocationState(
        lineTotalSen,
        allocations,
      ),
    }),
  );

  const adjustmentStates = adjustments.map(
    ({
      adjustmentId,
      type,
      amountSen,
      allocations,
    }) => ({
      adjustmentId,
      type,
      ...calculateAdjustmentAllocationState(
        amountSen,
        allocations,
      ),
    }),
  );

  const participantResult =
    calculateParticipantFinancialSummaries(
      participantIds,
      items.flatMap(({ itemId, allocations }) =>
        allocations.map(
          ({ participantId, amountSen }) => ({
            itemId,
            participantId,
            amountSen,
          }),
        ),
      ),
      adjustments.flatMap(
        ({ adjustmentId, type, allocations }) =>
          allocations.map(
            ({ participantId, amountSen }) => ({
              adjustmentId,
              participantId,
              type,
              amountSen,
            }),
          ),
      ),
    );

  const financialState = evaluateBillFinancialState(
    receipt,
    itemStates,
    adjustmentStates,
    participantResult,
  );

  return {
    receipt,
    itemStates,
    adjustmentStates,
    participantResult,
    financialState,
  };
}