import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { SetBillItemAllocationsRecordResult } from "../../../application/billing/set-bill-item-allocations";
import type { SetBillItemAllocationsInput } from "../../../application/billing/validation/set-bill-item-allocations-input";
import type { Database } from "../database.types";

export async function setBillItemAllocationsRecord(
  supabase: SupabaseClient<Database>,
  input: SetBillItemAllocationsInput,
): Promise<SetBillItemAllocationsRecordResult> {
  const { data, error } = await supabase.rpc("set_bill_item_allocations", {
    p_bill_id: input.billId,
    p_item_id: input.itemId,
    p_participant_ids: input.participantIds,
  });

  const updatedItem = data?.[0];

  if (error || !updatedItem?.set_item_id) {
    // Server-side diagnostics only — the client still receives the
    // safe generic message from the application layer.
    console.error("[set_bill_item_allocations] RPC failed", {
      error,
      data,
      billId: input.billId,
      itemId: input.itemId,
      participantIds: input.participantIds,
    });

    return {
      success: false,
    };
  }

  return {
    success: true,
    itemId: updatedItem.set_item_id,
  };
}
