import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { RemoveBillItemRecordResult } from "../../../application/billing/remove-bill-item";
import type { RemoveBillItemInput } from "../../../application/billing/validation/remove-bill-item-input";
import type { Database } from "../database.types";

export async function removeBillItemRecord(
  supabase: SupabaseClient<Database>,
  input: RemoveBillItemInput,
): Promise<RemoveBillItemRecordResult> {
  const { data, error } = await supabase.rpc("remove_bill_item", {
    p_bill_id: input.billId,
    p_item_id: input.itemId,
  });

  const removedItem = data?.[0];

  if (error || !removedItem?.removed_item_id) {
    return {
      success: false,
    };
  }

  return {
    success: true,
    itemId: removedItem.removed_item_id,
  };
}
