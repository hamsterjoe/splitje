import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    updateFixedBillAdjustment,
    type UpdateFixedBillAdjustmentDependencies,
} from "./update-fixed-bill-adjustment";

const billId =
    "9a714df0-1303-4fe8-9f9c-f0b7d5136627";

const adjustmentId =
    "8b2c046a-26cd-46c1-a476-e4e775839365";

function createDependencies():
    UpdateFixedBillAdjustmentDependencies {
    return {
        updateFixedBillAdjustmentRecord:
            vi
                .fn()
                .mockResolvedValue({
                    success: true,
                    adjustmentId,
                }),
    };
}

describe(
    "updateFixedBillAdjustment",
    () => {
        it("validates and normalizes an update", async () => {
            const dependencies =
                createDependencies();

            const result =
                await updateFixedBillAdjustment(
                    {
                        billId,
                        adjustmentId,
                        label:
                            "  Weekend fee  ",
                        amount: "12.50",
                    },
                    dependencies,
                );

            expect(result).toEqual({
                success: true,
                adjustmentId,
            });

            expect(
                dependencies
                    .updateFixedBillAdjustmentRecord,
            ).toHaveBeenCalledWith({
                billId,
                adjustmentId,
                label:
                    "Weekend fee",
                amountSen: 1_250,
            });
        });

        it("allows the database to resolve a blank label", async () => {
            const dependencies =
                createDependencies();

            await updateFixedBillAdjustment(
                {
                    billId,
                    adjustmentId,
                    label: "   ",
                    amount: "10.00",
                },
                dependencies,
            );

            expect(
                dependencies
                    .updateFixedBillAdjustmentRecord,
            ).toHaveBeenCalledWith({
                billId,
                adjustmentId,
                label: "",
                amountSen: 1_000,
            });
        });

        it("rejects an invalid adjustment ID", async () => {
            const dependencies =
                createDependencies();

            const result =
                await updateFixedBillAdjustment(
                    {
                        billId,
                        adjustmentId:
                            "not-a-uuid",
                        label: "",
                        amount: "10.00",
                    },
                    dependencies,
                );

            expect(result.success).toBe(
                false,
            );

            if (
                result.success ||
                result.error.type !==
                    "validation_error"
            ) {
                throw new Error(
                    "Expected a validation error.",
                );
            }

            expect(
                result.error.issues,
            ).toContainEqual({
                path: "adjustmentId",
                message:
                    "Adjustment ID must be a valid UUID.",
            });

            expect(
                dependencies
                    .updateFixedBillAdjustmentRecord,
            ).not.toHaveBeenCalled();
        });

        it("rejects invalid monetary input", async () => {
            const dependencies =
                createDependencies();

            const result =
                await updateFixedBillAdjustment(
                    {
                        billId,
                        adjustmentId,
                        label: "",
                        amount: "3.999",
                    },
                    dependencies,
                );

            expect(result.success).toBe(
                false,
            );

            if (
                result.success ||
                result.error.type !==
                    "validation_error"
            ) {
                throw new Error(
                    "Expected a validation error.",
                );
            }

            expect(
                result.error.issues,
            ).toContainEqual({
                path: "amount",
                message:
                    "Enter an amount with no more than 2 decimal places.",
            });
        });

        it("returns a safe persistence error", async () => {
            const dependencies =
                createDependencies();

            vi.mocked(
                dependencies
                    .updateFixedBillAdjustmentRecord,
            ).mockResolvedValue({
                success: false,
            });

            const result =
                await updateFixedBillAdjustment(
                    {
                        billId,
                        adjustmentId,
                        label: "SST",
                        amount: "6.00",
                    },
                    dependencies,
                );

            expect(result).toEqual({
                success: false,
                error: {
                    type:
                        "database_error",
                    code:
                        "UPDATE_FIXED_BILL_ADJUSTMENT_FAILED",
                    message:
                        "Unable to update this adjustment. Please try again.",
                },
            });
        });
    },
);