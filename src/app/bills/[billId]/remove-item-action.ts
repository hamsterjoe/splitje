"use server";

import { revalidatePath } from "next/cache";

import { removeServerBillItem } from "@/infrastructure/supabase/billing/remove-server-bill-item";

import type { RemoveItemActionState } from "./remove-item-action-state";

export async function removeItemAction(
  _previousState: RemoveItemActionState,
  formData: FormData,
): Promise<RemoveItemActionState> {
  const billId = formData.get("billId");
  const itemId = formData.get("itemId");

  const result = await removeServerBillItem({
    billId: billId ?? undefined,
    itemId: itemId ?? undefined,
  });

  if (!result.success) {
    return {
      status: "error",
      message:
        result.error.type === "database_error"
          ? result.error.message
          : "Unable to remove this item.",
    };
  }

  if (typeof billId !== "string") {
    return {
      status: "error",
      message: "Unable to refresh this bill.",
    };
  }

  revalidatePath(`/bills/${billId}`);

  return {
    status: "success",
    message: null,
  };
}
