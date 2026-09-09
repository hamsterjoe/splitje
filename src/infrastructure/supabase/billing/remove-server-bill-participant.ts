import "server-only";

import {
  removeBillParticipant,
  type RemoveBillParticipantResult,
} from "../../../application/billing/remove-bill-participant";
import { createServerSupabaseClient } from "../server";
import { removeBillParticipantRecord } from "./remove-bill-participant-record";

export async function removeServerBillParticipant(
  input: unknown,
): Promise<RemoveBillParticipantResult> {
  const supabase = await createServerSupabaseClient();

  return removeBillParticipant(input, {
    removeBillParticipantRecord: (validatedInput) =>
      removeBillParticipantRecord(supabase, validatedInput),
  });
}
