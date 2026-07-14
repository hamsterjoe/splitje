import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { BillingDomainError } from "../errors";
import { allocateEqual } from "./equal-allocation";

describe("allocateEqual", () => {
  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid totalSen: %s",
    (totalSen) => {
      expect(() => allocateEqual(totalSen, ["participant-a"])).toThrowError(
        expect.objectContaining<Partial<BillingDomainError>>({
          code: "INVALID_TOTAL_SEN",
        }),
      );
    },
  );

  it("rejects an empty or whitespace-only participant ID", () => {
    expect(() => allocateEqual(100, ["participant-a", "   "])).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "INVALID_PARTICIPANT_ID",
      }),
    );
  });

  it("handles a zero-sen total without inventing money", () => {
    const result = allocateEqual(0, [
      "participant-b",
      "participant-a",
    ]);

    expect(result.allocations.map((allocation) => allocation.amountSen)).toEqual([
      0,
      0,
    ]);

    expect(result.allocatedTotalSen).toBe(0);
    expect(result.remainderParticipantIds).toEqual([]);
  });

  it("splits an exactly divisible total equally", () => {
    const result = allocateEqual(300, [
      "participant-c",
      "participant-a",
      "participant-b",
    ]);

    expect(result.allocations).toEqual([
      {
        participantId: "participant-a",
        baseAmountSen: 100,
        remainderAmountSen: 0,
        amountSen: 100,
      },
      {
        participantId: "participant-b",
        baseAmountSen: 100,
        remainderAmountSen: 0,
        amountSen: 100,
      },
      {
        participantId: "participant-c",
        baseAmountSen: 100,
        remainderAmountSen: 0,
        amountSen: 100,
      },
    ]);

    expect(result.allocatedTotalSen).toBe(300);
    expect(result.remainderParticipantIds).toEqual([]);
  });

  it("assigns remainder sen in canonical participant order", () => {
    const result = allocateEqual(101, [
      "participant-c",
      "participant-a",
      "participant-b",
    ]);

    expect(result.allocations.map((allocation) => allocation.amountSen)).toEqual([
      34,
      34,
      33,
    ]);

    expect(result.remainderParticipantIds).toEqual([
      "participant-a",
      "participant-b",
    ]);
  });

  it("rejects an empty participant list", () => {
    expect(() => allocateEqual(100, [])).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "NO_PARTICIPANTS",
      }),
    );
  });

  it("rejects duplicate participant IDs", () => {
    expect(() =>
      allocateEqual(100, ["participant-a", "participant-a"]),
    ).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "DUPLICATE_PARTICIPANT_ID",
      }),
    );
  });

  it("always allocates exactly the original total", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000_000 }),
        fc.uniqueArray(fc.uuid(), {
          minLength: 1,
          maxLength: 20,
        }),
        (totalSen, participantIds) => {
          const result = allocateEqual(totalSen, participantIds);

          const allocationSum = result.allocations.reduce(
            (sum, allocation) => sum + allocation.amountSen,
            0,
          );

          expect(allocationSum).toBe(totalSen);
          expect(result.allocatedTotalSen).toBe(totalSen);
        },
      ),
    );
  });

  it("produces the same result regardless of input order", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000_000 }),
        fc.uniqueArray(fc.uuid(), {
          minLength: 1,
          maxLength: 20,
        }),
        (totalSen, participantIds) => {
          const forward = allocateEqual(totalSen, participantIds);
          const reversed = allocateEqual(
            totalSen,
            participantIds.toReversed(),
          );

          expect(reversed).toEqual(forward);
        },
      ),
    );
  });
});