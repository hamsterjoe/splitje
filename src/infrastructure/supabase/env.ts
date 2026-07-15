import { z } from "zod";

const publicSupabaseEnvSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z
      .string()
      .url()
      .refine(
        (value) => value.startsWith("https://"),
        {
          message:
            "Supabase URL must use HTTPS.",
        },
      ),

    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
      .string()
      .min(1, {
        message:
          "Supabase publishable key is required.",
      }),
  })
  .strict();

export type PublicSupabaseEnv = z.infer<
  typeof publicSupabaseEnvSchema
>;

export function parsePublicSupabaseEnv(
  input: unknown,
): PublicSupabaseEnv {
  return publicSupabaseEnvSchema.parse(input);
}

export function getPublicSupabaseEnv(): PublicSupabaseEnv {
  return parsePublicSupabaseEnv({
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL,

    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}