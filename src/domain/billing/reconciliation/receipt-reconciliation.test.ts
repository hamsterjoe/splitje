import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { BillingDomainError } from "../errors";
import { reconcileReceipt } from "./receipt-reconciliation";

describe("reconcileReceipt", () => {
    it("reconciles items and signed adjustments to the printed total", () => {
        const result = reconcileReceipt(
            11_100,
            [
                {
                    itemId: "item-b",
                    lineTotalSen: 4_000,
                },
                {
                    itemId: "item-a",
                    lineTotalSen: 6_000,
                },
            ],
            [
                {
                    adjustmentId: "adjustment-tax",
                    type: "tax",
                    amountSen: 600,
                },
                {
                    adjustmentId: "adjustment-discount",
                    type: "discount",
                    amountSen: -500,
                },
                {
                    adjustmentId: "adjustment-service",
                    type: "service_charge",
                    amountSen: 1_000,
                },
            ],
        );

        expect(result).toEqual({
            printedTotalSen: 11_100,
            itemSubtotalSen: 10_000,
            adjustmentTotalSen: 1_100,
            calculatedTotalSen: 11_100,
            differenceSen: 0,
            isReconciled: true,
            items: [
                {
                    itemId: "item-a",
                    lineTotalSen: 6_000,
                },
                {
                    itemId: "item-b",
                    lineTotalSen: 4_000,
                },
            ],
            adjustments: [
                {
                    adjustmentId: "adjustment-discount",
                    type: "discount",
                    amountSen: -500,
                },
                {
                    adjustmentId: "adjustment-service",
                    type: "service_charge",
                    amountSen: 1_000,
                },
                {
                    adjustmentId: "adjustment-tax",
                    type: "tax",
                    amountSen: 600,
                },
            ],
        });
    });

    it("returns a positive difference when calculated total is higher", () => {
        const result = reconcileReceipt(
            999,
            [
                {
                    itemId: "item-a",
                    lineTotalSen: 1_000,
                },
            ],
            [],
        );

        expect(result.calculatedTotalSen).toBe(1_000);
        expect(result.differenceSen).toBe(1);
        expect(result.isReconciled).toBe(false);
    });

    it("returns a negative difference when calculated total is lower", () => {
        const result = reconcileReceipt(
            1_001,
            [
                {
                    itemId: "item-a",
                    lineTotalSen: 1_000,
                },
            ],
            [],
        );

        expect(result.calculatedTotalSen).toBe(1_000);
        expect(result.differenceSen).toBe(-1);
        expect(result.isReconciled).toBe(false);
    });

    it("supports an empty zero-value bill", () => {
        const result = reconcileReceipt(0, [], []);

        expect(result.itemSubtotalSen).toBe(0);
        expect(result.adjustmentTotalSen).toBe(0);
        expect(result.calculatedTotalSen).toBe(0);
        expect(result.differenceSen).toBe(0);
        expect(result.isReconciled).toBe(true);
    });

    it("rejects a negative item total", () => {
        expect(() =>
            reconcileReceipt(
                1_000,
                [
                    {
                        itemId: "item-a",
                        lineTotalSen: -1,
                    },
                ],
                [],
            ),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "INVALID_ITEM_TOTAL",
            }),
        );
    });

    it.each([1.5, Number.NaN, Number.POSITIVE_INFINITY])(
        "rejects invalid adjustment amount: %s",
        (amountSen) => {
            expect(() =>
                reconcileReceipt(
                    1_000,
                    [
                        {
                            itemId: "item-a",
                            lineTotalSen: 1_000,
                        },
                    ],
                    [
                        {
                            adjustmentId: "adjustment-a",
                            type: "rounding",
                            amountSen,
                        },
                    ],
                ),
            ).toThrowError(
                expect.objectContaining<Partial<BillingDomainError>>({
                    code: "INVALID_ADJUSTMENT_AMOUNT",
                }),
            );
        },
    );

    it("rejects duplicate item IDs", () => {
        expect(() =>
            reconcileReceipt(
                2_000,
                [
                    {
                        itemId: "item-a",
                        lineTotalSen: 1_000,
                    },
                    {
                        itemId: "item-a",
                        lineTotalSen: 1_000,
                    },
                ],
                [],
            ),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "DUPLICATE_ITEM_ID",
            }),
        );
    });

    it("rejects duplicate adjustment IDs", () => {
        expect(() =>
            reconcileReceipt(
                1_000,
                [
                    {
                        itemId: "item-a",
                        lineTotalSen: 1_000,
                    },
                ],
                [
                    {
                        adjustmentId: "adjustment-a",
                        type: "tax",
                        amountSen: 100,
                    },
                    {
                        adjustmentId: "adjustment-a",
                        type: "discount",
                        amountSen: -100,
                    },
                ],
            ),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "DUPLICATE_ADJUSTMENT_ID",
            }),
        );
    });

    it("rejects an adjustment that makes the total negative", () => {
        expect(() =>
            reconcileReceipt(
                0,
                [
                    {
                        itemId: "item-a",
                        lineTotalSen: 1_000,
                    },
                ],
                [
                    {
                        adjustmentId: "adjustment-refund",
                        type: "discount",
                        amountSen: -1_001,
                    },
                ],
            ),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "NEGATIVE_CALCULATED_TOTAL",
            }),
        );
    });

    it("rejects arithmetic outside the safe integer range", () => {
        expect(() =>
            reconcileReceipt(
                0,
                [
                    {
                        itemId: "item-a",
                        lineTotalSen: Number.MAX_SAFE_INTEGER,
                    },
                    {
                        itemId: "item-b",
                        lineTotalSen: 1,
                    },
                ],
                [],
            ),
        ).toThrowError(
            expect.objectContaining<Partial<BillingDomainError>>({
                code: "UNSAFE_CALCULATION",
            }),
        );
    });

    it("reconciles generated valid bills exactly", () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.integer({
                        min: 0,
                        max: 1_000_000,
                    }),
                    {
                        maxLength: 20,
                    },
                ),
                fc.array(
                    fc.integer({
                        min: -100_000,
                        max: 100_000,
                    }),
                    {
                        maxLength: 10,
                    },
                ),
                (itemTotals, adjustmentAmounts) => {
                    const itemSubtotalSen = itemTotals.reduce(
                        (sum, amountSen) => sum + amountSen,
                        0,
                    );

                    const adjustmentTotalSen = adjustmentAmounts.reduce(
                        (sum, amountSen) => sum + amountSen,
                        0,
                    );

                    const calculatedTotalSen =
                        itemSubtotalSen + adjustmentTotalSen;

                    fc.pre(calculatedTotalSen >= 0);

                    const result = reconcileReceipt(
                        calculatedTotalSen,
                        itemTotals.map((lineTotalSen, index) => ({
                            itemId: `item-${index}`,
                            lineTotalSen,
                        })),
                        adjustmentAmounts.map((amountSen, index) => ({
                            adjustmentId: `adjustment-${index}`,
                            type: "other",
                            amountSen,
                        })),
                    );

                    expect(result.calculatedTotalSen).toBe(
                        calculatedTotalSen,
                    );
                    expect(result.differenceSen).toBe(0);
                    expect(result.isReconciled).toBe(true);
                },
            ),
        );
    });
});