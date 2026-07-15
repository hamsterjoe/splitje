import { z } from "zod";

import { nonNegativeSenSchema } from "./primitives";

const optionalMerchantNameSchema = z
  .preprocess(
    (value) => {
      if (
        typeof value === "string" &&
        value.trim().length === 0
      ) {
        return null;
      }

      return value;
    },
    z
      .string()
      .trim()
      .min(1)
      .max(200)
      .nullable()
      .optional(),
  )
  .transform((value) => value ?? null);

export const createDraftBillInputSchema = z
  .object({
    ownerDisplayName: z
      .string()
      .trim()
      .min(1, {
        message: "Your name is required.",
      })
      .max(100, {
        message:
          "Your name cannot exceed 100 characters.",
      })
      .default("You"),

    merchantName: optionalMerchantNameSchema,

    printedTotalSen:
      nonNegativeSenSchema.default(0),
  })
  .strict();

export type CreateDraftBillInput = z.infer<
  typeof createDraftBillInputSchema
>;