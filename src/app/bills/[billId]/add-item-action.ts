"use server";

import { revalidatePath } from "next/cache";

import { addServerBillItem } from "@/infrastructure/supabase/billing/add-server-bill-item";

import type {
    AddItemActionState,
    AddItemField,
} from "./add-item-action-state";

function mapFieldErrors(
    issues: Array<{
        path: string;
        message: string;
    }>,
): Partial<Record<AddItemField, string>> {
    const fieldErrors: Partial<
        Record<AddItemField, string>
    > = {};

    for (const issue of issues) {
        if (
            issue.path === "description" ||
            issue.path === "quantity" ||
            issue.path === "unitPrice"
        ) {
            fieldErrors[issue.path] ??=
                issue.message;
        }
    }

    return fieldErrors;
}

export async function addItemAction(
    _previousState: AddItemActionState,
    formData: FormData,
): Promise<AddItemActionState> {
    const billId = formData.get("billId");
    const description =
        formData.get("description");
    const quantity = formData.get("quantity");
    const unitPrice =
        formData.get("unitPrice");

    const result = await addServerBillItem({
        billId: billId ?? undefined,
        description: description ?? undefined,
        quantity: quantity ?? undefined,
        unitPrice: unitPrice ?? undefined,
    });

    if (!result.success) {
        if (
            result.error.type === "validation_error"
        ) {
            const fieldErrors = mapFieldErrors(
                result.error.issues,
            );

            return {
                status: "error",
                message:
                    Object.keys(fieldErrors).length > 0
                        ? "Check the highlighted fields and try again."
                        : "Unable to add this item.",
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
        message: "Item added.",
        fieldErrors: {},
    };
}