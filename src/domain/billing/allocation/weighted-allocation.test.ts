import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { BillingDomainError } from "../errors";
import { allocateEqual } from "./equal-allocation";
import { allocateByWeight } from "./weighted-allocation";

describe("allocateByWeight", () => {
    it("allocates using integer weights and the largest remainder", () => {
        const result = allocateByWeight(100, [
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

        expect(result.totalWeight).toBe(3);
        expect(result.allocatedTotalSen).toBe(100);
        expect(result.remainderParticipantIds).toEqual(["participant-a"]);
    });

    it("breaks equal fractional-remainder ties by participant ID", () => {
        const result = allocateByWeight(1, [
            {
                participantId: "participant-b",
                weight: 1,
            },
            {
                participantId: "participant-a",
                weight: 1,
            },
        ]);

        expect(result.allocations.map((allocation) => allocation.amountSen)).toEqual([
            1,
            0,
        ]);

        expect(result.remainderParticipantIds).toEqual(["participant-a"]);
    });

    it("rejects an empty input list", () => {
        expect(() => allocateByWeight(100, [])).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "NO_PARTICIPANTS",
            }),
        );
    });

    it("rejects duplicate participant IDs", () => {
        expect(() =>
            allocateByWeight(100, [
                {
                    participantId: "participant-a",
                    weight: 1,
                },
                {
                    participantId: "participant-a",
                    weight: 2,
                },
            ]),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "DUPLICATE_PARTICIPANT_ID",
            }),
        );
    });

    it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
        "rejects invalid weight: %s",
        (weight) => {
            expect(() =>
                allocateByWeight(100, [
                    {
                        participantId: "participant-a",
                        weight,
                    },
                ]),
            ).toThrowError(
                expect.objectContaining<Partial<BillingDomainError>>({
                    code: "INVALID_WEIGHT",
                }),
            );
        },
    );

    it("always allocates exactly the original total", () => {
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

                    const result = allocateByWeight(totalSen, inputs);

                    const allocationSum = result.allocations.reduce(
                        (sum, allocation) => sum + allocation.amountSen,
                        0,
                    );

                    expect(allocationSum).toBe(totalSen);
                    expect(result.allocatedTotalSen).toBe(totalSen);

                    for (const allocation of result.allocations) {
                        expect(Number.isSafeInteger(allocation.amountSen)).toBe(true);
                        expect(allocation.amountSen).toBeGreaterThanOrEqual(0);
                    }
                },
            ),
        );
    });

    it("produces the same result regardless of input order", () => {
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

                    const forward = allocateByWeight(totalSen, inputs);
                    const reversed = allocateByWeight(
                        totalSen,
                        inputs.toReversed(),
                    );

                    expect(reversed).toEqual(forward);
                },
            ),
        );
    });

    it("matches equal allocation when every weight is equal", () => {
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

                    const equalResult = allocateEqual(totalSen, participantIds);

                    const weightedResult = allocateByWeight(
                        totalSen,
                        participantIds.map((participantId) => ({
                            participantId,
                            weight: 1,
                        })),
                    );

                    expect(
                        weightedResult.allocations.map((allocation) => ({
                            participantId: allocation.participantId,
                            amountSen: allocation.amountSen,
                        })),
                    ).toEqual(
                        equalResult.allocations.map((allocation) => ({
                            participantId: allocation.participantId,
                            amountSen: allocation.amountSen,
                        })),
                    );
                },
            ),
        );
    });
});