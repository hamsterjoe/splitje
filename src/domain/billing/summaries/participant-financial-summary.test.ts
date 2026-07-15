import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { BillingDomainError } from "../errors";
import { calculateParticipantFinancialSummaries } from "./participant-financial-summary";

describe("calculateParticipantFinancialSummaries", () => {
  it("combines item and adjustment allocations by participant", () => {
    const result = calculateParticipantFinancialSummaries(
      [
        "participant-c",
        "participant-a",
        "participant-b",
      ],
      [
        {
          itemId: "item-a",
          participantId: "participant-a",
          amountSen: 3_000,
        },
        {
          itemId: "item-b",
          participantId: "participant-b",
          amountSen: 2_000,
        },
      ],
      [
        {
          adjustmentId: "service-a",
          participantId: "participant-a",
          type: "service_charge",
          amountSen: 300,
        },
        {
          adjustmentId: "service-a",
          participantId: "participant-b",
          type: "service_charge",
          amountSen: 200,
        },
        {
          adjustmentId: "tax-a",
          participantId: "participant-a",
          type: "tax",
          amountSen: 180,
        },
        {
          adjustmentId: "tax-a",
          participantId: "participant-b",
          type: "tax",
          amountSen: 120,
        },
        {
          adjustmentId: "discount-a",
          participantId: "participant-a",
          type: "discount",
          amountSen: -200,
        },
        {
          adjustmentId: "discount-a",
          participantId: "participant-b",
          type: "discount",
          amountSen: -100,
        },
        {
          adjustmentId: "rounding-a",
          participantId: "participant-a",
          type: "rounding",
          amountSen: 1,
        },
      ],
    );

    expect(result.participantSummaries).toEqual([
      {
        participantId: "participant-a",
        itemSubtotalSen: 3_000,
        adjustments: {
          discountSen: -200,
          serviceChargeSen: 300,
          taxSen: 180,
          roundingSen: 1,
          otherSen: 0,
          totalSen: 281,
        },
        finalAmountSen: 3_281,
      },
      {
        participantId: "participant-b",
        itemSubtotalSen: 2_000,
        adjustments: {
          discountSen: -100,
          serviceChargeSen: 200,
          taxSen: 120,
          roundingSen: 0,
          otherSen: 0,
          totalSen: 220,
        },
        finalAmountSen: 2_220,
      },
      {
        participantId: "participant-c",
        itemSubtotalSen: 0,
        adjustments: {
          discountSen: 0,
          serviceChargeSen: 0,
          taxSen: 0,
          roundingSen: 0,
          otherSen: 0,
          totalSen: 0,
        },
        finalAmountSen: 0,
      },
    ]);

    expect(result.itemAllocatedTotalSen).toBe(5_000);
    expect(result.adjustmentAllocatedTotalSen).toBe(501);
    expect(result.finalAllocatedTotalSen).toBe(5_501);
    expect(result.hasNegativeParticipantTotal).toBe(false);
  });

  it("exposes a negative participant total for later review", () => {
    const result = calculateParticipantFinancialSummaries(
      ["participant-a"],
      [
        {
          itemId: "item-a",
          participantId: "participant-a",
          amountSen: 0,
        },
      ],
      [
        {
          adjustmentId: "discount-a",
          participantId: "participant-a",
          type: "discount",
          amountSen: -100,
        },
      ],
    );

    expect(
      result.participantSummaries[0]?.finalAmountSen,
    ).toBe(-100);

    expect(result.hasNegativeParticipantTotal).toBe(true);
  });

  it("rejects an allocation for an unknown participant", () => {
    expect(() =>
      calculateParticipantFinancialSummaries(
        ["participant-a"],
        [
          {
            itemId: "item-a",
            participantId: "participant-unknown",
            amountSen: 100,
          },
        ],
        [],
      ),
    ).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "UNKNOWN_PARTICIPANT_ID",
      }),
    );
  });

  it("rejects duplicate item-participant allocations", () => {
    expect(() =>
      calculateParticipantFinancialSummaries(
        ["participant-a"],
        [
          {
            itemId: "item-a",
            participantId: "participant-a",
            amountSen: 50,
          },
          {
            itemId: "item-a",
            participantId: "participant-a",
            amountSen: 50,
          },
        ],
        [],
      ),
    ).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "DUPLICATE_ITEM_ALLOCATION",
      }),
    );
  });

  it("allows the same item to be allocated to different participants", () => {
    const result = calculateParticipantFinancialSummaries(
      ["participant-a", "participant-b"],
      [
        {
          itemId: "item-a",
          participantId: "participant-a",
          amountSen: 50,
        },
        {
          itemId: "item-a",
          participantId: "participant-b",
          amountSen: 50,
        },
      ],
      [],
    );

    expect(result.itemAllocatedTotalSen).toBe(100);
  });

  it("rejects duplicate adjustment-participant allocations", () => {
    expect(() =>
      calculateParticipantFinancialSummaries(
        ["participant-a"],
        [],
        [
          {
            adjustmentId: "tax-a",
            participantId: "participant-a",
            type: "tax",
            amountSen: 50,
          },
          {
            adjustmentId: "tax-a",
            participantId: "participant-a",
            type: "tax",
            amountSen: 50,
          },
        ],
      ),
    ).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "DUPLICATE_ADJUSTMENT_ALLOCATION",
      }),
    );
  });

  it("rejects negative item allocations", () => {
    expect(() =>
      calculateParticipantFinancialSummaries(
        ["participant-a"],
        [
          {
            itemId: "item-a",
            participantId: "participant-a",
            amountSen: -1,
          },
        ],
        [],
      ),
    ).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "INVALID_ALLOCATION_AMOUNT",
      }),
    );
  });

  it("produces the same result regardless of input order", () => {
    const participants = [
      "participant-b",
      "participant-a",
    ];

    const items = [
      {
        itemId: "item-b",
        participantId: "participant-b",
        amountSen: 200,
      },
      {
        itemId: "item-a",
        participantId: "participant-a",
        amountSen: 100,
      },
    ];

    const adjustments = [
      {
        adjustmentId: "tax-b",
        participantId: "participant-b",
        type: "tax" as const,
        amountSen: 20,
      },
      {
        adjustmentId: "tax-a",
        participantId: "participant-a",
        type: "tax" as const,
        amountSen: 10,
      },
    ];

    const forward =
      calculateParticipantFinancialSummaries(
        participants,
        items,
        adjustments,
      );

    const reversed =
      calculateParticipantFinancialSummaries(
        participants.toReversed(),
        items.toReversed(),
        adjustments.toReversed(),
      );

    expect(reversed).toEqual(forward);
  });

  it("rejects an empty participant list", () => {
    expect(() =>
      calculateParticipantFinancialSummaries(
        [],
        [],
        [],
      ),
    ).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "NO_PARTICIPANTS",
      }),
    );
  });

  it("rejects an invalid participant ID", () => {
    expect(() =>
      calculateParticipantFinancialSummaries(
        ["   "],
        [],
        [],
      ),
    ).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "INVALID_PARTICIPANT_ID",
      }),
    );
  });

  it("rejects duplicate bill participant IDs", () => {
    expect(() =>
      calculateParticipantFinancialSummaries(
        ["participant-a", "participant-a"],
        [],
        [],
      ),
    ).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "DUPLICATE_PARTICIPANT_ID",
      }),
    );
  });

  it("rejects an invalid item ID", () => {
    expect(() =>
      calculateParticipantFinancialSummaries(
        ["participant-a"],
        [
          {
            itemId: "   ",
            participantId: "participant-a",
            amountSen: 100,
          },
        ],
        [],
      ),
    ).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "INVALID_ITEM_ID",
      }),
    );
  });

  it("rejects an invalid adjustment ID", () => {
    expect(() =>
      calculateParticipantFinancialSummaries(
        ["participant-a"],
        [],
        [
          {
            adjustmentId: "",
            participantId: "participant-a",
            type: "tax",
            amountSen: 100,
          },
        ],
      ),
    ).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "INVALID_ADJUSTMENT_ID",
      }),
    );
  });

  it("rejects an adjustment for an unknown participant", () => {
    expect(() =>
      calculateParticipantFinancialSummaries(
        ["participant-a"],
        [],
        [
          {
            adjustmentId: "tax-a",
            participantId: "participant-unknown",
            type: "tax",
            amountSen: 100,
          },
        ],
      ),
    ).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "UNKNOWN_PARTICIPANT_ID",
      }),
    );
  });

  it("rejects an unsafe adjustment allocation", () => {
    expect(() =>
      calculateParticipantFinancialSummaries(
        ["participant-a"],
        [],
        [
          {
            adjustmentId: "tax-a",
            participantId: "participant-a",
            type: "tax",
            amountSen: Number.POSITIVE_INFINITY,
          },
        ],
      ),
    ).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "INVALID_ADJUSTMENT_ALLOCATION_AMOUNT",
      }),
    );
  });

  it("rejects participant summary arithmetic outside the safe range", () => {
    expect(() =>
      calculateParticipantFinancialSummaries(
        ["participant-a"],
        [
          {
            itemId: "item-a",
            participantId: "participant-a",
            amountSen: Number.MAX_SAFE_INTEGER,
          },
          {
            itemId: "item-b",
            participantId: "participant-a",
            amountSen: 1,
          },
        ],
        [],
      ),
    ).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "UNSAFE_CALCULATION",
      }),
    );
  });

  it("preserves the total across generated participant summaries", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.integer({
              min: 0,
              max: 1_000_000,
            }),
            fc.integer({
              min: -100_000,
              max: 100_000,
            }),
          ),
          {
            minLength: 1,
            maxLength: 20,
          },
        ),
        (amountPairs) => {
          const participantIds = amountPairs.map(
            (_, index) => `participant-${index}`,
          );

          const itemAllocations = amountPairs.map(
            ([amountSen], index) => ({
              itemId: `item-${index}`,
              participantId: `participant-${index}`,
              amountSen,
            }),
          );

          const adjustmentAllocations = amountPairs.map(
            ([, amountSen], index) => ({
              adjustmentId: `adjustment-${index}`,
              participantId: `participant-${index}`,
              type: "other" as const,
              amountSen,
            }),
          );

          const result =
            calculateParticipantFinancialSummaries(
              participantIds,
              itemAllocations,
              adjustmentAllocations,
            );

          const expectedItemTotal = itemAllocations.reduce(
            (sum, allocation) =>
              sum + allocation.amountSen,
            0,
          );

          const expectedAdjustmentTotal =
            adjustmentAllocations.reduce(
              (sum, allocation) =>
                sum + allocation.amountSen,
              0,
            );

          const participantTotal =
            result.participantSummaries.reduce(
              (sum, summary) =>
                sum + summary.finalAmountSen,
              0,
            );

          expect(result.itemAllocatedTotalSen).toBe(
            expectedItemTotal,
          );

          expect(result.adjustmentAllocatedTotalSen).toBe(
            expectedAdjustmentTotal,
          );

          expect(result.finalAllocatedTotalSen).toBe(
            expectedItemTotal + expectedAdjustmentTotal,
          );

          expect(participantTotal).toBe(
            result.finalAllocatedTotalSen,
          );
        },
      ),
    );
  });

  it("rejects an invalid participant ID in an item allocation", () => {
    expect(() =>
      calculateParticipantFinancialSummaries(
        ["participant-a"],
        [
          {
            itemId: "item-a",
            participantId: "   ",
            amountSen: 100,
          },
        ],
        [],
      ),
    ).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "INVALID_PARTICIPANT_ID",
      }),
    );
  });

  it("rejects an invalid participant ID in an adjustment allocation", () => {
    expect(() =>
      calculateParticipantFinancialSummaries(
        ["participant-a"],
        [],
        [
          {
            adjustmentId: "tax-a",
            participantId: "",
            type: "tax",
            amountSen: 100,
          },
        ],
      ),
    ).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "INVALID_PARTICIPANT_ID",
      }),
    );
  });

  it("rejects unsafe aggregated adjustment arithmetic", () => {
    expect(() =>
      calculateParticipantFinancialSummaries(
        ["participant-a"],
        [],
        [
          {
            adjustmentId: "tax-a",
            participantId: "participant-a",
            type: "tax",
            amountSen: Number.MAX_SAFE_INTEGER,
          },
          {
            adjustmentId: "tax-b",
            participantId: "participant-a",
            type: "tax",
            amountSen: 1,
          },
        ],
      ),
    ).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "UNSAFE_CALCULATION",
      }),
    );
  });
});