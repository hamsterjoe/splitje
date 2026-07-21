import {
    describe,
    expect,
    it,
} from "vitest";

import { addBillRoundingAdjustmentInputSchema } from "./add-bill-rounding-adjustment-input";

const billId =
    "9a714df0-1303-4fe8-9f9c-f0b7d5136627";

describe(
    "addBillRoundingAdjustmentInputSchema",
    () => {
        it("prepares a negative rounding adjustment", () => {
            expect(
                addBillRoundingAdjustmentInputSchema.parse(
                    {
                        billId,
                        direction:
                            "subtract",
                        amount: "0.02",
                    },
                ),
            ).toEqual({
                billId,
                type: "rounding",
                label: "Rounding",
                calculationMethod:
                    "fixed",
                amountSen: -2,
            });
        });

        it("prepares a positive rounding adjustment", () => {
            expect(
                addBillRoundingAdjustmentInputSchema.parse(
                    {
                        billId,
                        direction: "add",
                        amount: "0.01",
                    },
                ),
            ).toEqual({
                billId,
                type: "rounding",
                label: "Rounding",
                calculationMethod:
                    "fixed",
                amountSen: 1,
            });
        });

        it("parses an exact two-decimal amount", () => {
            expect(
                addBillRoundingAdjustmentInputSchema.parse(
                    {
                        billId,
                        direction:
                            "subtract",
                        amount: "  1.25  ",
                    },
                ),
            ).toEqual({
                billId,
                type: "rounding",
                label: "Rounding",
                calculationMethod:
                    "fixed",
                amountSen: -125,
            });
        });

        it("rejects a zero amount", () => {
            const result =
                addBillRoundingAdjustmentInputSchema.safeParse(
                    {
                        billId,
                        direction:
                            "subtract",
                        amount: "0",
                    },
                );

            expect(result.success).toBe(
                false,
            );

            if (result.success) {
                throw new Error(
                    "Expected validation to fail.",
                );
            }

            expect(
                result.error.issues,
            ).toContainEqual(
                expect.objectContaining({
                    path: ["amount"],
                    message:
                        "Enter a rounding amount greater than zero.",
                }),
            );
        });

        it("rejects an invalid direction", () => {
            const result =
                addBillRoundingAdjustmentInputSchema.safeParse(
                    {
                        billId,
                        direction:
                            "sideways",
                        amount: "0.02",
                    },
                );

            expect(result.success).toBe(
                false,
            );

            if (result.success) {
                throw new Error(
                    "Expected validation to fail.",
                );
            }

            expect(
                result.error.issues.some(
                    (issue) =>
                        issue.path.join(
                            ".",
                        ) ===
                        "direction",
                ),
            ).toBe(true);
        });

        it("rejects a manually signed amount", () => {
            const result =
                addBillRoundingAdjustmentInputSchema.safeParse(
                    {
                        billId,
                        direction:
                            "subtract",
                        amount: "-0.02",
                    },
                );

            expect(result.success).toBe(
                false,
            );

            if (result.success) {
                throw new Error(
                    "Expected validation to fail.",
                );
            }

            expect(
                result.error.issues.some(
                    (issue) =>
                        issue.path.join(
                            ".",
                        ) ===
                        "amount",
                ),
            ).toBe(true);
        });

        it("rejects more than two decimal places", () => {
            const result =
                addBillRoundingAdjustmentInputSchema.safeParse(
                    {
                        billId,
                        direction: "add",
                        amount: "0.001",
                    },
                );

            expect(result.success).toBe(
                false,
            );

            if (result.success) {
                throw new Error(
                    "Expected validation to fail.",
                );
            }

            expect(
                result.error.issues,
            ).toContainEqual(
                expect.objectContaining({
                    path: ["amount"],
                    message:
                        "Enter an amount with no more than 2 decimal places.",
                }),
            );
        });

        it("rejects a blank amount", () => {
            const result =
                addBillRoundingAdjustmentInputSchema.safeParse(
                    {
                        billId,
                        direction: "add",
                        amount: "   ",
                    },
                );

            expect(result.success).toBe(
                false,
            );

            if (result.success) {
                throw new Error(
                    "Expected validation to fail.",
                );
            }

            expect(
                result.error.issues.some(
                    (issue) =>
                        issue.path.join(
                            ".",
                        ) ===
                        "amount",
                ),
            ).toBe(true);
        });

        it("rejects an invalid bill ID", () => {
            const result =
                addBillRoundingAdjustmentInputSchema.safeParse(
                    {
                        billId:
                            "not-a-valid-uuid",
                        direction:
                            "subtract",
                        amount: "0.02",
                    },
                );

            expect(result.success).toBe(
                false,
            );

            if (result.success) {
                throw new Error(
                    "Expected validation to fail.",
                );
            }

            expect(
                result.error.issues,
            ).toContainEqual(
                expect.objectContaining({
                    path: ["billId"],
                    message:
                        "Bill ID must be a valid UUID.",
                }),
            );
        });
    },
);