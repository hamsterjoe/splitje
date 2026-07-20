import { ZodError } from "zod";

import {
    addBillAdjustmentInputSchema,
    type AddBillAdjustmentInput,
} from "./validation/add-bill-adjustment-input";

export type AddBillAdjustmentRecordResult =
    | {
        success: true;
        adjustmentId: string;
    }
    | {
        success: false;
    };

export interface AddBillAdjustmentDependencies {
    addBillAdjustmentRecord(
        input: AddBillAdjustmentInput,
    ): Promise<AddBillAdjustmentRecordResult>;
}

export interface AddBillAdjustmentValidationIssue {
    path: string;
    message: string;
}

export type AddBillAdjustmentResult =
    | {
        success: true;
        adjustmentId: string;
    }
    | {
        success: false;
        error:
        | {
            type: "validation_error";
            issues:
            AddBillAdjustmentValidationIssue[];
        }
        | {
            type: "database_error";
            code:
            "ADD_BILL_ADJUSTMENT_FAILED";
            message: string;
        };
    };

export async function addBillAdjustment(
    input: unknown,
    dependencies:
        AddBillAdjustmentDependencies,
): Promise<AddBillAdjustmentResult> {
    let validatedInput:
        AddBillAdjustmentInput;

    try {
        validatedInput =
            addBillAdjustmentInputSchema.parse(
                input,
            );
    } catch (error) {
        if (error instanceof ZodError) {
            return {
                success: false,
                error: {
                    type: "validation_error",
                    issues: error.issues.map(
                        (issue) => ({
                            path: issue.path
                                .map(String)
                                .join("."),
                            message: issue.message,
                        }),
                    ),
                },
            };
        }

        throw error;
    }

    const recordResult =
        await dependencies
            .addBillAdjustmentRecord(
                validatedInput,
            );

    if (!recordResult.success) {
        return {
            success: false,
            error: {
                type: "database_error",
                code:
                    "ADD_BILL_ADJUSTMENT_FAILED",
                message:
                    "Unable to add this adjustment. Please try again.",
            },
        };
    }

    return {
        success: true,
        adjustmentId:
            recordResult.adjustmentId,
    };
}