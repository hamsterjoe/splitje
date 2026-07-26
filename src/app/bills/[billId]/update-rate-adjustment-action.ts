"use server";

import { revalidatePath } from "next/cache";

import { updateServerBillRateAdjustment } from "@/infrastructure/supabase/billing/update-server-bill-rate-adjustment";

import type {
    UpdateRateAdjustmentActionState,
    UpdateRateAdjustmentField,
} from "./update-rate-adjustment-action-state";

function mapFieldErrors(
    issues: Array<{
        path: string;
        message: string;
    }>,
): Partial<
    Record<
        UpdateRateAdjustmentField,
        string
    >
> {
    const fieldErrors: Partial<
        Record<
            UpdateRateAdjustmentField,
            string
        >
    > = {};

    for (const issue of issues) {
        if (
            issue.path ===
            "percentage"
        ) {
            fieldErrors.percentage ??=
                issue.message;

            continue;
        }

        if (
            issue.path ===
            "itemScope.scope"
        ) {
            fieldErrors.scope ??=
                issue.message;

            continue;
        }

        if (
            issue.path ===
            "itemScope.applicableItemIds" ||
            issue.path.startsWith(
                "itemScope.applicableItemIds.",
            )
        ) {
            fieldErrors
                .applicableItemIds ??=
                issue.message;
        }
    }

    return fieldErrors;
}

export async function updateRateAdjustmentAction(
    _previousState:
        UpdateRateAdjustmentActionState,
    formData: FormData,
): Promise<UpdateRateAdjustmentActionState> {
    const billId =
        formData.get("billId");

    const adjustmentId =
        formData.get(
            "adjustmentId",
        );

    const result =
        await updateServerBillRateAdjustment(
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

                percentage:
                    formData.get(
                        "percentage",
                    ) ??
                    undefined,

                itemScope: {
                    scope:
                        formData.get(
                            "scope",
                        ) ??
                        undefined,

                    applicableItemIds:
                        formData.getAll(
                            "applicableItemIds",
                        ),
                },
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
                        ? "Check the highlighted fields and try again."
                        : "Unable to update this percentage adjustment.",
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
        message:
            "Percentage adjustment updated.",
        fieldErrors: {},
    };
}