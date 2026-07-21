import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    addBillRoundingAdjustment,
    type AddBillRoundingAdjustmentDependencies,
} from "./add-bill-rounding-adjustment";

const billId =
    "9a714df0-1303-4fe8-9f9c-f0b7d5136627";

const adjustmentId =
    "8b2c046a-26cd-46c1-a476-e4e775839365";

function createDependencies():
    AddBillRoundingAdjustmentDependencies {
    return {
        addBillRoundingAdjustmentRecord:
            vi
                .fn()
                .mockResolvedValue({
                    success: true,
                    adjustmentId,
                }),
    };
}

describe(
    "addBillRoundingAdjustment",
    () => {
        it("persists negative rounding", async () => {
            const dependencies =
                createDependencies();

            const result =
                await addBillRoundingAdjustment(
                    {
                        billId,
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
                    .addBillRoundingAdjustmentRecord,
            ).toHaveBeenCalledWith({
                billId,
                type: "rounding",
                label: "Rounding",
                calculationMethod:
                    "fixed",
                amountSen: -2,
            });
        });

        it("persists positive rounding", async () => {
            const dependencies =
                createDependencies();

            await addBillRoundingAdjustment(
                {
                    billId,
                    direction: "add",
                    amount: "0.01",
                },
                dependencies,
            );

            expect(
                dependencies
                    .addBillRoundingAdjustmentRecord,
            ).toHaveBeenCalledWith(
                expect.objectContaining({
                    amountSen: 1,
                }),
            );
        });

        it("does not persist invalid input", async () => {
            const dependencies =
                createDependencies();

            const result =
                await addBillRoundingAdjustment(
                    {
                        billId,
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
                    .addBillRoundingAdjustmentRecord,
            ).not.toHaveBeenCalled();
        });

        it("returns a safe persistence error", async () => {
            const dependencies =
                createDependencies();

            vi.mocked(
                dependencies
                    .addBillRoundingAdjustmentRecord,
            ).mockResolvedValue({
                success: false,
            });

            const result =
                await addBillRoundingAdjustment(
                    {
                        billId,
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
                        "ADD_BILL_ROUNDING_ADJUSTMENT_FAILED",
                    message:
                        "Unable to add this rounding adjustment. Please try again.",
                },
            });
        });
    },
);