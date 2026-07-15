import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { BillingDomainError } from "../errors";
import { allocateByPercentage } from "./percentage-allocation";

describe("allocateByPercentage", () => {
  it("allocates a complete 100% split exactly", () => {
    const result = allocateByPercentage(101, [
      {
        participantId: "participant-c",
        percentageBasisPoints: 3_334,
      },
      {
        participantId: "participant-a",
        percentageBasisPoints: 3_333,
      },
      {
        participantId: "participant-b",
        percentageBasisPoints: 3_333,
      },
    ]);

    expect(result.allocations).toEqual([
      {
        participantId: "participant-a",
        percentageBasisPoints: 3_333,
        baseAmountSen: 33,
        remainderAmountSen: 1,
        amountSen: 34,
      },
      {
        participantId: "participant-b",
        percentageBasisPoints: 3_333,
        baseAmountSen: 33,
        remainderAmountSen: 0,
        amountSen: 33,
      },
      {
        participantId: "participant-c",
        percentageBasisPoints: 3_334,
        baseAmountSen: 33,
        remainderAmountSen: 1,
        amountSen: 34,
      },
    ]);

    expect(result.percentageTotalBasisPoints).toBe(10_000);
    expect(result.allocatedTotalSen).toBe(101);
    expect(result.unassignedSen).toBe(0);

    expect(result.remainderParticipantIds).toEqual([
      "participant-a",
      "participant-c",
    ]);
  });

  it("leaves the unspecified percentage unassigned", () => {
    const result = allocateByPercentage(101, [
      {
        participantId: "participant-a",
        percentageBasisPoints: 5_000,
      },
    ]);

    expect(result.allocations[0]?.amountSen).toBe(50);
    expect(result.percentageTotalBasisPoints).toBe(5_000);
    expect(result.allocatedTotalSen).toBe(50);
    expect(result.unassignedSen).toBe(51);
  });

  it("does not normalise a partial percentage split to 100%", () => {
    const result = allocateByPercentage(1_000, [
      {
        participantId: "participant-a",
        percentageBasisPoints: 5_000,
      },
      {
        participantId: "participant-b",
        percentageBasisPoints: 2_500,
      },
    ]);

    expect(result.allocations.map(({ amountSen }) => amountSen)).toEqual([
      500,
      250,
    ]);

    expect(result.allocatedTotalSen).toBe(750);
    expect(result.unassignedSen).toBe(250);
  });

  it("rejects percentages exceeding 100%", () => {
    expect(() =>
      allocateByPercentage(1_000, [
        {
          participantId: "participant-a",
          percentageBasisPoints: 6_000,
        },
        {
          participantId: "participant-b",
          percentageBasisPoints: 4_001,
        },
      ]),
    ).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "PERCENTAGE_EXCEEDS_TOTAL",
      }),
    );
  });

  it.each([
    0,
    -1,
    1.5,
    10_001,
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ])(
    "rejects invalid percentage: %s",
    (percentageBasisPoints) => {
      expect(() =>
        allocateByPercentage(1_000, [
          {
            participantId: "participant-a",
            percentageBasisPoints,
          },
        ]),
      ).toThrowError(
        expect.objectContaining<Partial<BillingDomainError>>({
          code: "INVALID_PERCENTAGE",
        }),
      );
    },
  );

  it("rejects duplicate participant IDs", () => {
    expect(() =>
      allocateByPercentage(1_000, [
        {
          participantId: "participant-a",
          percentageBasisPoints: 5_000,
        },
        {
          participantId: "participant-a",
          percentageBasisPoints: 5_000,
        },
      ]),
    ).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "DUPLICATE_PARTICIPANT_ID",
      }),
    );
  });

  it("always matches the specified percentage target", () => {
    fc.assert(
      fc.property(
        fc.integer({
          min: 0,
          max: 1_000_000_000,
        }),
        fc.array(
          fc.integer({
            min: 1,
            max: 1_000,
          }),
          {
            minLength: 1,
            maxLength: 10,
          },
        ),
        (totalSen, percentages) => {
          const percentageTotal = percentages.reduce(
            (sum, percentage) => sum + percentage,
            0,
          );

          const result = allocateByPercentage(
            totalSen,
            percentages.map(
              (percentageBasisPoints, index) => ({
                participantId: `participant-${index}`,
                percentageBasisPoints,
              }),
            ),
          );

          const expectedAllocatedTotal = Number(
            (BigInt(totalSen) *
              BigInt(percentageTotal)) /
              BigInt(10_000),
          );

          const allocationSum = result.allocations.reduce(
            (sum, allocation) =>
              sum + allocation.amountSen,
            0,
          );

          expect(result.percentageTotalBasisPoints).toBe(
            percentageTotal,
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
        percentageBasisPoints: 2_500,
      },
      {
        participantId: "participant-a",
        percentageBasisPoints: 5_000,
      },
      {
        participantId: "participant-b",
        percentageBasisPoints: 2_500,
      },
    ];

    const forward = allocateByPercentage(101, inputs);
    const reversed = allocateByPercentage(
      101,
      inputs.toReversed(),
    );

    expect(reversed).toEqual(forward);
  });
});