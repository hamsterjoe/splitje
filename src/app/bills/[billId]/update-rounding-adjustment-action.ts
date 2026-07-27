"use server";

import { revalidatePath } from "next/cache";

import { updateServerBillRoundingAdjustment } from "@/infrastructure/supabase/billing/update-server-bill-rounding-adjustment";

import type {
    UpdateRoundingAdjustmentActionState,
    UpdateRoundingAdjustmentField,
} from "./update-rounding-adjustment-action-state";

function mapFieldErrors(
    issues: Array<{
        path: string;
        message: string;
    }>,
): Partial<
    Record<
        UpdateRoundingAdjustmentField,
        string
    >
> {
    const fieldErrors: Partial<
        Record<
            UpdateRoundingAdjustmentField,
            string
        >
    > = {};

    for (const issue of issues) {
        if (
            issue.path ===
            "direction" ||
            issue.path === "amount"
        ) {
            fieldErrors[
                issue.path
            ] ??= issue.message;
        }
    }

    return fieldErrors;
}

export async function updateRoundingAdjustmentAction(
    _previousState:
        UpdateRoundingAdjustmentActionState,
    formData: FormData,
): Promise<UpdateRoundingAdjustmentActionState> {
    const billId =
        formData.get("billId");

    const adjustmentId =
        formData.get(
            "adjustmentId",
        );

    const result =
        await updateServerBillRoundingAdjustment(
            {
                billId:
                    billId ??
                    undefined,

                adjustmentId:
                    adjustmentId ??
                    undefined,

                direction:
                    formData.get(
                        "direction",
                    ) ??
                    undefined,

                amount:
                    formData.get(
                        "amount",
                    ) ??
                    undefined,
            },
        );

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
                        : "Unable to update this rounding adjustment.",
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