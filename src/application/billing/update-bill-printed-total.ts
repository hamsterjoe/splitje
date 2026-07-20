import { ZodError } from "zod";

import {
    updateBillPrintedTotalInputSchema,
    type UpdateBillPrintedTotalInput,
} from "./validation/update-bill-printed-total-input";

export type UpdateBillPrintedTotalRecordResult =
    | {
        success: true;
        rowVersion: number;
    }
    | {
        success: false;
        reason: "conflict" | "unknown";
    };

export interface UpdateBillPrintedTotalDependencies {
    updateBillPrintedTotalRecord(
        input: UpdateBillPrintedTotalInput,
    ): Promise<UpdateBillPrintedTotalRecordResult>;
}

export interface UpdateBillPrintedTotalValidationIssue {
    path: string;
    message: string;
}

export type UpdateBillPrintedTotalResult =
    | {
        success: true;
        rowVersion: number;
    }
    | {
        success: false;
        error:
        | {
            type: "validation_error";
            issues:
            UpdateBillPrintedTotalValidationIssue[];
        }
        | {
            type: "conflict_error";
            code: "BILL_VERSION_CONFLICT";
            message: string;
        }
        | {
            type: "database_error";
            code:
            "UPDATE_BILL_PRINTED_TOTAL_FAILED";
            message: string;
        };
    };

export async function updateBillPrintedTotal(
    input: unknown,
    dependencies:
        UpdateBillPrintedTotalDependencies,
): Promise<UpdateBillPrintedTotalResult> {
    let validatedInput:
        UpdateBillPrintedTotalInput;

    try {
        validatedInput =
            updateBillPrintedTotalInputSchema.parse(
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
            .updateBillPrintedTotalRecord(
                validatedInput,
            );

    if (!recordResult.success) {
        if (
            recordResult.reason === "conflict"
        ) {
            return {
                success: false,
                error: {
                    type: "conflict_error",
                    code: "BILL_VERSION_CONFLICT",
                    message:
                        "This bill changed in another tab. Refresh and try again.",
                },
            };
        }

        return {
            success: false,
            error: {
                type: "database_error",
                code:
                    "UPDATE_BILL_PRINTED_TOTAL_FAILED",
                message:
                    "Unable to update the receipt total. Please try again.",
            },
        };
    }

    return {
        success: true,
        rowVersion: recordResult.rowVersion,
    };
}