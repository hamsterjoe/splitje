import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { BillingDomainError } from "../errors";
import { allocateSignedByWeight } from "./signed-weighted-allocation";
import { allocateByWeight } from "./weighted-allocation";

describe("allocateSignedByWeight", () => {
    it("allocates a positive adjustment proportionally", () => {
        const result = allocateSignedByWeight(100, [
            {
                participantId: "participant-b",
                weight: 1,
            },
            {
                participantId: "participant-a",
                weight: 2,
            },
        ]);

        expect(result.allocations).toEqual([
            {
                participantId: "participant-a",
                weight: 2,
                baseAmountSen: 66,
                remainderAmountSen: 1,
                amountSen: 67,
            },
            {
                participantId: "participant-b",
                weight: 1,
                baseAmountSen: 33,
                remainderAmountSen: 0,
                amountSen: 33,
            },
        ]);

        expect(result.allocatedTotalSen).toBe(100);
    });

    it("allocates a negative discount proportionally", () => {
        const result = allocateSignedByWeight(-100, [
            {
                participantId: "participant-b",
                weight: 1,
            },
            {
                participantId: "participant-a",
                weight: 2,
            },
        ]);

        expect(result.allocations).toEqual([
            {
                participantId: "participant-a",
                weight: 2,
                baseAmountSen: -66,
                remainderAmountSen: -1,
                amountSen: -67,
            },
            {
                participantId: "participant-b",
                weight: 1,
                baseAmountSen: -33,
                remainderAmountSen: 0,
                amountSen: -33,
            },
        ]);

        expect(result.allocatedTotalSen).toBe(-100);
        expect(result.remainderParticipantIds).toEqual([
            "participant-a",
        ]);
    });

    it("uses canonical tie-breaking for a negative remainder", () => {
        const result = allocateSignedByWeight(-1, [
            {
                participantId: "participant-b",
                weight: 1,
            },
            {
                participantId: "participant-a",
                weight: 1,
            },
        ]);

        expect(result.allocations.map(({ amountSen }) => amountSen)).toEqual([
            -1,
            0,
        ]);

        expect(result.remainderParticipantIds).toEqual([
            "participant-a",
        ]);
    });

    it("handles a zero-value adjustment", () => {
        const result = allocateSignedByWeight(0, [
            {
                participantId: "participant-a",
                weight: 2,
            },
            {
                participantId: "participant-b",
                weight: 1,
            },
        ]);

        expect(result.allocations.map(({ amountSen }) => amountSen)).toEqual([
            0,
            0,
        ]);

        expect(result.allocatedTotalSen).toBe(0);
        expect(result.remainderParticipantIds).toEqual([]);
    });

    it.each([1.5, Number.NaN, Number.POSITIVE_INFINITY])(
        "rejects invalid signed amount: %s",
        (totalSen) => {
            expect(() =>
                allocateSignedByWeight(totalSen, [
                    {
                        participantId: "participant-a",
                        weight: 1,
                    },
                ]),
            ).toThrowError(
                expect.objectContaining<Partial<BillingDomainError>>({
                    code: "INVALID_ADJUSTMENT_AMOUNT",
                }),
            );
        },
    );

    it("matches the unsigned allocator for non-negative totals", () => {
        fc.assert(
            fc.property(
                fc.integer({
                    min: 0,
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
                (totalSen, weights) => {
                    const inputs = weights.map((weight, index) => ({
                        participantId: `participant-${index}`,
                        weight,
                    }));

                    const unsignedResult = allocateByWeight(
                        totalSen,
                        inputs,
                    );

                    const signedResult = allocateSignedByWeight(
                        totalSen,
                        inputs,
                    );

                    expect(signedResult).toEqual(unsignedResult);
                },
            ),
        );
    });

    it("always sums exactly to the signed adjustment", () => {
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
                (totalSen, weights) => {
                    const result = allocateSignedByWeight(
                        totalSen,
                        weights.map((weight, index) => ({
                            participantId: `participant-${index}`,
                            weight,
                        })),
                    );

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
});