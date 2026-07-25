import { z } from "zod";

import { parseRinggitInput } from "./parse-ringgit-input";

const adjustmentAmountSchema = z
    .unknown()
    .transform(
        (value, context) => {
            const result =
                parseRinggitInput(
                    value,
                );

            if (!result.success) {
                context.addIssue({
                    code: "custom",
                    message:
                        result.message,
                });

                return z.NEVER;
            }

            return result.amountSen;
        },
    );

export const updateFixedBillAdjustmentInputSchema =
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

            label: z
                .string()
                .trim()
                .default(""),

            amount:
                adjustmentAmountSchema,
        })
        .strict()
        .transform(
            ({
                billId,
                adjustmentId,
                label,
                amount,
            }) => ({
                billId,
                adjustmentId,
                label,
                amountSen: amount,
            }),
        );

export type UpdateFixedBillAdjustmentInput =
    z.infer<
        typeof updateFixedBillAdjustmentInputSchema
    >;