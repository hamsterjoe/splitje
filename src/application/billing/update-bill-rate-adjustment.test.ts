import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    updateBillRateAdjustment,
    type UpdateBillRateAdjustmentDependencies,
} from "./update-bill-rate-adjustment";

const billId =
    "9a714df0-1303-4fe8-9f9c-f0b7d5136627";

const adjustmentId =
    "8b2c046a-26cd-46c1-a476-e4e775839365";

const itemA =
    "24e17267-c45e-47aa-ad46-87ea73e0c0ad";

const itemB =
    "ef14c672-a698-4912-83c4-16545f64b8e2";

function createDependencies():
    UpdateBillRateAdjustmentDependencies {
    return {
        updateBillRateAdjustmentRecord:
            vi
                .fn()
                .mockResolvedValue({
                    success: true,
                    adjustmentId,
                    amountSen: 1_250,
                }),
    };
}

describe(
    "updateBillRateAdjustment",
    () => {
        it("normalizes a selected-item update", async () => {
            const dependencies =
                createDependencies();

            const result =
                await updateBillRateAdjustment(
                    {
                        billId,
                        adjustmentId,
                        label:
                            "  Weekend SST  ",
                        percentage:
                            "12.5",
                        itemScope: {
                            scope:
                                "selected_items",
                            applicableItemIds:
                                [
                                    itemB,
                                    itemA,
                                ],
                        },
                    },
                    dependencies,
                );

            expect(result).toEqual({
                success: true,
                adjustmentId,
                amountSen: 1_250,
            });

            expect(
                dependencies
                    .updateBillRateAdjustmentRecord,
            ).toHaveBeenCalledWith({
                billId,
                adjustmentId,
                label:
                    "Weekend SST",
                rateBasisPoints:
                    1_250,
                appliesToAllItems:
                    false,
                applicableItemIds: [
                    itemA,
                    itemB,
                ],
            });
        });

        it("normalizes all-item scope", async () => {
            const dependencies =
                createDependencies();

            await updateBillRateAdjustment(
                {
                    billId,
                    adjustmentId,
                    label: "SST",
                    percentage: "6",
                    itemScope: {
                        scope:
                            "all_items",
                        applicableItemIds:
                            [itemA],
                    },
                },
                dependencies,
            );

            expect(
                dependencies
                    .updateBillRateAdjustmentRecord,
            ).toHaveBeenCalledWith({
                billId,
                adjustmentId,
                label: "SST",
                rateBasisPoints: 600,
                appliesToAllItems:
                    true,
                applicableItemIds:
                    null,
            });
        });

        it("allows the database to resolve a blank label", async () => {
            const dependencies =
                createDependencies();

            await updateBillRateAdjustment(
                {
                    billId,
                    adjustmentId,
                    label: "   ",
                    percentage: "6",
                    itemScope: {
                        scope:
                            "all_items",
                    },
                },
                dependencies,
            );

            expect(
                dependencies
                    .updateBillRateAdjustmentRecord,
            ).toHaveBeenCalledWith(
                expect.objectContaining({
                    label: "",
                }),
            );
        });

        it("rejects a zero percentage", async () => {
            const dependencies =
                createDependencies();

            const result =
                await updateBillRateAdjustment(
                    {
                        billId,
                        adjustmentId,
                        label: "SST",
                        percentage: "0",
                        itemScope: {
                            scope:
                                "all_items",
                        },
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
                path: "percentage",
                message:
                    "Enter a percentage greater than 0.",
            });

            expect(
                dependencies
                    .updateBillRateAdjustmentRecord,
            ).not.toHaveBeenCalled();
        });

        it("rejects an empty selected-item scope", async () => {
            const dependencies =
                createDependencies();

            const result =
                await updateBillRateAdjustment(
                    {
                        billId,
                        adjustmentId,
                        label: "SST",
                        percentage: "6",
                        itemScope: {
                            scope:
                                "selected_items",
                            applicableItemIds:
                                [],
                        },
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
                path:
                    "itemScope.applicableItemIds",
                message:
                    "Select at least one applicable item.",
            });
        });

        it("returns a safe persistence error", async () => {
            const dependencies =
                createDependencies();

            vi.mocked(
                dependencies
                    .updateBillRateAdjustmentRecord,
            ).mockResolvedValue({
                success: false,
            });

            const result =
                await updateBillRateAdjustment(
                    {
                        billId,
                        adjustmentId,
                        label: "SST",
                        percentage: "6",
                        itemScope: {
                            scope:
                                "all_items",
                        },
                    },
                    dependencies,
                );

            expect(result).toEqual({
                success: false,
                error: {
                    type:
                        "database_error",
                    code:
                        "UPDATE_BILL_RATE_ADJUSTMENT_FAILED",
                    message:
                        "Unable to update this percentage adjustment. Please try again.",
                },
            });
        });
    },
);