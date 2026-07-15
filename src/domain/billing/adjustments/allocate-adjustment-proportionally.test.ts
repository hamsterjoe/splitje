import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { BillingDomainError } from "../errors";
import { allocateAdjustmentProportionally } from "./allocate-adjustment-proportionally";

describe("allocateAdjustmentProportionally", () => {
    it("allocates a positive tax by item subtotal", () => {
        const result = allocateAdjustmentProportionally(
            300,
            [
                {
                    participantId: "participant-b",
                    itemSubtotalSen: 2_000,
                },
                {
                    participantId: "participant-a",
                    itemSubtotalSen: 3_000,
                },
            ],
        );

        expect(result).toEqual({
            adjustmentAmountSen: 300,
            eligibleSubtotalSen: 5_000,
            allocatedTotalSen: 300,
            allocations: [
                {
                    participantId: "participant-a",
                    itemSubtotalSen: 3_000,
                    baseAmountSen: 180,
                    remainderAmountSen: 0,
                    amountSen: 180,
                },
                {
                    participantId: "participant-b",
                    itemSubtotalSen: 2_000,
                    baseAmountSen: 120,
                    remainderAmountSen: 0,
                    amountSen: 120,
                },
            ],
            remainderParticipantIds: [],
        });
    });

    it("allocates a negative discount by item subtotal", () => {
        const result = allocateAdjustmentProportionally(
            -500,
            [
                {
                    participantId: "participant-a",
                    itemSubtotalSen: 3_000,
                },
                {
                    participantId: "participant-b",
                    itemSubtotalSen: 2_000,
                },
            ],
        );

        expect(
            result.allocations.map(({ amountSen }) => amountSen),
        ).toEqual([-300, -200]);

        expect(result.allocatedTotalSen).toBe(-500);
    });

    it("gives zero to a participant with no eligible items", () => {
        const result = allocateAdjustmentProportionally(
            300,
            [
                {
                    participantId: "participant-a",
                    itemSubtotalSen: 3_000,
                },
                {
                    participantId: "participant-b",
                    itemSubtotalSen: 0,
                },
            ],
        );

        expect(result.allocations).toEqual([
            {
                participantId: "participant-a",
                itemSubtotalSen: 3_000,
                baseAmountSen: 300,
                remainderAmountSen: 0,
                amountSen: 300,
            },
            {
                participantId: "participant-b",
                itemSubtotalSen: 0,
                baseAmountSen: 0,
                remainderAmountSen: 0,
                amountSen: 0,
            },
        ]);
    });

    it("rejects a non-zero adjustment without a proportional base", () => {
        expect(() =>
            allocateAdjustmentProportionally(
                300,
                [
                    {
                        participantId: "participant-a",
                        itemSubtotalSen: 0,
                    },
                    {
                        participantId: "participant-b",
                        itemSubtotalSen: 0,
                    },
                ],
            ),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "NO_PROPORTIONAL_BASE",
            }),
        );
    });

    it("allows a zero adjustment when every base is zero", () => {
        const result = allocateAdjustmentProportionally(
            0,
            [
                {
                    participantId: "participant-b",
                    itemSubtotalSen: 0,
                },
                {
                    participantId: "participant-a",
                    itemSubtotalSen: 0,
                },
            ],
        );

        expect(result.eligibleSubtotalSen).toBe(0);
        expect(result.allocatedTotalSen).toBe(0);

        expect(result.allocations).toEqual([
            {
                participantId: "participant-a",
                itemSubtotalSen: 0,
                baseAmountSen: 0,
                remainderAmountSen: 0,
                amountSen: 0,
            },
            {
                participantId: "participant-b",
                itemSubtotalSen: 0,
                baseAmountSen: 0,
                remainderAmountSen: 0,
                amountSen: 0,
            },
        ]);
    });

    it("rejects a negative proportional base", () => {
        expect(() =>
            allocateAdjustmentProportionally(
                100,
                [
                    {
                        participantId: "participant-a",
                        itemSubtotalSen: -1,
                    },
                ],
            ),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "INVALID_PROPORTIONAL_BASE",
            }),
        );
    });

    it("rejects duplicate participant IDs", () => {
        expect(() =>
            allocateAdjustmentProportionally(
                100,
                [
                    {
                        participantId: "participant-a",
                        itemSubtotalSen: 500,
                    },
                    {
                        participantId: "participant-a",
                        itemSubtotalSen: 500,
                    },
                ],
            ),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "DUPLICATE_PARTICIPANT_ID",
            }),
        );
    });

    it("always allocates the exact signed adjustment", () => {
        fc.assert(
            fc.property(
                fc.integer({
                    min: -1_000_000_000,
                    max: 1_000_000_000,
                }),
                fc.array(
                    fc.integer({
                        min: 0,
                        max: 1_000_000,
                    }),
                    {
                        minLength: 1,
                        maxLength: 20,
                    },
                ),
                (adjustmentAmountSen, subtotals) => {
                    fc.pre(
                        subtotals.some(
                            (itemSubtotalSen) =>
                                itemSubtotalSen > 0,
                        ),
                    );

                    const bases = subtotals.map(
                        (itemSubtotalSen, index) => ({
                            participantId: `participant-${index}`,
                            itemSubtotalSen,
                        }),
                    );

                    const result = allocateAdjustmentProportionally(
                        adjustmentAmountSen,
                        bases,
                    );

                    const subtotalByParticipant = new Map(
                        bases.map(({ participantId, itemSubtotalSen }) => [
                            participantId,
                            itemSubtotalSen,
                        ]),
                    );

                    const allocationSum = result.allocations.reduce(
                        (sum, allocation) =>
                            sum + allocation.amountSen,
                        0,
                    );

                    expect(allocationSum).toBe(
                        adjustmentAmountSen,
                    );

                    expect(result.allocatedTotalSen).toBe(
                        adjustmentAmountSen,
                    );

                    for (const allocation of result.allocations) {
                        const participantSubtotal =
                            subtotalByParticipant.get(
                                allocation.participantId,
                            );

                        expect(participantSubtotal).toBeDefined();

                        if (participantSubtotal === 0) {
                            expect(allocation.amountSen).toBe(0);
                        }
                    }
                },
            ),
        );
    });

    it("is independent of input order", () => {
        const bases = [
            {
                participantId: "participant-c",
                itemSubtotalSen: 1_000,
            },
            {
                participantId: "participant-a",
                itemSubtotalSen: 3_000,
            },
            {
                participantId: "participant-b",
                itemSubtotalSen: 2_000,
            },
        ];

        const forward = allocateAdjustmentProportionally(
            101,
            bases,
        );

        const reversed = allocateAdjustmentProportionally(
            101,
            bases.toReversed(),
        );

        expect(reversed).toEqual(forward);
    });

    it("rejects an invalid adjustment amount", () => {
        expect(() =>
            allocateAdjustmentProportionally(
                Number.POSITIVE_INFINITY,
                [
                    {
                        participantId: "participant-a",
                        itemSubtotalSen: 1_000,
                    },
                ],
            ),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "INVALID_ADJUSTMENT_AMOUNT",
            }),
        );
    });

    it("rejects an empty proportional base list", () => {
        expect(() =>
            allocateAdjustmentProportionally(100, []),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "NO_PARTICIPANTS",
            }),
        );
    });

    it("rejects an invalid participant ID", () => {
        expect(() =>
            allocateAdjustmentProportionally(
                100,
                [
                    {
                        participantId: "   ",
                        itemSubtotalSen: 1_000,
                    },
                ],
            ),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "INVALID_PARTICIPANT_ID",
            }),
        );
    });

    it("rejects a combined base outside the safe-integer range", () => {
        expect(() =>
            allocateAdjustmentProportionally(
                100,
                [
                    {
                        participantId: "participant-a",
                        itemSubtotalSen: Number.MAX_SAFE_INTEGER,
                    },
                    {
                        participantId: "participant-b",
                        itemSubtotalSen: 1,
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