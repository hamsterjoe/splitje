import { ZodError } from "zod";

import {
    updateFixedBillAdjustmentInputSchema,
    type UpdateFixedBillAdjustmentInput,
} from "./validation/update-fixed-bill-adjustment-input";

export type UpdateFixedBillAdjustmentRecordResult =
    | {
        success: true;
        adjustmentId: string;
    }
    | {
        success: false;
    };

export interface UpdateFixedBillAdjustmentDependencies {
    updateFixedBillAdjustmentRecord(
        input:
            UpdateFixedBillAdjustmentInput,
    ): Promise<UpdateFixedBillAdjustmentRecordResult>;
}

export interface UpdateFixedBillAdjustmentValidationIssue {
    path: string;
    message: string;
}

export type UpdateFixedBillAdjustmentResult =
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
                    UpdateFixedBillAdjustmentValidationIssue[];
            }
            | {
                type:
                    "database_error";
                code:
                    "UPDATE_FIXED_BILL_ADJUSTMENT_FAILED";
                message: string;
            };
    };

export async function updateFixedBillAdjustment(
    input: unknown,
    dependencies:
        UpdateFixedBillAdjustmentDependencies,
): Promise<UpdateFixedBillAdjustmentResult> {
    let validatedInput:
        UpdateFixedBillAdjustmentInput;

    try {
        validatedInput =
            updateFixedBillAdjustmentInputSchema.parse(
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
            .updateFixedBillAdjustmentRecord(
                validatedInput,
            );

    if (!recordResult.success) {
        return {
            success: false,
            error: {
                type:
                    "database_error",
                code:
                    "UPDATE_FIXED_BILL_ADJUSTMENT_FAILED",
                message:
                    "Unable to update this adjustment. Please try again.",
            },
        };
    }

    return {
        success: true,
        adjustmentId:
            recordResult.adjustmentId,
    };
}