import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { BillingDomainError } from "../errors";
import { calculateAdjustmentBases } from "./calculate-adjustment-bases";

describe("calculateAdjustmentBases", () => {
    it("uses every item when applicable item IDs are omitted", () => {
        const result = calculateAdjustmentBases({
            participantIds: [
                "participant-b",
                "participant-a",
                "participant-c",
            ],
            items: [
                {
                    itemId: "item-b",
                    lineTotalSen: 2_000,
                    allocations: [
                        {
                            participantId: "participant-b",
                            amountSen: 2_000,
                        },
                    ],
                },
                {
                    itemId: "item-a",
                    lineTotalSen: 3_000,
                    allocations: [
                        {
                            participantId: "participant-a",
                            amountSen: 3_000,
                        },
                    ],
                },
            ],
        });

        expect(result).toEqual({
            applicableItemIds: ["item-a", "item-b"],
            eligibleAllocatedSubtotalSen: 5_000,
            bases: [
                {
                    participantId: "participant-a",
                    itemSubtotalSen: 3_000,
                },
                {
                    participantId: "participant-b",
                    itemSubtotalSen: 2_000,
                },
                {
                    participantId: "participant-c",
                    itemSubtotalSen: 0,
                },
            ],
        });
    });

    it("uses only selected applicable items", () => {
        const result = calculateAdjustmentBases({
            participantIds: [
                "participant-a",
                "participant-b",
            ],
            applicableItemIds: ["item-a"],
            items: [
                {
                    itemId: "item-a",
                    lineTotalSen: 1_000,
                    allocations: [
                        {
                            participantId: "participant-a",
                            amountSen: 600,
                        },
                        {
                            participantId: "participant-b",
                            amountSen: 400,
                        },
                    ],
                },
                {
                    itemId: "item-b",
                    lineTotalSen: 2_000,
                    allocations: [
                        {
                            participantId: "participant-b",
                            amountSen: 2_000,
                        },
                    ],
                },
            ],
        });

        expect(result.eligibleAllocatedSubtotalSen).toBe(
            1_000,
        );

        expect(result.bases).toEqual([
            {
                participantId: "participant-a",
                itemSubtotalSen: 600,
            },
            {
                participantId: "participant-b",
                itemSubtotalSen: 400,
            },
        ]);
    });

    it("excludes the unassigned portion of an eligible item", () => {
        const result = calculateAdjustmentBases({
            participantIds: ["participant-a"],
            items: [
                {
                    itemId: "item-a",
                    lineTotalSen: 1_000,
                    allocations: [
                        {
                            participantId: "participant-a",
                            amountSen: 600,
                        },
                    ],
                },
            ],
        });

        expect(result.eligibleAllocatedSubtotalSen).toBe(600);

        expect(result.bases[0]).toEqual({
            participantId: "participant-a",
            itemSubtotalSen: 600,
        });
    });

    it("rejects an explicit empty item selection", () => {
        expect(() =>
            calculateAdjustmentBases({
                participantIds: ["participant-a"],
                applicableItemIds: [],
                items: [
                    {
                        itemId: "item-a",
                        lineTotalSen: 1_000,
                        allocations: [],
                    },
                ],
            }),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "NO_ELIGIBLE_ITEMS",
            }),
        );
    });

    it("rejects an unknown applicable item", () => {
        expect(() =>
            calculateAdjustmentBases({
                participantIds: ["participant-a"],
                applicableItemIds: ["item-unknown"],
                items: [
                    {
                        itemId: "item-a",
                        lineTotalSen: 1_000,
                        allocations: [],
                    },
                ],
            }),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "UNKNOWN_ITEM_ID",
            }),
        );
    });

    it("rejects duplicate applicable item IDs", () => {
        expect(() =>
            calculateAdjustmentBases({
                participantIds: ["participant-a"],
                applicableItemIds: ["item-a", "item-a"],
                items: [
                    {
                        itemId: "item-a",
                        lineTotalSen: 1_000,
                        allocations: [],
                    },
                ],
            }),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "DUPLICATE_ITEM_ID",
            }),
        );
    });

    it("rejects an allocation for an unknown participant", () => {
        expect(() =>
            calculateAdjustmentBases({
                participantIds: ["participant-a"],
                items: [
                    {
                        itemId: "item-a",
                        lineTotalSen: 1_000,
                        allocations: [
                            {
                                participantId: "participant-unknown",
                                amountSen: 1_000,
                            },
                        ],
                    },
                ],
            }),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "UNKNOWN_PARTICIPANT_ID",
            }),
        );
    });

    it("preserves the total of generated assigned items", () => {
        fc.assert(
            fc.property(
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
                (amounts) => {
                    const participantIds = amounts.map(
                        (_, index) => `participant-${index}`,
                    );

                    const result = calculateAdjustmentBases({
                        participantIds,
                        items: amounts.map((amountSen, index) => ({
                            itemId: `item-${index}`,
                            lineTotalSen: amountSen,
                            allocations: [
                                {
                                    participantId: `participant-${index}`,
                                    amountSen,
                                },
                            ],
                        })),
                    });

                    const expectedTotal = amounts.reduce(
                        (sum, amountSen) => sum + amountSen,
                        0,
                    );

                    expect(
                        result.eligibleAllocatedSubtotalSen,
                    ).toBe(expectedTotal);

                    expect(
                        result.bases.reduce(
                            (sum, base) =>
                                sum + base.itemSubtotalSen,
                            0,
                        ),
                    ).toBe(expectedTotal);
                },
            ),
        );
    });

    it("rejects an empty participant list", () => {
        expect(() =>
            calculateAdjustmentBases({
                participantIds: [],
                items: [],
            }),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "NO_PARTICIPANTS",
            }),
        );
    });

    it("rejects duplicate participant IDs", () => {
        expect(() =>
            calculateAdjustmentBases({
                participantIds: [
                    "participant-a",
                    "participant-a",
                ],
                items: [],
            }),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "DUPLICATE_PARTICIPANT_ID",
            }),
        );
    });

    it("rejects an invalid bill item ID", () => {
        expect(() =>
            calculateAdjustmentBases({
                participantIds: ["participant-a"],
                items: [
                    {
                        itemId: "   ",
                        lineTotalSen: 100,
                        allocations: [],
                    },
                ],
            }),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "INVALID_ITEM_ID",
            }),
        );
    });

    it("rejects duplicate bill item IDs", () => {
        expect(() =>
            calculateAdjustmentBases({
                participantIds: ["participant-a"],
                items: [
                    {
                        itemId: "item-a",
                        lineTotalSen: 100,
                        allocations: [],
                    },
                    {
                        itemId: "item-a",
                        lineTotalSen: 200,
                        allocations: [],
                    },
                ],
            }),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "DUPLICATE_ITEM_ID",
            }),
        );
    });

    it("rejects invalid item allocation data", () => {
        expect(() =>
            calculateAdjustmentBases({
                participantIds: ["participant-a"],
                items: [
                    {
                        itemId: "item-a",
                        lineTotalSen: 100,
                        allocations: [
                            {
                                participantId: "participant-a",
                                amountSen: -1,
                            },
                        ],
                    },
                ],
            }),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "INVALID_ALLOCATION_AMOUNT",
            }),
        );
    });

    it("rejects an omitted all-items scope when the bill has no items", () => {
        expect(() =>
            calculateAdjustmentBases({
                participantIds: ["participant-a"],
                items: [],
            }),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "NO_ELIGIBLE_ITEMS",
            }),
        );
    });

    it("rejects eligible-base arithmetic outside the safe range", () => {
        expect(() =>
            calculateAdjustmentBases({
                participantIds: ["participant-a"],
                items: [
                    {
                        itemId: "item-a",
                        lineTotalSen: Number.MAX_SAFE_INTEGER,
                        allocations: [
                            {
                                participantId: "participant-a",
                                amountSen: Number.MAX_SAFE_INTEGER,
                            },
                        ],
                    },
                    {
                        itemId: "item-b",
                        lineTotalSen: 1,
                        allocations: [
                            {
                                participantId: "participant-a",
                                amountSen: 1,
                            },
                        ],
                    },
                ],
            }),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "UNSAFE_CALCULATION",
            }),
        );
    });

    it("rejects an invalid bill participant ID", () => {
        expect(() =>
            calculateAdjustmentBases({
                participantIds: ["participant-a", "   "],
                items: [],
            }),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "INVALID_PARTICIPANT_ID",
            }),
        );
    });

    it("rejects an invalid applicable item ID", () => {
        expect(() =>
            calculateAdjustmentBases({
                participantIds: ["participant-a"],
                applicableItemIds: ["   "],
                items: [
                    {
                        itemId: "item-a",
                        lineTotalSen: 100,
                        allocations: [],
                    },
                ],
            }),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "INVALID_ITEM_ID",
            }),
        );
    });
});