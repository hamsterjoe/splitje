import { z } from "zod";

import { adjustmentItemScopeInputSchema } from "./adjustment-item-scope-input";
import { parsePercentageInput } from "./parse-percentage-input";

const adjustmentPercentageSchema = z
    .unknown()
    .transform(
        (value, context) => {
            const result =
                parsePercentageInput(
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

            if (
                result.basisPoints ===
                0
            ) {
                context.addIssue({
                    code: "custom",
                    message:
                        "Enter a percentage greater than 0.",
                });

                return z.NEVER;
            }

            return result.basisPoints;
        },
    );

export const updateBillRateAdjustmentInputSchema =
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

            percentage:
                adjustmentPercentageSchema,

            itemScope:
                adjustmentItemScopeInputSchema,
        })
        .strict()
        .transform(
            ({
                billId,
                adjustmentId,
                label,
                percentage,
                itemScope,
            }) => ({
                billId,
                adjustmentId,
                label,
                rateBasisPoints:
                    percentage,
                appliesToAllItems:
                    itemScope
                        .appliesToAllItems,
                applicableItemIds:
                    itemScope
                        .applicableItemIds,
            }),
        );

export type UpdateBillRateAdjustmentInput =
    z.infer<
        typeof updateBillRateAdjustmentInputSchema
    >;