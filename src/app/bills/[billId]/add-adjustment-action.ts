"use server";

import { revalidatePath } from "next/cache";

import { addServerBillAdjustment } from "@/infrastructure/supabase/billing/add-server-bill-adjustment";

import type {
    AddAdjustmentActionState,
    AddAdjustmentField,
} from "./add-adjustment-action-state";

function mapFieldErrors(
    issues: Array<{
        path: string;
        message: string;
    }>,
): Partial<
    Record<AddAdjustmentField, string>
> {
    const fieldErrors: Partial<
        Record<AddAdjustmentField, string>
    > = {};

    for (const issue of issues) {
        if (
            issue.path === "type" ||
            issue.path === "label" ||
            issue.path === "amount"
        ) {
            fieldErrors[issue.path] ??=
                issue.message;
        }
    }

    return fieldErrors;
}

export async function addAdjustmentAction(
    _previousState: AddAdjustmentActionState,
    formData: FormData,
): Promise<AddAdjustmentActionState> {
    const billId = formData.get("billId");
    const type = formData.get("type");
    const label = formData.get("label");
    const amount = formData.get("amount");

    const result =
        await addServerBillAdjustment({
            billId: billId ?? undefined,
            type: type ?? undefined,
            label: label ?? undefined,
            amount: amount ?? undefined,
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
                        ? "Check the highlighted fields and try again."
                        : "Unable to add this adjustment.",
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
        message: "Adjustment added.",
        fieldErrors: {},
    };
}