import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AddBillParticipantRecordResult,
} from "../../../application/billing/add-bill-participant";
import type {
  AddBillParticipantInput,
} from "../../../application/billing/validation/add-bill-participant-input";
import type { Database } from "../database.types";

export async function addBillParticipantRecord(
  supabase: SupabaseClient<Database>,
  input: AddBillParticipantInput,
): Promise<AddBillParticipantRecordResult> {
  const { data, error } = await supabase.rpc(
    "add_bill_participant",
    {
      p_bill_id: input.billId,
      p_display_name: input.displayName,
    },
  );

  const createdParticipant = data?.[0];

  if (
    error ||
    !createdParticipant?.participant_id
  ) {
    return {
      success: false,
    };
  }

  return {
    success: true,
    participantId:
      createdParticipant.participant_id,
  };
}