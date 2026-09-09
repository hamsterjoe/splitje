import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { RemoveBillParticipantRecordResult } from "../../../application/billing/remove-bill-participant";
import type { RemoveBillParticipantInput } from "../../../application/billing/validation/remove-bill-participant-input";
import type { Database } from "../database.types";

export async function removeBillParticipantRecord(
  supabase: SupabaseClient<Database>,
  input: RemoveBillParticipantInput,
): Promise<RemoveBillParticipantRecordResult> {
  const { data, error } = await supabase.rpc("remove_bill_participant", {
    p_bill_id: input.billId,
    p_participant_id: input.participantId,
  });

  const removedParticipant = data?.[0];

  if (error || !removedParticipant?.removed_participant_id) {
    // Server-side diagnostics only — the client still receives the
    // safe generic message from the application layer.
    console.error("[remove_bill_participant] RPC failed", {
      error,
      data,
      billId: input.billId,
      participantId: input.participantId,
    });

    return {
      success: false,
    };
  }

  return {
    success: true,
    participantId: removedParticipant.removed_participant_id,
  };
}
