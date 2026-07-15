import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { allocateEqual } from "./allocation/equal-allocation";
import { calculateBill } from "./calculate-bill";

describe("calculateBill", () => {
  it("calculates a complete finalisable bill", () => {
    const result = calculateBill({
      printedTotalSen: 1_000,
      participantIds: [
        "participant-b",
        "participant-a",
      ],
      items: [
        {
          itemId: "item-a",
          lineTotalSen: 1_000,
          allocations: [
            {
              participantId: "participant-a",
              amountSen: 600,
            },
            {
              participantId: "participant-b",
              amountSen: 400,
            },
          ],
        },
      ],
      adjustments: [
        {
          adjustmentId: "tax-a",
          type: "tax",
          amountSen: 100,
          allocations: [
            {
              participantId: "participant-a",
              amountSen: 60,
            },
            {
              participantId: "participant-b",
              amountSen: 40,
            },
          ],
        },
        {
          adjustmentId: "discount-a",
          type: "discount",
          amountSen: -100,
          allocations: [
            {
              participantId: "participant-a",
              amountSen: -60,
            },
            {
              participantId: "participant-b",
              amountSen: -40,
            },
          ],
        },
      ],
    });

    expect(result.receipt.isReconciled).toBe(true);

    expect(result.itemStates[0]?.state).toBe(
      "fully_assigned",
    );

    expect(
      result.adjustmentStates.every(
        ({ state }) => state === "fully_assigned",
      ),
    ).toBe(true);

    expect(result.participantResult.participantSummaries).toEqual([
      {
        participantId: "participant-a",
        itemSubtotalSen: 600,
        adjustments: {
          discountSen: -60,
          serviceChargeSen: 0,
          taxSen: 60,
          roundingSen: 0,
          otherSen: 0,
          totalSen: 0,
        },
        finalAmountSen: 600,
      },
      {
        participantId: "participant-b",
        itemSubtotalSen: 400,
        adjustments: {
          discountSen: -40,
          serviceChargeSen: 0,
          taxSen: 40,
          roundingSen: 0,
          otherSen: 0,
          totalSen: 0,
        },
        finalAmountSen: 400,
      },
    ]);

    expect(result.financialState.canFinalise).toBe(true);
    expect(result.financialState.blockingReasons).toEqual([]);
  });

  it("reports a partially assigned item", () => {
    const result = calculateBill({
      printedTotalSen: 1_000,
      participantIds: ["participant-a"],
      items: [
        {
          itemId: "item-a",
          lineTotalSen: 1_000,
          allocations: [
            {
              participantId: "participant-a",
              amountSen: 600,
            },
          ],
        },
      ],
      adjustments: [],
    });

    expect(result.receipt.isReconciled).toBe(true);
    expect(result.itemStates[0]?.state).toBe(
      "partially_assigned",
    );

    expect(result.financialState.itemUnassignedSen).toBe(
      400,
    );

    expect(result.financialState.canFinalise).toBe(false);

    expect(
      result.financialState.blockingReasons,
    ).toContain("items_not_fully_assigned");
  });

  it("keeps receipt reconciliation separate from assignment", () => {
    const result = calculateBill({
      printedTotalSen: 999,
      participantIds: ["participant-a"],
      items: [
        {
          itemId: "item-a",
          lineTotalSen: 1_000,
          allocations: [
            {
              participantId: "participant-a",
              amountSen: 1_000,
            },
          ],
        },
      ],
      adjustments: [],
    });

    expect(result.itemStates[0]?.state).toBe(
      "fully_assigned",
    );

    expect(result.financialState.assignmentDifferenceSen).toBe(
      0,
    );

    expect(result.receipt.isReconciled).toBe(false);
    expect(result.receipt.differenceSen).toBe(1);

    expect(
      result.financialState.blockingReasons,
    ).toContain("receipt_not_reconciled");
  });

  it("calculates generated equal-split bills end to end", () => {
    fc.assert(
      fc.property(
        fc.integer({
          min: 0,
          max: 1_000_000_000,
        }),
        fc.integer({
          min: 1,
          max: 20,
        }),
        (totalSen, participantCount) => {
          const participantIds = Array.from(
            { length: participantCount },
            (_, index) => `participant-${index}`,
          );

          const equalAllocation = allocateEqual(
            totalSen,
            participantIds,
          );

          const result = calculateBill({
            printedTotalSen: totalSen,
            participantIds,
            items: [
              {
                itemId: "item-a",
                lineTotalSen: totalSen,
                allocations:
                  equalAllocation.allocations.map(
                    ({ participantId, amountSen }) => ({
                      participantId,
                      amountSen,
                    }),
                  ),
              },
            ],
            adjustments: [],
          });

          expect(result.receipt.isReconciled).toBe(true);

          expect(result.itemStates[0]?.state).toBe(
            "fully_assigned",
          );

          expect(
            result.participantResult.finalAllocatedTotalSen,
          ).toBe(totalSen);

          expect(result.financialState.canFinalise).toBe(
            true,
          );
        },
      ),
    );
  });

  it("rejects over-allocation through its domain components", () => {
    expect(() =>
      calculateBill({
        printedTotalSen: 1_000,
        participantIds: ["participant-a"],
        items: [
          {
            itemId: "item-a",
            lineTotalSen: 1_000,
            allocations: [
              {
                participantId: "participant-a",
                amountSen: 1_001,
              },
            ],
          },
        ],
        adjustments: [],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: "OVER_ALLOCATED_ITEM",
      }),
    );
  });
});