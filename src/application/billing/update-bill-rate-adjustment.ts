import { ZodError } from "zod";

import {
    updateBillRateAdjustmentInputSchema,
    type UpdateBillRateAdjustmentInput,
} from "./validation/update-bill-rate-adjustment-input";

export type UpdateBillRateAdjustmentRecordResult =
    | {
        success: true;
        adjustmentId: string;
        amountSen: number;
    }
    | {
        success: false;
    };

export interface UpdateBillRateAdjustmentDependencies {
    updateBillRateAdjustmentRecord(
        input:
            UpdateBillRateAdjustmentInput,
    ): Promise<UpdateBillRateAdjustmentRecordResult>;
}

export interface UpdateBillRateAdjustmentValidationIssue {
    path: string;
    message: string;
}

export type UpdateBillRateAdjustmentResult =
    | {
        success: true;
        adjustmentId: string;
        amountSen: number;
    }
    | {
        success: false;
        error:
        | {
            type:
            "validation_error";
            issues:
            UpdateBillRateAdjustmentValidationIssue[];
        }
        | {
            type:
            "database_error";
            code:
            "UPDATE_BILL_RATE_ADJUSTMENT_FAILED";
            message: string;
        };
    };

export async function updateBillRateAdjustment(
    input: unknown,
    dependencies:
        UpdateBillRateAdjustmentDependencies,
): Promise<UpdateBillRateAdjustmentResult> {
    let validatedInput:
        UpdateBillRateAdjustmentInput;

    try {
        validatedInput =
            updateBillRateAdjustmentInputSchema.parse(
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

    const recordResult =
        await dependencies
            .updateBillRateAdjustmentRecord(
                validatedInput,
            );

    if (!recordResult.success) {
        return {
            success: false,
            error: {
                type:
                    "database_error",
                code:
                    "UPDATE_BILL_RATE_ADJUSTMENT_FAILED",
                message:
                    "Unable to update this percentage adjustment. Please try again.",
            },
        };
    }

    return {
        success: true,
        adjustmentId:
            recordResult.adjustmentId,
        amountSen:
            recordResult.amountSen,
    };
}