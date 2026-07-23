import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    addBillAdjustment,
    type AddBillAdjustmentDependencies,
} from "./add-bill-adjustment";

const billId =
    "9a714df0-1303-4fe8-9f9c-f0b7d5136627";

const adjustmentId =
    "8b2c046a-26cd-46c1-a476-e4e775839365";

function createDependencies():
    AddBillAdjustmentDependencies {
    return {
        addBillAdjustmentRecord: vi
            .fn()
            .mockResolvedValue({
                success: true,
                adjustmentId,
            }),
    };
}

describe("addBillAdjustment", () => {
    it("creates a positive tax adjustment", async () => {
        const dependencies =
            createDependencies();

        const result =
            await addBillAdjustment(
                {
                    billId,
                    type: "tax",
                    label: "  SST  ",
                    amount: "3.60",
                },
                dependencies,
            );

        expect(result).toEqual({
            success: true,
            adjustmentId,
        });

        expect(
            dependencies.addBillAdjustmentRecord,
        ).toHaveBeenCalledWith({
            billId,
            type: "tax",
            label: "SST",
            amountSen: 360,
        });
    });

    it("stores discounts as negative sen", async () => {
        const dependencies =
            createDependencies();

        await addBillAdjustment(
            {
                billId,
                type: "discount",
                label: "Voucher",
                amount: "5.00",
            },
            dependencies,
        );

        expect(
            dependencies.addBillAdjustmentRecord,
        ).toHaveBeenCalledWith({
            billId,
            type: "discount",
            label: "Voucher",
            amountSen: -500,
        });
    });

    it("normalizes a zero discount", async () => {
        const dependencies =
            createDependencies();

        await addBillAdjustment(
            {
                billId,
                type: "discount",
                label: "Voucher",
                amount: "0",
            },
            dependencies,
        );

        const call = vi.mocked(
            dependencies.addBillAdjustmentRecord,
        ).mock.calls[0]?.[0];

        expect(call?.amountSen).toBe(0);
        expect(
            Object.is(call?.amountSen, -0),
        ).toBe(false);
    });

    it("rejects an unsupported adjustment type", async () => {
        const dependencies =
            createDependencies();

        const result =
            await addBillAdjustment(
                {
                    billId,
                    type: "rounding",
                    label: "Rounding",
                    amount: "0.01",
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
            result.error.issues.some(
                (issue) =>
                    issue.path === "type",
            ),
        ).toBe(true);

        expect(
            dependencies
                .addBillAdjustmentRecord,
        ).not.toHaveBeenCalled();
    });

    it("rejects a blank label", async () => {
        const dependencies =
            createDependencies();

        const result =
            await addBillAdjustment(
                {
                    billId,
                    type: "service_charge",
                    label: "   ",
                    amount: "10.00",
                },
                dependencies,
            );

        expect(result.success).toBe(true);

        expect(
            dependencies
                .addBillAdjustmentRecord,
        ).toHaveBeenCalledWith({
            billId,
            type: "service_charge",
            label: "Service charge",
            amountSen: 1_000,
        });
    });

    it("rejects invalid monetary input", async () => {
        const dependencies =
            createDependencies();

        const result =
            await addBillAdjustment(
                {
                    billId,
                    type: "tax",
                    label: "SST",
                    amount: "3.999",
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

        expect(result.error.issues).toContainEqual({
            path: "amount",
            message:
                "Enter an amount with no more than 2 decimal places.",
        });
    });

    it("returns a safe persistence error", async () => {
        const dependencies =
            createDependencies();

        vi.mocked(
            dependencies.addBillAdjustmentRecord,
        ).mockResolvedValue({
            success: false,
        });

        const result =
            await addBillAdjustment(
                {
                    billId,
                    type: "tax",
                    label: "SST",
                    amount: "3.60",
                },
                dependencies,
            );

        expect(result).toEqual({
            success: false,
            error: {
                type: "database_error",
                code:
                    "ADD_BILL_ADJUSTMENT_FAILED",
                message:
                    "Unable to add this adjustment. Please try again.",
            },
        });
    });
});