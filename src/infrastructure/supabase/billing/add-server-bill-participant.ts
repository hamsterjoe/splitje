import "server-only";

import {
  addBillParticipant,
  type AddBillParticipantResult,
} from "../../../application/billing/add-bill-participant";
import { createServerSupabaseClient } from "../server";
import { addBillParticipantRecord } from "./add-bill-participant-record";

export async function addServerBillParticipant(
  input: unknown,
): Promise<AddBillParticipantResult> {
  const supabase =
    await createServerSupabaseClient();

  return addBillParticipant(input, {
    addBillParticipantRecord: (
      validatedInput,
    ) =>
      addBillParticipantRecord(
        supabase,
        validatedInput,
      ),
  });
}