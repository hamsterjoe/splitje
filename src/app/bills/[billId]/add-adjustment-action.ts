"use server";

import { revalidatePath } from "next/cache";

import { addServerBillAdjustment } from "@/infrastructure/supabase/billing/add-server-bill-adjustment";
import { addServerBillRateAdjustment } from "@/infrastructure/supabase/billing/add-server-bill-rate-adjustment";

import type {
    AddAdjustmentActionState,
    AddAdjustmentField,
} from "./add-adjustment-action-state";

type CalculationMethod =
    | "fixed"
    | "rate";

function isCalculationMethod(
    value: unknown,
): value is CalculationMethod {
    return (
        value === "fixed" ||
        value === "rate"
    );
}

function mapFieldErrors(
    issues: Array<{
        path: string;
        message: string;
    }>,
): Partial<
    Record<AddAdjustmentField, string>
> {
    const fieldErrors: Partial<
        Record<
            AddAdjustmentField,
            string
        >
    > = {};

    for (const issue of issues) {
        if (
            issue.path ===
            "calculationMethod" ||
            issue.path === "type" ||
            issue.path === "label" ||
            issue.path === "amount" ||
            issue.path === "percentage"
        ) {
            fieldErrors[issue.path] ??=
                issue.message;
        }
    }

    return fieldErrors;
}

export async function addAdjustmentAction(
    _previousState:
        AddAdjustmentActionState,
    formData: FormData,
): Promise<AddAdjustmentActionState> {
    const billId =
        formData.get("billId");

    const type =
        formData.get("type");

    const label =
        formData.get("label");

    const rawCalculationMethod =
        formData.get(
            "calculationMethod",
        ) ?? "fixed";

    if (
        !isCalculationMethod(
            rawCalculationMethod,
        )
    ) {
        return {
            status: "error",
            message:
                "Check the highlighted field and try again.",
            fieldErrors: {
                calculationMethod:
                    "Choose fixed amount or percentage.",
            },
        };
    }

    const result =
        rawCalculationMethod === "fixed"
            ? await addServerBillAdjustment(
                {
                    billId:
                        billId ??
                        undefined,
                    type:
                        type ??
                        undefined,
                    label:
                        label ??
                        undefined,
                    amount:
                        formData.get(
                            "amount",
                        ) ??
                        undefined,
                },
            )
            : await addServerBillRateAdjustment(
                {
                    billId:
                        billId ??
                        undefined,
                    type:
                        type ??
                        undefined,
                    label:
                        label ??
                        undefined,
                    percentage:
                        formData.get(
                            "percentage",
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
                        ? "Check the highlighted fields and try again."
                        : "Unable to add this adjustment.",
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
            rawCalculationMethod ===
                "rate"
                ? "Percentage adjustment added."
                : "Adjustment added.",
        fieldErrors: {},
    };
}