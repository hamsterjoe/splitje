import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    removeBillAdjustment,
    type RemoveBillAdjustmentDependencies,
} from "./remove-bill-adjustment";

const billId =
    "9a714df0-1303-4fe8-9f9c-f0b7d5136627";

const adjustmentId =
    "8b2c046a-26cd-46c1-a476-e4e775839365";

function createDependencies():
    RemoveBillAdjustmentDependencies {
    return {
        removeBillAdjustmentRecord:
            vi
                .fn()
                .mockResolvedValue({
                    success: true,
                    adjustmentId,
                }),
    };
}

describe(
    "removeBillAdjustment",
    () => {
        it("removes a validated adjustment", async () => {
            const dependencies =
                createDependencies();

            const result =
                await removeBillAdjustment(
                    {
                        billId,
                        adjustmentId,
                    },
                    dependencies,
                );

            expect(result).toEqual({
                success: true,
                adjustmentId,
            });

            expect(
                dependencies
                    .removeBillAdjustmentRecord,
            ).toHaveBeenCalledWith({
                billId,
                adjustmentId,
            });
        });

        it("rejects an invalid adjustment ID", async () => {
            const dependencies =
                createDependencies();

            const result =
                await removeBillAdjustment(
                    {
                        billId,
                        adjustmentId:
                            "not-a-uuid",
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
                    .removeBillAdjustmentRecord,
            ).not.toHaveBeenCalled();
        });

        it("returns a safe persistence error", async () => {
            const dependencies =
                createDependencies();

            vi.mocked(
                dependencies
                    .removeBillAdjustmentRecord,
            ).mockResolvedValue({
                success: false,
            });

            const result =
                await removeBillAdjustment(
                    {
                        billId,
                        adjustmentId,
                    },
                    dependencies,
                );

            expect(result).toEqual({
                success: false,
                error: {
                    type:
                        "database_error",
                    code:
                        "REMOVE_BILL_ADJUSTMENT_FAILED",
                    message:
                        "Unable to remove this adjustment. Please try again.",
                },
            });
        });
    },
);