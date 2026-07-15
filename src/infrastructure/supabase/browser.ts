"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";
import { getPublicSupabaseEnv } from "./env";

export function createBrowserSupabaseClient() {
  const environment = getPublicSupabaseEnv();

  return createBrowserClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}