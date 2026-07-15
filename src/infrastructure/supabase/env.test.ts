import { describe, expect, it } from "vitest";

import { parsePublicSupabaseEnv } from "./env";

describe("parsePublicSupabaseEnv", () => {
  it("accepts valid public Supabase configuration", () => {
    const result = parsePublicSupabaseEnv({
      NEXT_PUBLIC_SUPABASE_URL:
        "https://example-project.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        "sb_publishable_example",
    });

    expect(result).toEqual({
      NEXT_PUBLIC_SUPABASE_URL:
        "https://example-project.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        "sb_publishable_example",
    });
  });

  it("rejects a missing project URL", () => {
    expect(() =>
      parsePublicSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
          "sb_publishable_example",
      }),
    ).toThrow();
  });

  it("rejects an invalid project URL", () => {
    expect(() =>
      parsePublicSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL:
          "not-a-valid-url",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
          "sb_publishable_example",
      }),
    ).toThrow();
  });

  it("rejects a blank publishable key", () => {
    expect(() =>
      parsePublicSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL:
          "https://example-project.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      }),
    ).toThrow();
  });
});