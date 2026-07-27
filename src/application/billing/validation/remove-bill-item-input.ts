import { z } from "zod";

export const removeBillItemInputSchema = z
  .object({
    billId: z.string().uuid({
      message: "Bill ID must be a valid UUID.",
    }),

    itemId: z.string().uuid({
      message: "Item ID must be a valid UUID.",
    }),
  })
  .strict();

export type RemoveBillItemInput = z.infer<typeof removeBillItemInputSchema>;
