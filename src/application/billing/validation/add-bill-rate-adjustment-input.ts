import { z } from "zod";

import { parsePercentageInput } from "./parse-percentage-input";

const rateAdjustmentTypeSchema =
    z.enum([
        "discount",
        "service_charge",
        "tax",
        "other",
    ]);

const adjustmentPercentageSchema = z
    .unknown()
    .transform((value, context) => {
        const result =
            parsePercentageInput(value);

        if (!result.success) {
            context.addIssue({
                code: "custom",
                message: result.message,
            });

            return z.NEVER;
        }

        if (result.basisPoints === 0) {
            context.addIssue({
                code: "custom",
                message:
                    "Enter a percentage greater than 0.",
            });

            return z.NEVER;
        }

        return result.basisPoints;
    });

export const addBillRateAdjustmentInputSchema =
    z
        .object({
            billId: z.string().uuid({
                message:
                    "Bill ID must be a valid UUID.",
            }),

            type: rateAdjustmentTypeSchema,

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

            percentage:
                adjustmentPercentageSchema,
        })
        .strict()
        .transform(
            ({
                billId,
                type,
                label,
                percentage,
            }) => {
                const signedRateBasisPoints =
                    type === "discount"
                        ? -percentage
                        : percentage;

                return {
                    billId,
                    type,
                    label,
                    calculationMethod:
                        "rate" as const,
                    rateBasisPoints:
                        signedRateBasisPoints,
                    roundingMode:
                        "half_up" as const,
                    calculationBaseMode:
                        "item_subtotal" as const,
                    appliesToAllItems: true,
                };
            },
        );

export type AddBillRateAdjustmentInput =
    z.infer<
        typeof addBillRateAdjustmentInputSchema
    >;