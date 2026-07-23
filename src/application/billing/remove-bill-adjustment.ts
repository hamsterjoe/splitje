import { ZodError } from "zod";

import {
    removeBillAdjustmentInputSchema,
    type RemoveBillAdjustmentInput,
} from "./validation/remove-bill-adjustment-input";

export type RemoveBillAdjustmentRecordResult =
    | {
        success: true;
        adjustmentId: string;
    }
    | {
        success: false;
    };

export interface RemoveBillAdjustmentDependencies {
    removeBillAdjustmentRecord(
        input: RemoveBillAdjustmentInput,
    ): Promise<RemoveBillAdjustmentRecordResult>;
}

export interface RemoveBillAdjustmentValidationIssue {
    path: string;
    message: string;
}

export type RemoveBillAdjustmentResult =
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
                    RemoveBillAdjustmentValidationIssue[];
            }
            | {
                type:
                    "database_error";
                code:
                    "REMOVE_BILL_ADJUSTMENT_FAILED";
                message: string;
            };
    };

export async function removeBillAdjustment(
    input: unknown,
    dependencies:
        RemoveBillAdjustmentDependencies,
): Promise<RemoveBillAdjustmentResult> {
    let validatedInput:
        RemoveBillAdjustmentInput;

    try {
        validatedInput =
            removeBillAdjustmentInputSchema.parse(
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
            .removeBillAdjustmentRecord(
                validatedInput,
            );

    if (!recordResult.success) {
        return {
            success: false,
            error: {
                type:
                    "database_error",
                code:
                    "REMOVE_BILL_ADJUSTMENT_FAILED",
                message:
                    "Unable to remove this adjustment. Please try again.",
            },
        };
    }

    return {
        success: true,
        adjustmentId:
            recordResult.adjustmentId,
    };
}