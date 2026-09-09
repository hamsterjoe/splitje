import { z } from "zod";

export const removeBillParticipantInputSchema = z
    .object({
        billId: z.string().uuid({
            message:
                "Bill ID must be a valid UUID.",
        }),

        participantId: z.string().uuid({
            message:
                "Participant ID must be a valid UUID.",
        }),
    })
    .strict();

export type RemoveBillParticipantInput = z.infer<
    typeof removeBillParticipantInputSchema
>;
