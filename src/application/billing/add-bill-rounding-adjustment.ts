import { ZodError } from "zod";

import {
    addBillRoundingAdjustmentInputSchema,
    type AddBillRoundingAdjustmentInput,
} from "./validation/add-bill-rounding-adjustment-input";

export type AddBillRoundingAdjustmentRecordResult =
    | {
        success: true;
        adjustmentId: string;
    }
    | {
        success: false;
    };

export interface AddBillRoundingAdjustmentDependencies {
    addBillRoundingAdjustmentRecord(
        input: AddBillRoundingAdjustmentInput,
    ): Promise<AddBillRoundingAdjustmentRecordResult>;
}

export interface AddBillRoundingAdjustmentValidationIssue {
    path: string;
    message: string;
}

export type AddBillRoundingAdjustmentResult =
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
            AddBillRoundingAdjustmentValidationIssue[];
        }
        | {
            type:
            "database_error";
            code:
            "ADD_BILL_ROUNDING_ADJUSTMENT_FAILED";
            message: string;
        };
    };

export async function addBillRoundingAdjustment(
    input: unknown,
    dependencies:
        AddBillRoundingAdjustmentDependencies,
): Promise<AddBillRoundingAdjustmentResult> {
    let validatedInput:
        AddBillRoundingAdjustmentInput;

    try {
        validatedInput =
            addBillRoundingAdjustmentInputSchema.parse(
                input,
            );
    } catch (error) {
        if (error instanceof ZodError) {
            return {
                success: false,
                error: {
                    type:
                        "validation_error",
                    issues: error.issues.map(
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
            .addBillRoundingAdjustmentRecord(
                validatedInput,
            );

    if (!recordResult.success) {
        return {
            success: false,
            error: {
                type: "database_error",
                code:
                    "ADD_BILL_ROUNDING_ADJUSTMENT_FAILED",
                message:
                    "Unable to add this rounding adjustment. Please try again.",
            },
        };
    }

    return {
        success: true,
        adjustmentId:
            recordResult.adjustmentId,
    };
}