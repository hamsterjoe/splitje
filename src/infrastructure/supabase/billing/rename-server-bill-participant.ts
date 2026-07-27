import "server-only";

import {
  renameBillParticipant,
  type RenameBillParticipantResult,
} from "../../../application/billing/rename-bill-participant";
import { createServerSupabaseClient } from "../server";
import { renameBillParticipantRecord } from "./rename-bill-participant-record";

export async function renameServerBillParticipant(
  input: unknown,
): Promise<RenameBillParticipantResult> {
  const supabase = await createServerSupabaseClient();

  return renameBillParticipant(input, {
    renameBillParticipantRecord: (validatedInput) =>
      renameBillParticipantRecord(supabase, validatedInput),
  });
}
