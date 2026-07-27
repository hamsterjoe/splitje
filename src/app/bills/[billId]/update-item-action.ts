"use server";

import { revalidatePath } from "next/cache";

import { updateServerBillItem } from "@/infrastructure/supabase/billing/update-server-bill-item";

import type {
    UpdateItemActionState,
    UpdateItemField,
} from "./update-item-action-state";

function mapFieldErrors(
    issues: Array<{
        path: string;
        message: string;
    }>,
): Partial<
    Record<
        UpdateItemField,
        string
    >
> {
    const fieldErrors: Partial<
        Record<
            UpdateItemField,
            string
        >
    > = {};

    for (const issue of issues) {
        if (
            issue.path ===
                "description" ||
            issue.path ===
                "quantity" ||
            issue.path ===
                "unitPrice"
        ) {
            fieldErrors[
                issue.path
            ] ??= issue.message;
        }
    }

    return fieldErrors;
}

export async function updateItemAction(
    _previousState:
        UpdateItemActionState,
    formData: FormData,
): Promise<UpdateItemActionState> {
    const billId =
        formData.get("billId");

    const itemId =
        formData.get("itemId");

    const result =
        await updateServerBillItem({
            billId:
                billId ?? undefined,

            itemId:
                itemId ?? undefined,

            description:
                formData.get(
                    "description",
                ) ?? undefined,

            quantity:
                formData.get(
                    "quantity",
                ) ?? undefined,

            unitPrice:
                formData.get(
                    "unitPrice",
                ) ?? undefined,
        });

    if (!result.success) {
        if (
            result.error.type ===
            "validation_error"
        ) {
            const fieldErrors =
                mapFieldErrors(
                    result.error.issues,
                );

            return {
                status: "error",
                message:
                    Object.keys(
                        fieldErrors,
                    ).length > 0
                        ? null
                        : "Unable to update this item.",
                fieldErrors,
            };
        }

        return {
            status: "error",
            message:
                result.error.message,
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

    revalidatePath(
        `/bills/${billId}`,
    );

    return {
        status: "success",
        message: null,
        fieldErrors: {},
    };
}