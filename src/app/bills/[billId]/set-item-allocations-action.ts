"use server";

import { revalidatePath } from "next/cache";

import { setServerBillItemAllocations } from "@/infrastructure/supabase/billing/set-server-bill-item-allocations";

import type {
  SetItemAllocationsActionState,
  SetItemAllocationsField,
} from "./set-item-allocations-action-state";

function mapFieldErrors(
  issues: Array<{
    path: string;
    message: string;
  }>,
): Partial<Record<SetItemAllocationsField, string>> {
  const fieldErrors: Partial<Record<SetItemAllocationsField, string>> = {};

  for (const issue of issues) {
    if (
      issue.path === "shares" ||
      issue.path.startsWith("shares.")
    ) {
      fieldErrors.shares ??= issue.message;
    }
  }

  return fieldErrors;
}

export async function setItemAllocationsAction(
  _previousState: SetItemAllocationsActionState,
  formData: FormData,
): Promise<SetItemAllocationsActionState> {
  const billId = formData.get("billId");
  const itemId = formData.get("itemId");
  const mode = formData.get("mode");
  const participantIds = formData.getAll("participantIds");

  const valueField =
    mode === "quantity"
      ? "quantityShare"
      : mode === "percentage"
        ? "percentage"
        : mode === "custom"
          ? "amount"
          : null;

  const shares = participantIds.map((participantId) => ({
    participantId,
    value:
      valueField === null
        ? undefined
        : (formData.get(
            `${valueField}-${String(participantId)}`,
          ) ?? undefined),
  }));

  const result = await setServerBillItemAllocations({
    billId: billId ?? undefined,
    itemId: itemId ?? undefined,
    mode: mode ?? undefined,
    shares,
  });

  if (!result.success) {
    if (result.error.type === "validation_error") {
      const fieldErrors = mapFieldErrors(result.error.issues);

      return {
        status: "error",
        message:
          Object.keys(fieldErrors).length > 0
            ? null
            : "Unable to update this assignment.",
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
      message: "Unable to refresh this bill.",
      fieldErrors: {},
    };
  }

  revalidatePath(`/bills/${billId}`);

  return {
    status: "success",
    message: null,
    fieldErrors: {},
  };
}
