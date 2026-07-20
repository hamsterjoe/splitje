import { z } from "zod";

import { parseRinggitInput } from "./parse-ringgit-input";

const fixedAdjustmentTypeSchema =
    z.enum([
        "discount",
        "service_charge",
        "tax",
        "other",
    ]);

const adjustmentAmountSchema = z
    .unknown()
    .transform((value, context) => {
        const result = parseRinggitInput(value);

        if (!result.success) {
            context.addIssue({
                code: "custom",
                message: result.message,
            });

            return z.NEVER;
        }

        return result.amountSen;
    });

export const addBillAdjustmentInputSchema =
    z
        .object({
            billId: z.string().uuid({
                message:
                    "Bill ID must be a valid UUID.",
            }),

            type: fixedAdjustmentTypeSchema,

            label: z
                .string({
                    message:
                        "Adjustment label is required.",
                })
                .trim()
                .min(1, {
                    message:
                        "Enter an adjustment label.",
                }),

            amount: adjustmentAmountSchema,
        })
        .strict()
        .transform(
            ({
                billId,
                type,
                label,
                amount,
            }) => {
                const signedAmountSen =
                    type === "discount" &&
                        amount !== 0
                        ? -amount
                        : amount;

                return {
                    billId,
                    type,
                    label,
                    amountSen: signedAmountSen,
                };
            },
        );

export type AddBillAdjustmentInput =
    z.infer<
        typeof addBillAdjustmentInputSchema
    >;