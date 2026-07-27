import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    updateBillItem,
    type UpdateBillItemDependencies,
} from "./update-bill-item";

const billId =
    "9a714df0-1303-4fe8-9f9c-f0b7d5136627";

const itemId =
    "8b2c046a-26cd-46c1-a476-e4e775839365";

function createDependencies():
    UpdateBillItemDependencies {
    return {
        updateBillItemRecord:
            vi
                .fn()
                .mockResolvedValue({
                    success: true,
                    itemId,
                }),
    };
}

describe("updateBillItem", () => {
    it("validates and calculates the updated item", async () => {
        const dependencies =
            createDependencies();

        const result =
            await updateBillItem(
                {
                    billId,
                    itemId,
                    description:
                        "  Nasi Lemak  ",
                    quantity: "3",
                    unitPrice:
                        "12.50",
                },
                dependencies,
            );

        expect(result).toEqual({
            success: true,
            itemId,
        });

        expect(
            dependencies
                .updateBillItemRecord,
        ).toHaveBeenCalledWith({
            billId,
            itemId,
            description:
                "Nasi Lemak",
            quantity: 3,
            unitPriceSen: 1_250,
            lineTotalSen: 3_750,
        });
    });

    it("allows a zero-sen item", async () => {
        const dependencies =
            createDependencies();

        await updateBillItem(
            {
                billId,
                itemId,
                description:
                    "Complimentary water",
                quantity: "2",
                unitPrice: "0",
            },
            dependencies,
        );

        expect(
            dependencies
                .updateBillItemRecord,
        ).toHaveBeenCalledWith({
            billId,
            itemId,
            description:
                "Complimentary water",
            quantity: 2,
            unitPriceSen: 0,
            lineTotalSen: 0,
        });
    });

    it("rejects an invalid item ID", async () => {
        const dependencies =
            createDependencies();

        const result =
            await updateBillItem(
                {
                    billId,
                    itemId:
                        "not-a-uuid",
                    description:
                        "Nasi Lemak",
                    quantity: "1",
                    unitPrice:
                        "12.50",
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
            path: "itemId",
            message:
                "Item ID must be a valid UUID.",
        });

        expect(
            dependencies
                .updateBillItemRecord,
        ).not.toHaveBeenCalled();
    });

    it("rejects a blank description", async () => {
        const dependencies =
            createDependencies();

        const result =
            await updateBillItem(
                {
                    billId,
                    itemId,
                    description: "   ",
                    quantity: "1",
                    unitPrice:
                        "12.50",
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
            path: "description",
            message:
                "Enter an item description.",
        });
    });

    it("rejects a line total outside PostgreSQL integer storage", async () => {
        const dependencies =
            createDependencies();

        const result =
            await updateBillItem(
                {
                    billId,
                    itemId,
                    description:
                        "Large item",
                    quantity: "2",
                    unitPrice:
                        "21474836.47",
                },
                dependencies,
            );

        expect(result).toEqual({
            success: false,
            error: {
                type:
                    "validation_error",
                issues: [
                    {
                        path:
                            "unitPrice",
                        message:
                            "Line total is too large.",
                    },
                ],
            },
        });

        expect(
            dependencies
                .updateBillItemRecord,
        ).not.toHaveBeenCalled();
    });

    it("returns a safe persistence error", async () => {
        const dependencies =
            createDependencies();

        vi.mocked(
            dependencies
                .updateBillItemRecord,
        ).mockResolvedValue({
            success: false,
        });

        const result =
            await updateBillItem(
                {
                    billId,
                    itemId,
                    description:
                        "Nasi Lemak",
                    quantity: "1",
                    unitPrice:
                        "12.50",
                },
                dependencies,
            );

        expect(result).toEqual({
            success: false,
            error: {
                type:
                    "database_error",
                code:
                    "UPDATE_BILL_ITEM_FAILED",
                message:
                    "Unable to update this item. Please try again.",
            },
        });
    });
});