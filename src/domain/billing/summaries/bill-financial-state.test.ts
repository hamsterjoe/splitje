import { describe, expect, it } from "vitest";

import { calculateAdjustmentAllocationState } from "../allocation/adjustment-allocation-state";
import { calculateItemAllocationState } from "../allocation/item-allocation-state";
import { reconcileReceipt } from "../reconciliation/receipt-reconciliation";
import { calculateParticipantFinancialSummaries } from "./participant-financial-summary";
import { evaluateBillFinancialState } from "./bill-financial-state";

function createReadyBill() {
  const receipt = reconcileReceipt(
    1_000,
    [
      {
        itemId: "item-a",
        lineTotalSen: 1_000,
      },
    ],
    [
      {
        adjustmentId: "tax-a",
        type: "tax",
        amountSen: 100,
      },
      {
        adjustmentId: "discount-a",
        type: "discount",
        amountSen: -100,
      },
    ],
  );

  const itemStates = [
    calculateItemAllocationState(1_000, [
      {
        participantId: "participant-a",
        amountSen: 1_000,
      },
    ]),
  ];

  const adjustmentStates = [
    calculateAdjustmentAllocationState(100, [
      {
        participantId: "participant-a",
        amountSen: 100,
      },
    ]),
    calculateAdjustmentAllocationState(-100, [
      {
        participantId: "participant-a",
        amountSen: -100,
      },
    ]),
  ];

  const participantResult =
    calculateParticipantFinancialSummaries(
      ["participant-a"],
      [
        {
          itemId: "item-a",
          participantId: "participant-a",
          amountSen: 1_000,
        },
      ],
      [
        {
          adjustmentId: "tax-a",
          participantId: "participant-a",
          type: "tax",
          amountSen: 100,
        },
        {
          adjustmentId: "discount-a",
          participantId: "participant-a",
          type: "discount",
          amountSen: -100,
        },
      ],
    );

  return {
    receipt,
    itemStates,
    adjustmentStates,
    participantResult,
  };
}

describe("evaluateBillFinancialState", () => {
  it("allows finalisation when every financial check passes", () => {
    const readyBill = createReadyBill();

    const result = evaluateBillFinancialState(
      readyBill.receipt,
      readyBill.itemStates,
      readyBill.adjustmentStates,
      readyBill.participantResult,
    );

    expect(result).toEqual({
      canFinalise: true,
      blockingReasons: [],
      calculatedReceiptTotalSen: 1_000,
      participantFinalTotalSen: 1_000,
      assignmentDifferenceSen: 0,
      itemAllocatedSen: 1_000,
      itemUnassignedSen: 0,
      adjustmentAllocatedSen: 0,
      adjustmentUnassignedSen: 0,
    });
  });

  it("blocks finalisation when the receipt is not reconciled", () => {
    const readyBill = createReadyBill();

    const unreconciledReceipt = reconcileReceipt(
      1_001,
      readyBill.receipt.items,
      readyBill.receipt.adjustments,
    );

    const result = evaluateBillFinancialState(
      unreconciledReceipt,
      readyBill.itemStates,
      readyBill.adjustmentStates,
      readyBill.participantResult,
    );

    expect(result.canFinalise).toBe(false);
    expect(result.blockingReasons).toContain(
      "receipt_not_reconciled",
    );
  });

  it("blocks finalisation for a partially assigned item", () => {
    const readyBill = createReadyBill();

    const partialItemStates = [
      calculateItemAllocationState(1_000, [
        {
          participantId: "participant-a",
          amountSen: 600,
        },
      ]),
    ];

    const partialParticipantResult =
      calculateParticipantFinancialSummaries(
        ["participant-a"],
        [
          {
            itemId: "item-a",
            participantId: "participant-a",
            amountSen: 600,
          },
        ],
        [
          {
            adjustmentId: "tax-a",
            participantId: "participant-a",
            type: "tax",
            amountSen: 100,
          },
          {
            adjustmentId: "discount-a",
            participantId: "participant-a",
            type: "discount",
            amountSen: -100,
          },
        ],
      );

    const result = evaluateBillFinancialState(
      readyBill.receipt,
      partialItemStates,
      readyBill.adjustmentStates,
      partialParticipantResult,
    );

    expect(result.canFinalise).toBe(false);
    expect(result.itemUnassignedSen).toBe(400);
    expect(result.assignmentDifferenceSen).toBe(400);

    expect(result.blockingReasons).toContain(
      "items_not_fully_assigned",
    );

    expect(result.blockingReasons).toContain(
      "assignment_total_mismatch",
    );
  });

  it("blocks finalisation for a partially assigned adjustment", () => {
    const readyBill = createReadyBill();

    const partialAdjustmentStates = [
      calculateAdjustmentAllocationState(100, [
        {
          participantId: "participant-a",
          amountSen: 50,
        },
      ]),
      readyBill.adjustmentStates[1]!,
    ];

    const partialParticipantResult =
      calculateParticipantFinancialSummaries(
        ["participant-a"],
        [
          {
            itemId: "item-a",
            participantId: "participant-a",
            amountSen: 1_000,
          },
        ],
        [
          {
            adjustmentId: "tax-a",
            participantId: "participant-a",
            type: "tax",
            amountSen: 50,
          },
          {
            adjustmentId: "discount-a",
            participantId: "participant-a",
            type: "discount",
            amountSen: -100,
          },
        ],
      );

    const result = evaluateBillFinancialState(
      readyBill.receipt,
      readyBill.itemStates,
      partialAdjustmentStates,
      partialParticipantResult,
    );

    expect(result.canFinalise).toBe(false);
    expect(result.adjustmentUnassignedSen).toBe(50);
    expect(result.assignmentDifferenceSen).toBe(50);

    expect(result.blockingReasons).toContain(
      "adjustments_not_fully_assigned",
    );
  });

  it("blocks finalisation when there are no items", () => {
    const receipt = reconcileReceipt(0, [], []);

    const participantResult =
      calculateParticipantFinancialSummaries(
        ["participant-a"],
        [],
        [],
      );

    const result = evaluateBillFinancialState(
      receipt,
      [],
      [],
      participantResult,
    );

    expect(result.canFinalise).toBe(false);
    expect(result.blockingReasons).toContain("no_items");
  });

  it("blocks negative participant totals", () => {
    const readyBill = createReadyBill();

    const result = evaluateBillFinancialState(
      readyBill.receipt,
      readyBill.itemStates,
      readyBill.adjustmentStates,
      {
        ...readyBill.participantResult,
        hasNegativeParticipantTotal: true,
      },
    );

    expect(result.canFinalise).toBe(false);

    expect(result.blockingReasons).toContain(
      "negative_participant_total",
    );
  });

  it("detects inconsistent source totals", () => {
    const readyBill = createReadyBill();

    const inconsistentItemStates = [
      calculateItemAllocationState(999, [
        {
          participantId: "participant-a",
          amountSen: 999,
        },
      ]),
    ];

    const result = evaluateBillFinancialState(
      readyBill.receipt,
      inconsistentItemStates,
      readyBill.adjustmentStates,
      readyBill.participantResult,
    );

    expect(result.canFinalise).toBe(false);

    expect(result.blockingReasons).toContain(
      "source_totals_mismatch",
    );
  });
});