import { ZodError } from "zod";

import { BillingDomainError } from "../../domain/billing/errors";
import { calculateLineTotal } from "../../domain/billing/items/calculate-line-total";
import {
    updateBillItemInputSchema,
    type UpdateBillItemInput,
} from "./validation/update-bill-item-input";

const POSTGRES_INTEGER_MAX =
    2_147_483_647;

export interface UpdateBillItemRecordInput {
    billId: string;
    itemId: string;
    description: string;
    quantity: number;
    unitPriceSen: number;
    lineTotalSen: number;
}

export type UpdateBillItemRecordResult =
    | {
        success: true;
        itemId: string;
    }
    | {
        success: false;
    };

export interface UpdateBillItemDependencies {
    updateBillItemRecord(
        input:
            UpdateBillItemRecordInput,
    ): Promise<UpdateBillItemRecordResult>;
}

export interface UpdateBillItemValidationIssue {
    path: string;
    message: string;
}

export type UpdateBillItemResult =
    | {
        success: true;
        itemId: string;
    }
    | {
        success: false;
        error:
            | {
                type:
                    "validation_error";
                issues:
                    UpdateBillItemValidationIssue[];
            }
            | {
                type:
                    "database_error";
                code:
                    "UPDATE_BILL_ITEM_FAILED";
                message: string;
            };
    };

function lineTotalTooLargeResult():
    UpdateBillItemResult {
    return {
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
    };
}

export async function updateBillItem(
    input: unknown,
    dependencies:
        UpdateBillItemDependencies,
): Promise<UpdateBillItemResult> {
    let validatedInput:
        UpdateBillItemInput;

    try {
        validatedInput =
            updateBillItemInputSchema.parse(
                input,
            );
    } catch (error) {
        if (error instanceof ZodError) {
            return {
                success: false,
                error: {
                    type:
                        "validation_error",
                    issues:
                        error.issues.map(
                            (issue) => ({
                                path: issue.path
                                    .map(String)
                                    .join("."),
                                message:
                                    issue.message,
                            }),
                        ),
                },
            };
        }

        throw error;
    }

    let lineTotalSen: number;

    try {
        const lineTotal =
            calculateLineTotal({
                quantity:
                    validatedInput
                        .quantity,
                unitPriceSen:
                    validatedInput
                        .unitPriceSen,
            });

        lineTotalSen =
            lineTotal
                .effectiveLineTotalSen;
    } catch (error) {
        if (
            error instanceof
                BillingDomainError &&
            error.code ===
                "UNSAFE_CALCULATION"
        ) {
            return lineTotalTooLargeResult();
        }

        throw error;
    }

    if (
        lineTotalSen >
        POSTGRES_INTEGER_MAX
    ) {
        return lineTotalTooLargeResult();
    }

    const recordResult =
        await dependencies
            .updateBillItemRecord({
                billId:
                    validatedInput
                        .billId,
                itemId:
                    validatedInput
                        .itemId,
                description:
                    validatedInput
                        .description,
                quantity:
                    validatedInput
                        .quantity,
                unitPriceSen:
                    validatedInput
                        .unitPriceSen,
                lineTotalSen,
            });

    if (!recordResult.success) {
        return {
            success: false,
            error: {
                type:
                    "database_error",
                code:
                    "UPDATE_BILL_ITEM_FAILED",
                message:
                    "Unable to update this item. Please try again.",
            },
        };
    }

    return {
        success: true,
        itemId:
            recordResult.itemId,
    };
}