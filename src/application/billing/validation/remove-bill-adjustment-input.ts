import { z } from "zod";

export const removeBillAdjustmentInputSchema =
    z
        .object({
            billId: z.string().uuid({
                message:
                    "Bill ID must be a valid UUID.",
            }),

            adjustmentId:
                z.string().uuid({
                    message:
                        "Adjustment ID must be a valid UUID.",
                }),
        })
        .strict();

export type RemoveBillAdjustmentInput =
    z.infer<
        typeof removeBillAdjustmentInputSchema
    >;