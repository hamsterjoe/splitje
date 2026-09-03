import "server-only";

import {
  setBillItemAllocations,
  type SetBillItemAllocationsResult,
} from "../../../application/billing/set-bill-item-allocations";
import { createServerSupabaseClient } from "../server";
import { setBillItemAllocationsRecord } from "./set-bill-item-allocations-record";

export async function setServerBillItemAllocations(
  input: unknown,
): Promise<SetBillItemAllocationsResult> {
  const supabase = await createServerSupabaseClient();

  return setBillItemAllocations(input, {
    setBillItemAllocationsRecord: (validatedInput) =>
      setBillItemAllocationsRecord(supabase, validatedInput),
  });
}
