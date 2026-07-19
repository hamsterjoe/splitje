import "server-only";

import {
  getOwnerBill,
  type GetOwnerBillResult,
} from "../../../application/billing/get-owner-bill";
import { createServerSupabaseClient } from "../server";
import { getOwnerBillRecord } from "./get-owner-bill-record";

export async function getServerOwnerBill(
  billId: unknown,
): Promise<GetOwnerBillResult> {
  const supabase =
    await createServerSupabaseClient();

  return getOwnerBill(billId, {
    getOwnerBillRecord: (validatedBillId) =>
      getOwnerBillRecord(
        supabase,
        validatedBillId,
      ),
  });
}