import { z } from "zod";

const applicableItemIdsSchema = z
    .array(
        z.string().uuid({
            message:
                "Applicable item IDs must be valid UUIDs.",
        }),
    )
    .min(1, {
        message:
            "Select at least one applicable item.",
    })
    .superRefine(
        (itemIds, context) => {
            if (
                new Set(itemIds).size !==
                itemIds.length
            ) {
                context.addIssue({
                    code: "custom",
                    message:
                        "Applicable items must be unique.",
                });
            }
        },
    );

export const adjustmentItemScopeInputSchema =
    z
        .discriminatedUnion("scope", [
            z
                .object({
                    scope: z.literal(
                        "all_items",
                    ),

                    /*
                     * Stale selections may still arrive
                     * when the user switches back to all
                     * items. They are intentionally ignored.
                     */
                    applicableItemIds: z
                        .array(z.unknown())
                        .optional(),
                })
                .strict(),

            z
                .object({
                    scope: z.literal(
                        "selected_items",
                    ),

                    applicableItemIds:
                        applicableItemIdsSchema,
                })
                .strict(),
        ])
        .transform((input) => {
            if (
                input.scope ===
                "all_items"
            ) {
                return {
                    appliesToAllItems:
                        true as const,
                    applicableItemIds:
                        null,
                };
            }

            return {
                appliesToAllItems:
                    false as const,

                applicableItemIds: [
                    ...input.applicableItemIds,
                ].sort((left, right) =>
                    left.localeCompare(
                        right,
                    ),
                ),
            };
        });

export type AdjustmentItemScopeInput =
    z.infer<
        typeof adjustmentItemScopeInputSchema
    >;