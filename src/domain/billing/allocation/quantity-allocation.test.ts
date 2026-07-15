import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { BillingDomainError } from "../errors";
import { allocateByQuantity } from "./quantity-allocation";

describe("allocateByQuantity", () => {
  it("allocates a complete quantity split exactly", () => {
    const result = allocateByQuantity(
      1_000,
      3,
      [
        {
          participantId: "participant-b",
          quantity: 1,
        },
        {
          participantId: "participant-a",
          quantity: 2,
        },
      ],
    );

    expect(result.allocations).toEqual([
      {
        participantId: "participant-a",
        quantity: 2,
        baseAmountSen: 666,
        remainderAmountSen: 1,
        amountSen: 667,
      },
      {
        participantId: "participant-b",
        quantity: 1,
        baseAmountSen: 333,
        remainderAmountSen: 0,
        amountSen: 333,
      },
    ]);

    expect(result.itemQuantity).toBe(3);
    expect(result.assignedQuantity).toBe(3);
    expect(result.unassignedQuantity).toBe(0);
    expect(result.allocatedTotalSen).toBe(1_000);
    expect(result.unassignedSen).toBe(0);

    expect(result.remainderParticipantIds).toEqual([
      "participant-a",
    ]);
  });

  it("leaves unclaimed quantities and money unassigned", () => {
    const result = allocateByQuantity(
      1_000,
      3,
      [
        {
          participantId: "participant-a",
          quantity: 1,
        },
      ],
    );

    expect(result.assignedQuantity).toBe(1);
    expect(result.unassignedQuantity).toBe(2);
    expect(result.allocatedTotalSen).toBe(333);
    expect(result.unassignedSen).toBe(667);
  });

  it("does not normalise a partial quantity claim", () => {
    const result = allocateByQuantity(
      1_000,
      4,
      [
        {
          participantId: "participant-a",
          quantity: 2,
        },
        {
          participantId: "participant-b",
          quantity: 1,
        },
      ],
    );

    expect(result.allocations.map(({ amountSen }) => amountSen)).toEqual([
      500,
      250,
    ]);

    expect(result.assignedQuantity).toBe(3);
    expect(result.unassignedQuantity).toBe(1);
    expect(result.allocatedTotalSen).toBe(750);
    expect(result.unassignedSen).toBe(250);
  });

  it("rejects assigned quantities exceeding the item quantity", () => {
    expect(() =>
      allocateByQuantity(
        1_000,
        3,
        [
          {
            participantId: "participant-a",
            quantity: 2,
          },
          {
            participantId: "participant-b",
            quantity: 2,
          },
        ],
      ),
    ).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "QUANTITY_EXCEEDS_TOTAL",
      }),
    );
  });

  it.each([
    0,
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ])(
    "rejects invalid item quantity: %s",
    (itemQuantity) => {
      expect(() =>
        allocateByQuantity(
          1_000,
          itemQuantity,
          [
            {
              participantId: "participant-a",
              quantity: 1,
            },
          ],
        ),
      ).toThrowError(
        expect.objectContaining<Partial<BillingDomainError>>({
          code: "INVALID_QUANTITY",
        }),
      );
    },
  );

  it.each([
    0,
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ])(
    "rejects invalid participant quantity: %s",
    (quantity) => {
      expect(() =>
        allocateByQuantity(
          1_000,
          3,
          [
            {
              participantId: "participant-a",
              quantity,
            },
          ],
        ),
      ).toThrowError(
        expect.objectContaining<Partial<BillingDomainError>>({
          code: "INVALID_QUANTITY",
        }),
      );
    },
  );

  it("rejects duplicate participant IDs", () => {
    expect(() =>
      allocateByQuantity(
        1_000,
        3,
        [
          {
            participantId: "participant-a",
            quantity: 1,
          },
          {
            participantId: "participant-a",
            quantity: 2,
          },
        ],
      ),
    ).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "DUPLICATE_PARTICIPANT_ID",
      }),
    );
  });

  it("matches the exact assigned-quantity target", () => {
    fc.assert(
      fc.property(
        fc.integer({
          min: 0,
          max: 1_000_000_000,
        }),
        fc.array(
          fc.integer({
            min: 1,
            max: 10,
          }),
          {
            minLength: 1,
            maxLength: 10,
          },
        ),
        fc.integer({
          min: 0,
          max: 10,
        }),
        (totalSen, quantities, extraQuantity) => {
          const assignedQuantity = quantities.reduce(
            (sum, quantity) => sum + quantity,
            0,
          );

          const itemQuantity =
            assignedQuantity + extraQuantity;

          const result = allocateByQuantity(
            totalSen,
            itemQuantity,
            quantities.map((quantity, index) => ({
              participantId: `participant-${index}`,
              quantity,
            })),
          );

          const expectedAllocatedTotal = Number(
            (BigInt(totalSen) *
              BigInt(assignedQuantity)) /
              BigInt(itemQuantity),
          );

          const allocationSum = result.allocations.reduce(
            (sum, allocation) =>
              sum + allocation.amountSen,
            0,
          );

          expect(result.assignedQuantity).toBe(
            assignedQuantity,
          );

          expect(result.unassignedQuantity).toBe(
            extraQuantity,
          );

          expect(result.allocatedTotalSen).toBe(
            expectedAllocatedTotal,
          );

          expect(allocationSum).toBe(
            expectedAllocatedTotal,
          );

          expect(
            result.allocatedTotalSen +
              result.unassignedSen,
          ).toBe(totalSen);
        },
      ),
    );
  });

  it("is independent of input order", () => {
    const inputs = [
      {
        participantId: "participant-c",
        quantity: 1,
      },
      {
        participantId: "participant-a",
        quantity: 2,
      },
      {
        participantId: "participant-b",
        quantity: 1,
      },
    ];

    const forward = allocateByQuantity(
      1_001,
      4,
      inputs,
    );

    const reversed = allocateByQuantity(
      1_001,
      4,
      inputs.toReversed(),
    );

    expect(reversed).toEqual(forward);
  });
});