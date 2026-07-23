import {
    describe,
    expect,
    it,
} from "vitest";

import { addBillRateAdjustmentInputSchema } from "./add-bill-rate-adjustment-input";

const billId =
    "9a714df0-1303-4fe8-9f9c-f0b7d5136627";

describe(
    "addBillRateAdjustmentInputSchema",
    () => {
        it("prepares a positive service-charge rate", () => {
            expect(
                addBillRateAdjustmentInputSchema.parse(
                    {
                        billId,
                        type: "service_charge",
                        label:
                            "  Service charge  ",
                        percentage: "10",
                    },
                ),
            ).toEqual({
                billId,
                type: "service_charge",
                label: "Service charge",
                calculationMethod: "rate",
                rateBasisPoints: 1_000,
                roundingMode: "half_up",
                calculationBaseMode:
                    "item_subtotal",
                appliesToAllItems: true,
                applicableItemIds: null,
            });
        });

        it("prepares the receipt SST rate", () => {
            expect(
                addBillRateAdjustmentInputSchema.parse(
                    {
                        billId,
                        type: "tax",
                        label: "SST",
                        percentage: "6",
                    },
                ),
            ).toEqual({
                billId,
                type: "tax",
                label: "SST",
                calculationMethod: "rate",
                rateBasisPoints: 600,
                roundingMode: "half_up",
                calculationBaseMode:
                    "item_subtotal",
                appliesToAllItems: true,
                applicableItemIds: null,
            });
        });

        it("stores discount rates as negative basis points", () => {
            expect(
                addBillRateAdjustmentInputSchema.parse(
                    {
                        billId,
                        type: "discount",
                        label: "Member discount",
                        percentage: "12.5",
                    },
                ),
            ).toEqual({
                billId,
                type: "discount",
                label: "Member discount",
                calculationMethod: "rate",
                rateBasisPoints: -1_250,
                roundingMode: "half_up",
                calculationBaseMode:
                    "item_subtotal",
                appliesToAllItems: true,
                applicableItemIds: null,
            });
        });

        it("rejects a zero rate", () => {
            const result =
                addBillRateAdjustmentInputSchema.safeParse(
                    {
                        billId,
                        type: "tax",
                        label: "SST",
                        percentage: "0",
                    },
                );

            expect(result.success).toBe(false);

            if (result.success) {
                throw new Error(
                    "Expected validation to fail.",
                );
            }

            expect(
                result.error.issues,
            ).toContainEqual(
                expect.objectContaining({
                    path: ["percentage"],
                    message:
                        "Enter a percentage greater than 0.",
                }),
            );
        });

        it("rejects rates above 100 percent", () => {
            const result =
                addBillRateAdjustmentInputSchema.safeParse(
                    {
                        billId,
                        type: "discount",
                        label: "Discount",
                        percentage: "100.01",
                    },
                );

            expect(result.success).toBe(false);

            if (result.success) {
                throw new Error(
                    "Expected validation to fail.",
                );
            }

            expect(
                result.error.issues,
            ).toContainEqual(
                expect.objectContaining({
                    path: ["percentage"],
                    message:
                        "Enter a percentage from 0 to 100.",
                }),
            );
        });

        it("rejects rounding as a rate adjustment", () => {
            const result =
                addBillRateAdjustmentInputSchema.safeParse(
                    {
                        billId,
                        type: "rounding",
                        label: "Rounding",
                        percentage: "0.01",
                    },
                );

            expect(result.success).toBe(false);

            if (result.success) {
                throw new Error(
                    "Expected validation to fail.",
                );
            }

            expect(
                result.error.issues.some(
                    (issue) =>
                        issue.path.join(".") ===
                        "type",
                ),
            ).toBe(true);
        });

        it("uses the type label when a custom label is blank", () => {
            expect(
                addBillRateAdjustmentInputSchema.parse(
                    {
                        billId,
                        type: "tax",
                        label: "   ",
                        percentage: "6",
                    },
                ),
            ).toMatchObject({
                type: "tax",
                label: "Tax / SST",
                rateBasisPoints: 600,
            });
        });

        it("uses the type label when the custom label is omitted", () => {
            expect(
                addBillRateAdjustmentInputSchema.parse(
                    {
                        billId,
                        type: "discount",
                        percentage: "10",
                    },
                ),
            ).toMatchObject({
                type: "discount",
                label: "Discount",
                rateBasisPoints: -1_000,
            });
        });

        it("prepares a selected-item percentage adjustment", () => {
            const itemA =
                "24e17267-c45e-47aa-ad46-87ea73e0c0ad";

            const itemB =
                "ef14c672-a698-4912-83c4-16545f64b8e2";

            expect(
                addBillRateAdjustmentInputSchema.parse(
                    {
                        billId,
                        type: "discount",
                        label:
                            "Selected item discount",
                        percentage: "10",
                        itemScope: {
                            scope:
                                "selected_items",
                            applicableItemIds: [
                                itemB,
                                itemA,
                            ],
                        },
                    },
                ),
            ).toEqual({
                billId,
                type: "discount",
                label:
                    "Selected item discount",
                calculationMethod: "rate",
                rateBasisPoints: -1_000,
                roundingMode: "half_up",
                calculationBaseMode:
                    "item_subtotal",
                appliesToAllItems: false,
                applicableItemIds: [
                    itemA,
                    itemB,
                ],
            });
        });
    },
);