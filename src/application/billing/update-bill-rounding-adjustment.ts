import { ZodError } from "zod";

import {
    updateBillRoundingAdjustmentInputSchema,
    type UpdateBillRoundingAdjustmentInput,
} from "./validation/update-bill-rounding-adjustment-input";

export type UpdateBillRoundingAdjustmentRecordResult =
    | {
        success: true;
        adjustmentId: string;
    }
    | {
        success: false;
    };

export interface UpdateBillRoundingAdjustmentDependencies {
    updateBillRoundingAdjustmentRecord(
        input:
            UpdateBillRoundingAdjustmentInput,
    ): Promise<UpdateBillRoundingAdjustmentRecordResult>;
}

export interface UpdateBillRoundingAdjustmentValidationIssue {
    path: string;
    message: string;
}

export type UpdateBillRoundingAdjustmentResult =
    | {
        success: true;
        adjustmentId: string;
    }
    | {
        success: false;
        error:
        | {
            type:
            "validation_error";
            issues:
            UpdateBillRoundingAdjustmentValidationIssue[];
        }
        | {
            type:
            "database_error";
            code:
            "UPDATE_BILL_ROUNDING_ADJUSTMENT_FAILED";
            message: string;
        };
    };

export async function updateBillRoundingAdjustment(
    input: unknown,
    dependencies:
        UpdateBillRoundingAdjustmentDependencies,
): Promise<UpdateBillRoundingAdjustmentResult> {
    let validatedInput:
        UpdateBillRoundingAdjustmentInput;

    try {
        validatedInput =
            updateBillRoundingAdjustmentInputSchema.parse(
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
            .updateBillRoundingAdjustmentRecord(
                validatedInput,
            );

    if (!recordResult.success) {
        return {
            success: false,
            error: {
                type:
                    "database_error",
                code:
                    "UPDATE_BILL_ROUNDING_ADJUSTMENT_FAILED",
                message:
                    "Unable to update this rounding adjustment. Please try again.",
            },
        };
    }

    return {
        success: true,
        adjustmentId:
            recordResult.adjustmentId,
    };
}