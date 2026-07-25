"use server";

import { revalidatePath } from "next/cache";

import { removeServerBillAdjustment } from "@/infrastructure/supabase/billing/remove-server-bill-adjustment";

import type {
    RemoveAdjustmentActionState,
} from "./remove-adjustment-action-state";

export async function removeAdjustmentAction(
    _previousState:
        RemoveAdjustmentActionState,
    formData: FormData,
): Promise<RemoveAdjustmentActionState> {
    const billId =
        formData.get("billId");

    const adjustmentId =
        formData.get(
            "adjustmentId",
        );

    const result =
        await removeServerBillAdjustment(
            {
                billId:
                    billId ??
                    undefined,
                adjustmentId:
                    adjustmentId ??
                    undefined,
            },
        );

    if (!result.success) {
        if (
            result.error.type ===
            "validation_error"
        ) {
            return {
                status: "error",
                message:
                    "Unable to remove this adjustment.",
            };
        }

        return {
            status: "error",
            message:
                result.error.message,
        };
    }

    if (typeof billId !== "string") {
        return {
            status: "error",
            message:
                "Unable to refresh this bill.",
        };
    }

    revalidatePath(
        `/bills/${billId}`,
    );

    return {
        status: "success",
        message:
            "Adjustment removed.",
    };
}