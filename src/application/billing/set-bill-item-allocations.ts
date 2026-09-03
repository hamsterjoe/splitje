import { ZodError } from "zod";

import {
    setBillItemAllocationsInputSchema,
    type SetBillItemAllocationsInput,
} from "./validation/set-bill-item-allocations-input";

export type SetBillItemAllocationsRecordResult =
    | {
        success: true;
        itemId: string;
    }
    | {
        success: false;
    };

export interface SetBillItemAllocationsDependencies {
    setBillItemAllocationsRecord(
        input: SetBillItemAllocationsInput,
    ): Promise<SetBillItemAllocationsRecordResult>;
}

export interface SetBillItemAllocationsValidationIssue {
    path: string;
    message: string;
}

export type SetBillItemAllocationsResult =
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
                    SetBillItemAllocationsValidationIssue[];
            }
            | {
                type:
                    "database_error";
                code:
                    "SET_BILL_ITEM_ALLOCATIONS_FAILED";
                message: string;
            };
    };

export async function setBillItemAllocations(
    input: unknown,
    dependencies:
        SetBillItemAllocationsDependencies,
): Promise<SetBillItemAllocationsResult> {
    let validatedInput:
        SetBillItemAllocationsInput;

    try {
        validatedInput =
            setBillItemAllocationsInputSchema.parse(
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
            .setBillItemAllocationsRecord(
                validatedInput,
            );

    if (!recordResult.success) {
        return {
            success: false,
            error: {
                type:
                    "database_error",
                code:
                    "SET_BILL_ITEM_ALLOCATIONS_FAILED",
                message:
                    "Unable to update this assignment. Please try again.",
            },
        };
    }

    return {
        success: true,
        itemId:
            recordResult.itemId,
    };
}
