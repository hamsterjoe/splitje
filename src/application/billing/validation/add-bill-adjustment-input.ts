import { z } from "zod";

import { parseRinggitInput } from "./parse-ringgit-input";
import { getDefaultBillAdjustmentLabel } from "./get-default-bill-adjustment-label";

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
                .string()
                .trim()
                .default(""),

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

                const resolvedLabel =
                    label.length > 0
                        ? label
                        : getDefaultBillAdjustmentLabel(
                            type,
                        );

                return {
                    billId,
                    type,
                    label: resolvedLabel,
                    amountSen: signedAmountSen,
                };
            },
        );

export type AddBillAdjustmentInput =
    z.infer<
        typeof addBillAdjustmentInputSchema
    >;