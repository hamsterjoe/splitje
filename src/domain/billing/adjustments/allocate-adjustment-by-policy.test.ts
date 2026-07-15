import { describe, expect, it } from "vitest";

import { BillingDomainError } from "../errors";
import { allocateAdjustmentByPolicy } from "./allocate-adjustment-by-policy";

describe("allocateAdjustmentByPolicy", () => {
  it("allocates an adjustment proportionally", () => {
    const result = allocateAdjustmentByPolicy(
      300,
      {
        method: "proportional",
        bases: [
          {
            participantId: "participant-b",
            itemSubtotalSen: 2_000,
          },
          {
            participantId: "participant-a",
            itemSubtotalSen: 3_000,
          },
        ],
      },
    );

    expect(result).toEqual({
      method: "proportional",
      adjustmentAmountSen: 300,
      allocatedTotalSen: 300,
      remainingSen: 0,
      state: "fully_assigned",
      allocations: [
        {
          participantId: "participant-a",
          amountSen: 180,
        },
        {
          participantId: "participant-b",
          amountSen: 120,
        },
      ],
      remainderParticipantIds: [],
    });
  });

  it("splits a positive adjustment equally", () => {
    const result = allocateAdjustmentByPolicy(
      101,
      {
        method: "equal",
        participantIds: [
          "participant-b",
          "participant-a",
        ],
      },
    );

    expect(result.allocations).toEqual([
      {
        participantId: "participant-a",
        amountSen: 51,
      },
      {
        participantId: "participant-b",
        amountSen: 50,
      },
    ]);

    expect(result.remainderParticipantIds).toEqual([
      "participant-a",
    ]);

    expect(result.state).toBe("fully_assigned");
  });

  it("splits a negative discount equally", () => {
    const result = allocateAdjustmentByPolicy(
      -101,
      {
        method: "equal",
        participantIds: [
          "participant-b",
          "participant-a",
        ],
      },
    );

    expect(result.allocations).toEqual([
      {
        participantId: "participant-a",
        amountSen: -51,
      },
      {
        participantId: "participant-b",
        amountSen: -50,
      },
    ]);

    expect(result.allocatedTotalSen).toBe(-101);
    expect(result.remainingSen).toBe(0);
  });

  it("splits equally only among selected participants", () => {
    const result = allocateAdjustmentByPolicy(
      100,
      {
        method: "equal",
        participantIds: [
          "participant-c",
          "participant-a",
        ],
      },
    );

    expect(result.allocations).toEqual([
      {
        participantId: "participant-a",
        amountSen: 50,
      },
      {
        participantId: "participant-c",
        amountSen: 50,
      },
    ]);
  });

  it("assigns an entire adjustment to 1 participant", () => {
    const result = allocateAdjustmentByPolicy(
      -500,
      {
        method: "single",
        participantId: "participant-a",
      },
    );

    expect(result).toEqual({
      method: "single",
      adjustmentAmountSen: -500,
      allocatedTotalSen: -500,
      remainingSen: 0,
      state: "fully_assigned",
      allocations: [
        {
          participantId: "participant-a",
          amountSen: -500,
        },
      ],
      remainderParticipantIds: [],
    });
  });

  it("allows a custom allocation to remain partial", () => {
    const result = allocateAdjustmentByPolicy(
      1_000,
      {
        method: "custom",
        allocations: [
          {
            participantId: "participant-b",
            amountSen: 200,
          },
          {
            participantId: "participant-a",
            amountSen: 300,
          },
        ],
      },
    );

    expect(result).toEqual({
      method: "custom",
      adjustmentAmountSen: 1_000,
      allocatedTotalSen: 500,
      remainingSen: 500,
      state: "partially_assigned",
      allocations: [
        {
          participantId: "participant-a",
          amountSen: 300,
        },
        {
          participantId: "participant-b",
          amountSen: 200,
        },
      ],
      remainderParticipantIds: [],
    });
  });

  it("rejects a custom allocation with the wrong sign", () => {
    expect(() =>
      allocateAdjustmentByPolicy(
        -1_000,
        {
          method: "custom",
          allocations: [
            {
              participantId: "participant-a",
              amountSen: 500,
            },
          ],
        },
      ),
    ).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "ADJUSTMENT_ALLOCATION_SIGN_MISMATCH",
      }),
    );
  });

  it("is independent of selected-participant order", () => {
    const forward = allocateAdjustmentByPolicy(
      101,
      {
        method: "equal",
        participantIds: [
          "participant-c",
          "participant-a",
          "participant-b",
        ],
      },
    );

    const reversed = allocateAdjustmentByPolicy(
      101,
      {
        method: "equal",
        participantIds: [
          "participant-b",
          "participant-a",
          "participant-c",
        ],
      },
    );

    expect(reversed).toEqual(forward);
  });
});