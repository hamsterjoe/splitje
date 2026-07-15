import { describe, expect, it } from "vitest";

import { calculateBill } from "../../../domain/billing/calculate-bill";
import { parseBillCalculationInput } from "./bill-calculation-input";

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

describe("parseBillCalculationInput", () => {
  it("parses a valid bill and passes it to the domain engine", () => {
    const parsed = parseBillCalculationInput(
      createValidInput(),
    );

    const result = calculateBill(parsed);

    expect(result.receipt.isReconciled).toBe(true);
    expect(result.financialState.canFinalise).toBe(true);
  });

  it("rejects money represented as a string", () => {
    const input = {
      ...createValidInput() as Record<string, unknown>,
      printedTotalSen: "1100",
    };

    expect(() =>
      parseBillCalculationInput(input),
    ).toThrow();
  });

  it("rejects fractional sen", () => {
    const input = {
      ...createValidInput() as Record<string, unknown>,
      printedTotalSen: 1_100.5,
    };

    expect(() =>
      parseBillCalculationInput(input),
    ).toThrow();
  });

  it("rejects an unsafe monetary integer", () => {
    const input = {
      ...createValidInput() as Record<string, unknown>,
      printedTotalSen:
        Number.MAX_SAFE_INTEGER + 1,
    };

    expect(() =>
      parseBillCalculationInput(input),
    ).toThrow();
  });

  it("rejects a negative item total", () => {
    const input = createValidInput() as {
      items: Array<{
        lineTotalSen: number;
      }>;
    };

    input.items[0]!.lineTotalSen = -1;

    expect(() =>
      parseBillCalculationInput(input),
    ).toThrow();
  });

  it("rejects a blank participant ID", () => {
    const input = createValidInput() as {
      participantIds: string[];
    };

    input.participantIds = ["   "];

    expect(() =>
      parseBillCalculationInput(input),
    ).toThrow();
  });

  it("rejects IDs with surrounding whitespace", () => {
    const input = createValidInput() as {
      participantIds: string[];
    };

    input.participantIds = [" participant-a "];

    expect(() =>
      parseBillCalculationInput(input),
    ).toThrow();
  });

  it("rejects an unsupported adjustment type", () => {
    const input = createValidInput() as {
      adjustments: Array<{
        type: string;
      }>;
    };

    input.adjustments[0]!.type = "mystery_tax";

    expect(() =>
      parseBillCalculationInput(input),
    ).toThrow();
  });

  it("rejects unknown object fields", () => {
    const input = {
      ...createValidInput() as Record<string, unknown>,
      unexpectedField: "unexpected",
    };

    expect(() =>
      parseBillCalculationInput(input),
    ).toThrow();
  });

  it("leaves cross-record validation to the domain engine", () => {
    const input = createValidInput() as {
      participantIds: string[];
    };

    input.participantIds = [
      "participant-a",
      "participant-a",
    ];

    const parsed = parseBillCalculationInput(input);

    expect(() => calculateBill(parsed)).toThrowError(
      expect.objectContaining({
        code: "DUPLICATE_PARTICIPANT_ID",
      }),
    );
  });
});