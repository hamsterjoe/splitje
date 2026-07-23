import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    addBillRateAdjustment,
    type AddBillRateAdjustmentDependencies,
} from "./add-bill-rate-adjustment";

const billId =
    "9a714df0-1303-4fe8-9f9c-f0b7d5136627";

const adjustmentId =
    "8b2c046a-26cd-46c1-a476-e4e775839365";

function createDependencies():
    AddBillRateAdjustmentDependencies {
    return {
        addBillRateAdjustmentRecord: vi
            .fn()
            .mockResolvedValue({
                success: true,
                adjustmentId,
                amountSen: 1_032,
            }),
    };
}

describe("addBillRateAdjustment", () => {
    it("persists a positive SST rate", async () => {
        const dependencies =
            createDependencies();

        const result =
            await addBillRateAdjustment(
                {
                    billId,
                    type: "tax",
                    label: "  SST  ",
                    percentage: "6",
                },
                dependencies,
            );

        expect(result).toEqual({
            success: true,
            adjustmentId,
            amountSen: 1_032,
        });

        expect(
            dependencies
                .addBillRateAdjustmentRecord,
        ).toHaveBeenCalledWith({
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

    it("persists discounts as negative rates", async () => {
        const dependencies =
            createDependencies();

        await addBillRateAdjustment(
            {
                billId,
                type: "discount",
                label: "Member discount",
                percentage: "12.5",
            },
            dependencies,
        );

        expect(
            dependencies
                .addBillRateAdjustmentRecord,
        ).toHaveBeenCalledWith(
            expect.objectContaining({
                rateBasisPoints: -1_250,
            }),
        );
    });

    it("returns validation errors", async () => {
        const dependencies =
            createDependencies();

        const result =
            await addBillRateAdjustment(
                {
                    billId,
                    type: "tax",
                    label: "SST",
                    percentage: "0",
                },
                dependencies,
            );

        expect(result.success).toBe(false);

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
                .addBillRateAdjustmentRecord,
        ).not.toHaveBeenCalled();
    });

    it("returns a safe persistence error", async () => {
        const dependencies =
            createDependencies();

        vi.mocked(
            dependencies
                .addBillRateAdjustmentRecord,
        ).mockResolvedValue({
            success: false,
        });

        const result =
            await addBillRateAdjustment(
                {
                    billId,
                    type: "tax",
                    label: "SST",
                    percentage: "6",
                },
                dependencies,
            );

        expect(result).toEqual({
            success: false,
            error: {
                type: "database_error",
                code:
                    "ADD_BILL_RATE_ADJUSTMENT_FAILED",
                message:
                    "Unable to add this percentage adjustment. Please try again.",
            },
        });
    });

    it("uses the type default for a blank label", async () => {
        const dependencies =
            createDependencies();

        const result =
            await addBillRateAdjustment(
                {
                    billId,
                    type: "tax",
                    label: "   ",
                    percentage: "6",
                },
                dependencies,
            );

        expect(result.success).toBe(true);

        expect(
            dependencies
                .addBillRateAdjustmentRecord,
        ).toHaveBeenCalledWith(
            expect.objectContaining({
                billId,
                type: "tax",
                label: "Tax / SST",
                rateBasisPoints: 600,
            }),
        );
    });
});