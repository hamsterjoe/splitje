import { z } from "zod";

export const addBillParticipantInputSchema =
  z.object({
    billId: z.string().uuid({
      message: "Bill ID must be a valid UUID.",
    }),

    displayName: z
      .string({
        message: "Participant name is required.",
      })
      .trim()
      .min(1, {
        message: "Enter a participant name.",
      })
      .max(100, {
        message:
          "Participant name cannot exceed 100 characters.",
      }),
  });

export type AddBillParticipantInput =
  z.infer<
    typeof addBillParticipantInputSchema
  >;