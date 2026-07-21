import { ZodError } from "zod";

import {
    addBillRateAdjustmentInputSchema,
    type AddBillRateAdjustmentInput,
} from "./validation/add-bill-rate-adjustment-input";

export type AddBillRateAdjustmentRecordResult =
    | {
        success: true;
        adjustmentId: string;
        amountSen: number;
    }
    | {
        success: false;
    };

export interface AddBillRateAdjustmentDependencies {
    addBillRateAdjustmentRecord(
        input: AddBillRateAdjustmentInput,
    ): Promise<AddBillRateAdjustmentRecordResult>;
}

export interface AddBillRateAdjustmentValidationIssue {
    path: string;
    message: string;
}

export type AddBillRateAdjustmentResult =
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
            AddBillRateAdjustmentValidationIssue[];
        }
        | {
            type:
            "database_error";
            code:
            "ADD_BILL_RATE_ADJUSTMENT_FAILED";
            message: string;
        };
    };

export async function addBillRateAdjustment(
    input: unknown,
    dependencies:
        AddBillRateAdjustmentDependencies,
): Promise<AddBillRateAdjustmentResult> {
    let validatedInput:
        AddBillRateAdjustmentInput;

    try {
        validatedInput =
            addBillRateAdjustmentInputSchema.parse(
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
            .addBillRateAdjustmentRecord(
                validatedInput,
            );

    if (!recordResult.success) {
        return {
            success: false,
            error: {
                type: "database_error",
                code:
                    "ADD_BILL_RATE_ADJUSTMENT_FAILED",
                message:
                    "Unable to add this percentage adjustment. Please try again.",
            },
        };
    }

    return {
        success: true,
        adjustmentId:
            recordResult.adjustmentId,
        amountSen: recordResult.amountSen,
    };
}