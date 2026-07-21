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

        it("rejects a blank label", () => {
            const result =
                addBillRateAdjustmentInputSchema.safeParse(
                    {
                        billId,
                        type: "tax",
                        label: "   ",
                        percentage: "6",
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
                    path: ["label"],
                    message:
                        "Enter an adjustment label.",
                }),
            );
        });
    },
);