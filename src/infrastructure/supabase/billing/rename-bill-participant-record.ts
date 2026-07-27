import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { RenameBillParticipantRecordResult } from "../../../application/billing/rename-bill-participant";
import type { RenameBillParticipantInput } from "../../../application/billing/validation/rename-bill-participant-input";
import type { Database } from "../database.types";

export async function renameBillParticipantRecord(
  supabase: SupabaseClient<Database>,
  input: RenameBillParticipantInput,
): Promise<RenameBillParticipantRecordResult> {
  const { data, error } = await supabase.rpc("rename_bill_participant", {
    p_bill_id: input.billId,
    p_display_name: input.displayName,
    p_participant_id: input.participantId,
  });

  const updatedParticipant = data?.[0];

  if (error || !updatedParticipant?.updated_participant_id) {
    return {
      success: false,
    };
  }

  return {
    success: true,
    participantId: updatedParticipant.updated_participant_id,
  };
}
