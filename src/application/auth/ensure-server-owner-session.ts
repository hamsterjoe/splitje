import "server-only";

import { createServerSupabaseClient } from "../../infrastructure/supabase/server";
import {
  ensureOwnerSession,
  type EnsureOwnerSessionResult,
} from "./ensure-owner-session";

export async function ensureServerOwnerSession(): Promise<EnsureOwnerSessionResult> {
  const supabase =
    await createServerSupabaseClient();

  return ensureOwnerSession(supabase.auth);
}