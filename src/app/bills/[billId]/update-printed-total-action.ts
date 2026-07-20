"use server";

import { revalidatePath } from "next/cache";

import { updateServerBillPrintedTotal } from "@/infrastructure/supabase/billing/update-server-bill-printed-total";

import type {
    UpdatePrintedTotalActionState,
    UpdatePrintedTotalField,
} from "./update-printed-total-action-state";

function mapFieldErrors(
    issues: Array<{
        path: string;
        message: string;
    }>,
): Partial<
    Record<
        UpdatePrintedTotalField,
        string
    >
> {
    const fieldErrors: Partial<
        Record<
            UpdatePrintedTotalField,
            string
        >
    > = {};

    for (const issue of issues) {
        if (issue.path === "printedTotal") {
            fieldErrors.printedTotal ??=
                issue.message;
        }
    }

    return fieldErrors;
}

export async function updatePrintedTotalAction(
    _previousState:
        UpdatePrintedTotalActionState,
    formData: FormData,
): Promise<UpdatePrintedTotalActionState> {
    const billId = formData.get("billId");

    const expectedRowVersion = formData.get(
        "expectedRowVersion",
    );

    const printedTotal = formData.get(
        "printedTotal",
    );

    const result =
        await updateServerBillPrintedTotal({
            billId: billId ?? undefined,
            expectedRowVersion:
                expectedRowVersion ?? undefined,
            printedTotal:
                printedTotal ?? undefined,
        });

    if (!result.success) {
        if (
            result.error.type ===
            "validation_error"
        ) {
            const fieldErrors = mapFieldErrors(
                result.error.issues,
            );

            return {
                status: "error",
                message:
                    Object.keys(fieldErrors).length >
                        0
                        ? "Check the highlighted field and try again."
                        : "Unable to update the receipt total.",
                fieldErrors,
            };
        }

        return {
            status: "error",
            message: result.error.message,
            fieldErrors: {},
        };
    }

    if (typeof billId !== "string") {
        return {
            status: "error",
            message:
                "Unable to refresh this bill.",
            fieldErrors: {},
        };
    }

    revalidatePath(`/bills/${billId}`);

    return {
        status: "success",
        message: "Receipt total updated.",
        fieldErrors: {},
    };
}