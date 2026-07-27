import { z } from "zod";

export const renameBillParticipantInputSchema = z
  .object({
    billId: z.string().uuid({
      message: "Bill ID must be a valid UUID.",
    }),

    participantId: z.string().uuid({
      message: "Participant ID must be a valid UUID.",
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
        message: "Participant name cannot exceed 100 characters.",
      }),
  })
  .strict();

export type RenameBillParticipantInput = z.infer<
  typeof renameBillParticipantInputSchema
>;
