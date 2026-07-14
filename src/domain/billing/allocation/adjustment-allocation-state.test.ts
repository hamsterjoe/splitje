import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { BillingDomainError } from "../errors";
import { calculateAdjustmentAllocationState } from "./adjustment-allocation-state";
import { allocateSignedByWeight } from "./signed-weighted-allocation";

describe("calculateAdjustmentAllocationState", () => {
    it("marks an unallocated positive charge as unassigned", () => {
        const result = calculateAdjustmentAllocationState(
            1_000,
            [],
        );

        expect(result).toEqual({
            adjustmentAmountSen: 1_000,
            allocatedSen: 0,
            remainingSen: 1_000,
            state: "unassigned",
            allocations: [],
        });
    });

    it("marks a partially allocated positive charge", () => {
        const result = calculateAdjustmentAllocationState(
            1_000,
            [
                {
                    participantId: "participant-a",
                    amountSen: 600,
                },
            ],
        );

        expect(result.allocatedSen).toBe(600);
        expect(result.remainingSen).toBe(400);
        expect(result.state).toBe("partially_assigned");
    });

    it("marks a partially allocated negative discount", () => {
        const result = calculateAdjustmentAllocationState(
            -1_000,
            [
                {
                    participantId: "participant-a",
                    amountSen: -600,
                },
            ],
        );

        expect(result.allocatedSen).toBe(-600);
        expect(result.remainingSen).toBe(-400);
        expect(result.state).toBe("partially_assigned");
    });

    it("marks a fully allocated negative discount", () => {
        const result = calculateAdjustmentAllocationState(
            -1_000,
            [
                {
                    participantId: "participant-b",
                    amountSen: -300,
                },
                {
                    participantId: "participant-a",
                    amountSen: -700,
                },
            ],
        );

        expect(result).toEqual({
            adjustmentAmountSen: -1_000,
            allocatedSen: -1_000,
            remainingSen: 0,
            state: "fully_assigned",
            allocations: [
                {
                    participantId: "participant-a",
                    amountSen: -700,
                },
                {
                    participantId: "participant-b",
                    amountSen: -300,
                },
            ],
        });
    });

    it("treats a zero-value adjustment as fully assigned", () => {
        const result = calculateAdjustmentAllocationState(0, []);

        expect(result.allocatedSen).toBe(0);
        expect(result.remainingSen).toBe(0);
        expect(result.state).toBe("fully_assigned");
    });

    it("rejects a negative allocation for a positive charge", () => {
        expect(() =>
            calculateAdjustmentAllocationState(1_000, [
                {
                    participantId: "participant-a",
                    amountSen: -100,
                },
            ]),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "ADJUSTMENT_ALLOCATION_SIGN_MISMATCH",
            }),
        );
    });

    it("rejects a positive allocation for a negative discount", () => {
        expect(() =>
            calculateAdjustmentAllocationState(-1_000, [
                {
                    participantId: "participant-a",
                    amountSen: 100,
                },
            ]),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "ADJUSTMENT_ALLOCATION_SIGN_MISMATCH",
            }),
        );
    });

    it("rejects allocations exceeding a positive adjustment", () => {
        expect(() =>
            calculateAdjustmentAllocationState(1_000, [
                {
                    participantId: "participant-a",
                    amountSen: 600,
                },
                {
                    participantId: "participant-b",
                    amountSen: 401,
                },
            ]),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "OVER_ALLOCATED_ADJUSTMENT",
            }),
        );
    });

    it("rejects allocations exceeding a negative adjustment", () => {
        expect(() =>
            calculateAdjustmentAllocationState(-1_000, [
                {
                    participantId: "participant-a",
                    amountSen: -600,
                },
                {
                    participantId: "participant-b",
                    amountSen: -401,
                },
            ]),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "OVER_ALLOCATED_ADJUSTMENT",
            }),
        );
    });

    it.each([1.5, Number.NaN, Number.POSITIVE_INFINITY])(
        "rejects invalid allocation amount: %s",
        (amountSen) => {
            expect(() =>
                calculateAdjustmentAllocationState(1_000, [
                    {
                        participantId: "participant-a",
                        amountSen,
                    },
                ]),
            ).toThrowError(
                expect.objectContaining<Partial<BillingDomainError>>({
                    code: "INVALID_ADJUSTMENT_ALLOCATION_AMOUNT",
                }),
            );
        },
    );

    it("rejects duplicate participant IDs", () => {
        expect(() =>
            calculateAdjustmentAllocationState(1_000, [
                {
                    participantId: "participant-a",
                    amountSen: 500,
                },
                {
                    participantId: "participant-a",
                    amountSen: 500,
                },
            ]),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "DUPLICATE_PARTICIPANT_ID",
            }),
        );
    });

    it("recognises signed weighted results as fully assigned", () => {
        fc.assert(
            fc.property(
                fc.integer({
                    min: -1_000_000_000,
                    max: 1_000_000_000,
                }),
                fc.array(
                    fc.integer({
                        min: 1,
                        max: 1_000_000,
                    }),
                    {
                        minLength: 1,
                        maxLength: 20,
                    },
                ),
                (adjustmentAmountSen, weights) => {
                    const weightedResult = allocateSignedByWeight(
                        adjustmentAmountSen,
                        weights.map((weight, index) => ({
                            participantId: `participant-${index}`,
                            weight,
                        })),
                    );

                    const result = calculateAdjustmentAllocationState(
                        adjustmentAmountSen,
                        weightedResult.allocations.map(
                            ({ participantId, amountSen }) => ({
                                participantId,
                                amountSen,
                            }),
                        ),
                    );

                    expect(result.allocatedSen).toBe(
                        adjustmentAmountSen,
                    );
                    expect(result.remainingSen).toBe(0);
                    expect(result.state).toBe("fully_assigned");
                },
            ),
        );
    });
});