import { z } from "zod";

export const safeIntegerSchema = z
  .number()
  .refine(Number.isSafeInteger, {
    message: "Value must be a safe integer.",
  });

export const signedSenSchema = safeIntegerSchema;

export const nonNegativeSenSchema =
  safeIntegerSchema.refine(
    (value) => value >= 0,
    {
      message:
        "Money must be non-negative integer sen.",
    },
  );

export const idSchema = z
  .string()
  .min(1, {
    message: "ID cannot be empty.",
  })
  .refine(
    (value) => value.trim().length > 0,
    {
      message: "ID cannot contain only whitespace.",
    },
  )
  .refine(
    (value) => value === value.trim(),
    {
      message:
        "ID cannot contain surrounding whitespace.",
    },
  );