import { z } from "zod";

import { adjustmentItemScopeInputSchema } from "./adjustment-item-scope-input";
import { getDefaultBillAdjustmentLabel } from "./get-default-bill-adjustment-label";
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
                .string()
                .trim()
                .default(""),

            percentage:
                adjustmentPercentageSchema,

            itemScope:
                adjustmentItemScopeInputSchema
                    .optional(),
        })
        .strict()
        .transform(
            ({
                billId,
                type,
                label,
                percentage,
                itemScope,
            }) => {
                const signedRateBasisPoints =
                    type === "discount"
                        ? -percentage
                        : percentage;

                const resolvedLabel =
                    label.length > 0
                        ? label
                        : getDefaultBillAdjustmentLabel(
                              type,
                          );

                const normalizedScope =
                    itemScope ?? {
                        appliesToAllItems:
                            true as const,
                        applicableItemIds:
                            null,
                    };

                return {
                    billId,
                    type,
                    label: resolvedLabel,
                    calculationMethod:
                        "rate" as const,
                    rateBasisPoints:
                        signedRateBasisPoints,
                    roundingMode:
                        "half_up" as const,
                    calculationBaseMode:
                        "item_subtotal" as const,
                    appliesToAllItems:
                        normalizedScope
                            .appliesToAllItems,
                    applicableItemIds:
                        normalizedScope
                            .applicableItemIds,
                };
            },
        );

export type AddBillRateAdjustmentInput =
    z.infer<
        typeof addBillRateAdjustmentInputSchema
    >;