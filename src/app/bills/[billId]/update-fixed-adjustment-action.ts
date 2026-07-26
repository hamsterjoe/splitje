"use server";

import { revalidatePath } from "next/cache";

import { updateServerFixedBillAdjustment } from "@/infrastructure/supabase/billing/update-server-fixed-bill-adjustment";

import type {
    UpdateFixedAdjustmentActionState,
    UpdateFixedAdjustmentField,
} from "./update-fixed-adjustment-action-state";

function mapFieldErrors(
    issues: Array<{
        path: string;
        message: string;
    }>,
): Partial<
    Record<
        UpdateFixedAdjustmentField,
        string
    >
> {
    const fieldErrors: Partial<
        Record<
            UpdateFixedAdjustmentField,
            string
        >
    > = {};

    for (const issue of issues) {
        if (
            issue.path === "amount"
        ) {
            fieldErrors.amount ??=
                issue.message;
        }
    }

    return fieldErrors;
}

export async function updateFixedAdjustmentAction(
    _previousState:
        UpdateFixedAdjustmentActionState,
    formData: FormData,
): Promise<UpdateFixedAdjustmentActionState> {
    const billId =
        formData.get("billId");

    const adjustmentId =
        formData.get(
            "adjustmentId",
        );

    const result =
        await updateServerFixedBillAdjustment(
            {
                billId:
                    billId ??
                    undefined,

                adjustmentId:
                    adjustmentId ??
                    undefined,

                label:
                    formData.get(
                        "label",
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
                        : "Unable to update this adjustment.",
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