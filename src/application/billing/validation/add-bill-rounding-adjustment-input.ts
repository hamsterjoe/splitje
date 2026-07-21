import { z } from "zod";

import { parseRinggitInput } from "./parse-ringgit-input";

const roundingDirectionSchema =
    z.enum([
        "add",
        "subtract",
    ]);

const roundingAmountSchema = z
    .unknown()
    .transform((value, context) => {
        const result =
            parseRinggitInput(value);

        if (!result.success) {
            context.addIssue({
                code: "custom",
                message: result.message,
            });

            return z.NEVER;
        }

        if (result.amountSen === 0) {
            context.addIssue({
                code: "custom",
                message:
                    "Enter a rounding amount greater than zero.",
            });

            return z.NEVER;
        }

        return result.amountSen;
    });

export const addBillRoundingAdjustmentInputSchema =
    z
        .object({
            billId: z.string().uuid({
                message:
                    "Bill ID must be a valid UUID.",
            }),

            direction:
                roundingDirectionSchema,

            amount: roundingAmountSchema,
        })
        .strict()
        .transform(
            ({
                billId,
                direction,
                amount,
            }) => ({
                billId,
                type:
                    "rounding" as const,
                label: "Rounding",
                calculationMethod:
                    "fixed" as const,
                amountSen:
                    direction ===
                        "subtract"
                        ? -amount
                        : amount,
            }),
        );

export type AddBillRoundingAdjustmentInput =
    z.infer<
        typeof addBillRoundingAdjustmentInputSchema
    >;