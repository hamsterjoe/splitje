import {
    describe,
    expect,
    it,
} from "vitest";

import { adjustmentItemScopeInputSchema } from "./adjustment-item-scope-input";

const itemA =
    "24e17267-c45e-47aa-ad46-87ea73e0c0ad";

const itemB =
    "ef14c672-a698-4912-83c4-16545f64b8e2";

describe(
    "adjustmentItemScopeInputSchema",
    () => {
        it("normalizes all-item scope", () => {
            expect(
                adjustmentItemScopeInputSchema.parse(
                    {
                        scope: "all_items",
                    },
                ),
            ).toEqual({
                appliesToAllItems: true,
                applicableItemIds: null,
            });
        });

        it("ignores stale selections for all-item scope", () => {
            expect(
                adjustmentItemScopeInputSchema.parse(
                    {
                        scope: "all_items",
                        applicableItemIds: [
                            itemA,
                        ],
                    },
                ),
            ).toEqual({
                appliesToAllItems: true,
                applicableItemIds: null,
            });
        });

        it("canonicalizes selected item IDs", () => {
            expect(
                adjustmentItemScopeInputSchema.parse(
                    {
                        scope:
                            "selected_items",
                        applicableItemIds: [
                            itemB,
                            itemA,
                        ],
                    },
                ),
            ).toEqual({
                appliesToAllItems: false,
                applicableItemIds: [
                    itemA,
                    itemB,
                ],
            });
        });

        it("rejects an empty selected-item scope", () => {
            const result =
                adjustmentItemScopeInputSchema.safeParse(
                    {
                        scope:
                            "selected_items",
                        applicableItemIds: [],
                    },
                );

            expect(result.success).toBe(
                false,
            );

            if (result.success) {
                throw new Error(
                    "Expected validation to fail.",
                );
            }

            expect(
                result.error.issues,
            ).toContainEqual(
                expect.objectContaining({
                    path: [
                        "applicableItemIds",
                    ],
                    message:
                        "Select at least one applicable item.",
                }),
            );
        });

        it("rejects duplicate item IDs", () => {
            const result =
                adjustmentItemScopeInputSchema.safeParse(
                    {
                        scope:
                            "selected_items",
                        applicableItemIds: [
                            itemA,
                            itemA,
                        ],
                    },
                );

            expect(result.success).toBe(
                false,
            );

            if (result.success) {
                throw new Error(
                    "Expected validation to fail.",
                );
            }

            expect(
                result.error.issues,
            ).toContainEqual(
                expect.objectContaining({
                    path: [
                        "applicableItemIds",
                    ],
                    message:
                        "Applicable items must be unique.",
                }),
            );
        });

        it("rejects an invalid item ID", () => {
            const result =
                adjustmentItemScopeInputSchema.safeParse(
                    {
                        scope:
                            "selected_items",
                        applicableItemIds: [
                            "not-a-uuid",
                        ],
                    },
                );

            expect(result.success).toBe(
                false,
            );

            if (result.success) {
                throw new Error(
                    "Expected validation to fail.",
                );
            }

            expect(
                result.error.issues.some(
                    (issue) =>
                        issue.path[0] ===
                        "applicableItemIds",
                ),
            ).toBe(true);
        });

        it("rejects an unknown scope", () => {
            const result =
                adjustmentItemScopeInputSchema.safeParse(
                    {
                        scope:
                            "some_items",
                        applicableItemIds: [
                            itemA,
                        ],
                    },
                );

            expect(result.success).toBe(
                false,
            );
        });
    },
);