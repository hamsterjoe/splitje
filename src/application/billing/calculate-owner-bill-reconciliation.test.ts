import {
    describe,
    expect,
    it,
} from "vitest";

import { calculateOwnerBillReconciliation } from "./calculate-owner-bill-reconciliation";

describe(
    "calculateOwnerBillReconciliation",
    () => {
        it("reconciles persisted owner bill items", () => {
            const result =
                calculateOwnerBillReconciliation({
                    printedTotalSen: 2_500,
                    items: [
                        {
                            id: "item-b",
                            description: "Tea",
                            quantity: 1,
                            unitPriceSen: 500,
                            manualLineTotalSen: null,
                            lineTotalSen: 500,
                            sortOrder: 1,
                            createdAt:
                                "2026-07-20T08:01:00.000Z",
                            updatedAt:
                                "2026-07-20T08:01:00.000Z",
                        },
                        {
                            id: "item-a",
                            description: "Nasi Lemak",
                            quantity: 1,
                            unitPriceSen: 2_000,
                            manualLineTotalSen: null,
                            lineTotalSen: 2_000,
                            sortOrder: 0,
                            createdAt:
                                "2026-07-20T08:00:00.000Z",
                            updatedAt:
                                "2026-07-20T08:00:00.000Z",
                        },
                    ],
                    adjustments: [],
                });

            expect(result).toMatchObject({
                printedTotalSen: 2_500,
                itemSubtotalSen: 2_500,
                adjustmentTotalSen: 0,
                calculatedTotalSen: 2_500,
                differenceSen: 0,
                isReconciled: true,
            });

            expect(
                result.items.map(
                    (item) => item.itemId,
                ),
            ).toEqual([
                "item-a",
                "item-b",
            ]);
        });

        it("reports when item totals exceed the printed total", () => {
            const result =
                calculateOwnerBillReconciliation({
                    printedTotalSen: 2_499,
                    items: [
                        {
                            id: "item-a",
                            description: "Nasi Lemak",
                            quantity: 1,
                            unitPriceSen: 2_500,
                            manualLineTotalSen: null,
                            lineTotalSen: 2_500,
                            sortOrder: 0,
                            createdAt:
                                "2026-07-20T08:00:00.000Z",
                            updatedAt:
                                "2026-07-20T08:00:00.000Z",
                        },
                    ],
                    adjustments: [],
                });

            expect(result).toMatchObject({
                calculatedTotalSen: 2_500,
                differenceSen: 1,
                isReconciled: false,
            });
        });

        it("reports when item totals are below the printed total", () => {
            const result =
                calculateOwnerBillReconciliation({
                    printedTotalSen: 2_501,
                    items: [
                        {
                            id: "item-a",
                            description: "Nasi Lemak",
                            quantity: 1,
                            unitPriceSen: 2_500,
                            manualLineTotalSen: null,
                            lineTotalSen: 2_500,
                            sortOrder: 0,
                            createdAt:
                                "2026-07-20T08:00:00.000Z",
                            updatedAt:
                                "2026-07-20T08:00:00.000Z",
                        },
                    ],
                    adjustments: [],
                });

            expect(result).toMatchObject({
                calculatedTotalSen: 2_500,
                differenceSen: -1,
                isReconciled: false,
            });
        });

        it("includes bill adjustments", () => {
            const result =
                calculateOwnerBillReconciliation({
                    printedTotalSen: 2_499,
                    items: [
                        {
                            id: "item-a",
                            description: "Nasi Lemak",
                            quantity: 1,
                            unitPriceSen: 2_500,
                            manualLineTotalSen: null,
                            lineTotalSen: 2_500,
                            sortOrder: 0,
                            createdAt:
                                "2026-07-20T08:00:00.000Z",
                            updatedAt:
                                "2026-07-20T08:00:00.000Z",
                        },
                    ],
                    adjustments: [
                        {
                            id: "adj-a",
                            type: "discount",
                            label: "No discount",
                            amountSen: 0,
                            sortOrder: 0,
                            createdAt:
                                "2026-07-20T08:00:00.000Z",
                            updatedAt:
                                "2026-07-20T08:00:00.000Z",
                        },
                    ],
                });

            expect(result).toMatchObject({
                adjustmentSubtotalSen: 0,
                calculatedTotalSen: 2_500,
                differenceSen: 1,
                isReconciled: false,
            });

            expect(result.adjustments).toHaveLength(1);
        });

        it("includes signed adjustments in the calculated total", () => {
            const result =
                calculateOwnerBillReconciliation({
                    printedTotalSen: 2_700,

                    items: [
                        {
                            id: "item-a",
                            description: "Nasi Lemak",
                            quantity: 1,
                            unitPriceSen: 2_500,
                            manualLineTotalSen: null,
                            lineTotalSen: 2_500,
                            sortOrder: 0,
                            createdAt:
                                "2026-07-20T08:00:00.000Z",
                            updatedAt:
                                "2026-07-20T08:00:00.000Z",
                        },
                    ],

                    adjustments: [
                        {
                            id: "adjustment-service",
                            type: "service_charge",
                            label: "Service charge",
                            amountSen: 250,
                            sortOrder: 0,
                            createdAt:
                                "2026-07-20T08:01:00.000Z",
                            updatedAt:
                                "2026-07-20T08:01:00.000Z",
                        },
                        {
                            id: "adjustment-discount",
                            type: "discount",
                            label: "Voucher",
                            amountSen: -50,
                            sortOrder: 1,
                            createdAt:
                                "2026-07-20T08:02:00.000Z",
                            updatedAt:
                                "2026-07-20T08:02:00.000Z",
                        },
                    ],
                });

            expect(result).toMatchObject({
                itemSubtotalSen: 2_500,
                adjustmentTotalSen: 200,
                calculatedTotalSen: 2_700,
                differenceSen: 0,
                isReconciled: true,
            });
        });
    },
);