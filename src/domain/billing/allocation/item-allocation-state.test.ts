import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { BillingDomainError } from "../errors";
import { allocateByWeight } from "./weighted-allocation";
import { calculateItemAllocationState } from "./item-allocation-state";

describe("calculateItemAllocationState", () => {
    it("marks a positive-value item with no allocations as unassigned", () => {
        const result = calculateItemAllocationState(3_000, []);

        expect(result).toEqual({
            itemTotalSen: 3_000,
            allocatedSen: 0,
            remainingSen: 3_000,
            state: "unassigned",
            allocations: [],
        });
    });

    it("marks an incompletely allocated item as partially assigned", () => {
        const result = calculateItemAllocationState(3_000, [
            {
                participantId: "participant-a",
                amountSen: 1_200,
            },
            {
                participantId: "participant-b",
                amountSen: 800,
            },
        ]);

        expect(result.allocatedSen).toBe(2_000);
        expect(result.remainingSen).toBe(1_000);
        expect(result.state).toBe("partially_assigned");
    });

    it("marks an exactly allocated item as fully assigned", () => {
        const result = calculateItemAllocationState(3_000, [
            {
                participantId: "participant-b",
                amountSen: 1_000,
            },
            {
                participantId: "participant-a",
                amountSen: 2_000,
            },
        ]);

        expect(result).toEqual({
            itemTotalSen: 3_000,
            allocatedSen: 3_000,
            remainingSen: 0,
            state: "fully_assigned",
            allocations: [
                {
                    participantId: "participant-a",
                    amountSen: 2_000,
                },
                {
                    participantId: "participant-b",
                    amountSen: 1_000,
                },
            ],
        });
    });

    it("treats a zero-value item as financially complete", () => {
        const result = calculateItemAllocationState(0, []);

        expect(result.allocatedSen).toBe(0);
        expect(result.remainingSen).toBe(0);
        expect(result.state).toBe("fully_assigned");
    });

    it("rejects allocations exceeding the item total", () => {
        expect(() =>
            calculateItemAllocationState(1_000, [
                {
                    participantId: "participant-a",
                    amountSen: 700,
                },
                {
                    participantId: "participant-b",
                    amountSen: 301,
                },
            ]),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "OVER_ALLOCATED_ITEM",
            }),
        );
    });

    it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
        "rejects invalid allocation amount: %s",
        (amountSen) => {
            expect(() =>
                calculateItemAllocationState(1_000, [
                    {
                        participantId: "participant-a",
                        amountSen,
                    },
                ]),
            ).toThrowError(
                expect.objectContaining<Partial<BillingDomainError>>({
                    code: "INVALID_ALLOCATION_AMOUNT",
                }),
            );
        },
    );

    it("rejects duplicate participant IDs", () => {
        expect(() =>
            calculateItemAllocationState(1_000, [
                {
                    participantId: "participant-a",
                    amountSen: 400,
                },
                {
                    participantId: "participant-a",
                    amountSen: 600,
                },
            ]),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "DUPLICATE_PARTICIPANT_ID",
            }),
        );
    });

    it("produces the same summary regardless of input order", () => {
        const allocations = [
            {
                participantId: "participant-c",
                amountSen: 300,
            },
            {
                participantId: "participant-a",
                amountSen: 400,
            },
            {
                participantId: "participant-b",
                amountSen: 200,
            },
        ];

        const forward = calculateItemAllocationState(
            1_000,
            allocations,
        );

        const reversed = calculateItemAllocationState(
            1_000,
            allocations.toReversed(),
        );

        expect(reversed).toEqual(forward);
    });

    it("recognises complete weighted allocations as fully assigned", () => {
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
                (itemTotalSen, weights) => {
                    const weightedResult = allocateByWeight(
                        itemTotalSen,
                        weights.map((weight, index) => ({
                            participantId: `participant-${index}`,
                            weight,
                        })),
                    );

                    const result = calculateItemAllocationState(
                        itemTotalSen,
                        weightedResult.allocations.map(
                            ({ participantId, amountSen }) => ({
                                participantId,
                                amountSen,
                            }),
                        ),
                    );

                    expect(result.allocatedSen).toBe(itemTotalSen);
                    expect(result.remainingSen).toBe(0);
                    expect(result.state).toBe("fully_assigned");
                },
            ),
        );
    });
});