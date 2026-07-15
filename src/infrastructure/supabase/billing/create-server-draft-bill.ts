import "server-only";

import { ensureOwnerSession } from "../../../application/auth/ensure-owner-session";
import {
  createDraftBill,
  type CreateDraftBillResult,
} from "../../../application/billing/create-draft-bill";
import { createServerSupabaseClient } from "../server";
import { createDraftBillRecord } from "./create-draft-bill-record";

export async function createServerDraftBill(
  input: unknown,
): Promise<CreateDraftBillResult> {
  const supabase =
    await createServerSupabaseClient();

  return createDraftBill(input, {
    ensureOwnerSession: () =>
      ensureOwnerSession(supabase.auth),

    createDraftBillRecord: (
      validatedInput,
    ) =>
      createDraftBillRecord(
        supabase,
        validatedInput,
      ),
  });
}