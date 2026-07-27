import "server-only";

import {
  removeBillItem,
  type RemoveBillItemResult,
} from "../../../application/billing/remove-bill-item";
import { createServerSupabaseClient } from "../server";
import { removeBillItemRecord } from "./remove-bill-item-record";

export async function removeServerBillItem(
  input: unknown,
): Promise<RemoveBillItemResult> {
  const supabase = await createServerSupabaseClient();

  return removeBillItem(input, {
    removeBillItemRecord: (validatedInput) =>
      removeBillItemRecord(supabase, validatedInput),
  });
}
