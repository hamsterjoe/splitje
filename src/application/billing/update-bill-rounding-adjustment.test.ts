import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    updateBillRoundingAdjustment,
    type UpdateBillRoundingAdjustmentDependencies,
} from "./update-bill-rounding-adjustment";

const billId =
    "9a714df0-1303-4fe8-9f9c-f0b7d5136627";

const adjustmentId =
    "8b2c046a-26cd-46c1-a476-e4e775839365";

function createDependencies():
    UpdateBillRoundingAdjustmentDependencies {
    return {
        updateBillRoundingAdjustmentRecord:
            vi
                .fn()
                .mockResolvedValue({
                    success: true,
                    adjustmentId,
                }),
    };
}

describe(
    "updateBillRoundingAdjustment",
    () => {
        it("persists subtract rounding as negative sen", async () => {
            const dependencies =
                createDependencies();

            const result =
                await updateBillRoundingAdjustment(
                    {
                        billId,
                        adjustmentId,
                        direction:
                            "subtract",
                        amount: "0.02",
                    },
                    dependencies,
                );

            expect(result).toEqual({
                success: true,
                adjustmentId,
            });

            expect(
                dependencies
                    .updateBillRoundingAdjustmentRecord,
            ).toHaveBeenCalledWith({
                billId,
                adjustmentId,
                amountSen: -2,
            });
        });

        it("persists add rounding as positive sen", async () => {
            const dependencies =
                createDependencies();

            await updateBillRoundingAdjustment(
                {
                    billId,
                    adjustmentId,
                    direction: "add",
                    amount: "0.01",
                },
                dependencies,
            );

            expect(
                dependencies
                    .updateBillRoundingAdjustmentRecord,
            ).toHaveBeenCalledWith({
                billId,
                adjustmentId,
                amountSen: 1,
            });
        });

        it("rejects a zero amount", async () => {
            const dependencies =
                createDependencies();

            const result =
                await updateBillRoundingAdjustment(
                    {
                        billId,
                        adjustmentId,
                        direction:
                            "subtract",
                        amount: "0",
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
                    "Enter a rounding amount greater than zero.",
            });

            expect(
                dependencies
                    .updateBillRoundingAdjustmentRecord,
            ).not.toHaveBeenCalled();
        });

        it("rejects an invalid adjustment ID", async () => {
            const dependencies =
                createDependencies();

            const result =
                await updateBillRoundingAdjustment(
                    {
                        billId,
                        adjustmentId:
                            "not-a-uuid",
                        direction: "add",
                        amount: "0.01",
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
        });

        it("returns a safe persistence error", async () => {
            const dependencies =
                createDependencies();

            vi.mocked(
                dependencies
                    .updateBillRoundingAdjustmentRecord,
            ).mockResolvedValue({
                success: false,
            });

            const result =
                await updateBillRoundingAdjustment(
                    {
                        billId,
                        adjustmentId,
                        direction:
                            "subtract",
                        amount: "0.02",
                    },
                    dependencies,
                );

            expect(result).toEqual({
                success: false,
                error: {
                    type:
                        "database_error",
                    code:
                        "UPDATE_BILL_ROUNDING_ADJUSTMENT_FAILED",
                    message:
                        "Unable to update this rounding adjustment. Please try again.",
                },
            });
        });
    },
);