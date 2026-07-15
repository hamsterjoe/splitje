import { describe, expect, it } from "vitest";

import { calculateValidatedBill } from "./calculate-validated-bill";

function createValidInput(): unknown {
  return {
    printedTotalSen: 1_100,
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
    adjustments: [
      {
        adjustmentId: "tax-a",
        type: "tax",
        amountSen: 100,
        allocations: [
          {
            participantId: "participant-a",
            amountSen: 100,
          },
        ],
      },
    ],
  };
}

describe("calculateValidatedBill", () => {
  it("returns a successful calculated bill", () => {
    const result = calculateValidatedBill(
      createValidInput(),
    );

    expect(result.success).toBe(true);

    if (!result.success) {
      throw new Error("Expected a successful result.");
    }

    expect(result.data.receipt.isReconciled).toBe(true);

    expect(
      result.data.financialState.canFinalise,
    ).toBe(true);
  });

  it("returns structured Zod validation issues", () => {
    const input = {
      ...(createValidInput() as Record<string, unknown>),
      printedTotalSen: "RM11.00",
    };

    const result = calculateValidatedBill(input);

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error("Expected a validation error.");
    }

    expect(result.error.type).toBe(
      "validation_error",
    );

    if (result.error.type !== "validation_error") {
      throw new Error(
        "Expected a validation-error result.",
      );
    }

    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "printedTotalSen",
        }),
      ]),
    );
  });

  it("returns nested validation paths", () => {
    const input = createValidInput() as {
      items: Array<{
        allocations: Array<{
          amountSen: unknown;
        }>;
      }>;
    };

    input.items[0]!.allocations[0]!.amountSen =
      100.5;

    const result = calculateValidatedBill(input);

    expect(result.success).toBe(false);

    if (
      result.success ||
      result.error.type !== "validation_error"
    ) {
      throw new Error(
        "Expected a validation-error result.",
      );
    }

    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "items.0.allocations.0.amountSen",
        }),
      ]),
    );
  });

  it("returns a structured domain error", () => {
    const input = createValidInput() as {
      participantIds: string[];
    };

    input.participantIds = [
      "participant-a",
      "participant-a",
    ];

    const result = calculateValidatedBill(input);

    expect(result).toEqual({
      success: false,
      error: {
        type: "domain_error",
        code: "DUPLICATE_PARTICIPANT_ID",
        message:
          "Participant IDs must be unique within a bill.",
      },
    });
  });

  it("returns an over-allocation as a domain error", () => {
    const input = createValidInput() as {
      items: Array<{
        allocations: Array<{
          amountSen: number;
        }>;
      }>;
    };

    input.items[0]!.allocations[0]!.amountSen =
      1_001;

    const result = calculateValidatedBill(input);

    expect(result.success).toBe(false);

    if (
      result.success ||
      result.error.type !== "domain_error"
    ) {
      throw new Error(
        "Expected a domain-error result.",
      );
    }

    expect(result.error.code).toBe(
      "OVER_ALLOCATED_ITEM",
    );
  });
});