import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    updateBillPrintedTotal,
    type UpdateBillPrintedTotalDependencies,
} from "./update-bill-printed-total";

const billId =
    "9a714df0-1303-4fe8-9f9c-f0b7d5136627";

function createDependencies():
    UpdateBillPrintedTotalDependencies {
    return {
        updateBillPrintedTotalRecord: vi
            .fn()
            .mockResolvedValue({
                success: true,
                rowVersion: 1,
            }),
    };
}

describe("updateBillPrintedTotal", () => {
    it("parses and updates the printed total", async () => {
        const dependencies =
            createDependencies();

        const result =
            await updateBillPrintedTotal(
                {
                    billId,
                    expectedRowVersion: "0",
                    printedTotal: "125.40",
                },
                dependencies,
            );

        expect(result).toEqual({
            success: true,
            rowVersion: 1,
        });

        expect(
            dependencies
                .updateBillPrintedTotalRecord,
        ).toHaveBeenCalledWith({
            billId,
            expectedRowVersion: 0,
            printedTotalSen: 12_540,
        });
    });

    it("accepts a zero printed total", async () => {
        const dependencies =
            createDependencies();

        await updateBillPrintedTotal(
            {
                billId,
                expectedRowVersion: 0,
                printedTotal: "0",
            },
            dependencies,
        );

        expect(
            dependencies
                .updateBillPrintedTotalRecord,
        ).toHaveBeenCalledWith({
            billId,
            expectedRowVersion: 0,
            printedTotalSen: 0,
        });
    });

    it("rejects an invalid amount", async () => {
        const dependencies =
            createDependencies();

        const result =
            await updateBillPrintedTotal(
                {
                    billId,
                    expectedRowVersion: "0",
                    printedTotal: "12.345",
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
            path: "printedTotal",
            message:
                "Enter an amount with no more than 2 decimal places.",
        });

        expect(
            dependencies
                .updateBillPrintedTotalRecord,
        ).not.toHaveBeenCalled();
    });

    it("rejects an invalid row version", async () => {
        const dependencies =
            createDependencies();

        const result =
            await updateBillPrintedTotal(
                {
                    billId,
                    expectedRowVersion: "-1",
                    printedTotal: "20.00",
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
            path: "expectedRowVersion",
            message:
                "Bill version must be a non-negative safe integer.",
        });
    });

    it("returns a version conflict", async () => {
        const dependencies =
            createDependencies();

        vi.mocked(
            dependencies
                .updateBillPrintedTotalRecord,
        ).mockResolvedValue({
            success: false,
            reason: "conflict",
        });

        const result =
            await updateBillPrintedTotal(
                {
                    billId,
                    expectedRowVersion: 0,
                    printedTotal: "20.00",
                },
                dependencies,
            );

        expect(result).toEqual({
            success: false,
            error: {
                type: "conflict_error",
                code: "BILL_VERSION_CONFLICT",
                message:
                    "This bill changed in another tab. Refresh and try again.",
            },
        });
    });

    it("returns a safe database error", async () => {
        const dependencies =
            createDependencies();

        vi.mocked(
            dependencies
                .updateBillPrintedTotalRecord,
        ).mockResolvedValue({
            success: false,
            reason: "unknown",
        });

        const result =
            await updateBillPrintedTotal(
                {
                    billId,
                    expectedRowVersion: 0,
                    printedTotal: "20.00",
                },
                dependencies,
            );

        expect(result).toEqual({
            success: false,
            error: {
                type: "database_error",
                code:
                    "UPDATE_BILL_PRINTED_TOTAL_FAILED",
                message:
                    "Unable to update the receipt total. Please try again.",
            },
        });
    });
});