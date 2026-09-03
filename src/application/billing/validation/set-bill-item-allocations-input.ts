import { z } from "zod";

export const setBillItemAllocationsInputSchema =
    z
        .object({
            billId: z.string().uuid({
                message:
                    "Bill ID must be a valid UUID.",
            }),

            itemId: z.string().uuid({
                message:
                    "Item ID must be a valid UUID.",
            }),

            participantIds: z
                .array(
                    z.string().uuid({
                        message:
                            "Participant IDs must be valid UUIDs.",
                    }),
                )
                .default([]),
        })
        .strict()
        .transform(
            ({
                billId,
                itemId,
                participantIds,
            }) => ({
                billId,
                itemId,
                participantIds: [
                    ...new Set(
                        participantIds,
                    ),
                ],
            }),
        );

export type SetBillItemAllocationsInput =
    z.infer<
        typeof setBillItemAllocationsInputSchema
    >;
