import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CreateDraftBillInput,
} from "../../../application/billing/validation/create-draft-bill-input";
import type { Database } from "../database.types";

export type CreateDraftBillRecordResult =
  | {
      success: true;
      billId: string;
      ownerParticipantId: string;
    }
  | {
      success: false;
    };

export async function createDraftBillRecord(
  supabase: SupabaseClient<Database>,
  input: CreateDraftBillInput,
): Promise<CreateDraftBillRecordResult> {
    const { data, error } = await supabase.rpc(
        "create_draft_bill",
        {
          p_owner_display_name:
            input.ownerDisplayName,
      
          p_printed_total_sen:
            input.printedTotalSen,
      
          ...(input.merchantName === null
            ? {}
            : {
                p_merchant_name:
                  input.merchantName,
              }),
        },
      );

  const createdBill = data?.[0];

  if (
    error ||
    !createdBill?.bill_id ||
    !createdBill.owner_participant_id
  ) {
    return {
      success: false,
    };
  }

  return {
    success: true,
    billId: createdBill.bill_id,
    ownerParticipantId:
      createdBill.owner_participant_id,
  };
}