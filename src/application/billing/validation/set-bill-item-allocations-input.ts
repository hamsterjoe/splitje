import { z } from "zod";

import { parsePercentageInput } from "./parse-percentage-input";
import { parseRinggitInput } from "./parse-ringgit-input";

const splitModeSchema =
    z.enum([
        "equal",
        "quantity",
        "percentage",
        "custom",
    ]);

const shareInputSchema =
    z.object({
        participantId: z.string().uuid({
            message:
                "Participant IDs must be valid UUIDs.",
        }),

        value: z.unknown().optional(),
    });

export const setBillItemAllocationsInputSchema =
    z
        .object({
            billId: z.string().uuid({
                message:
                    "Bill ID must be a valid UUID.",
            }),

            itemId: z.string().uuid({
                message:
                    "Item ID must be a valid UUID.",
            }),

            mode: splitModeSchema,

            shares: z
                .array(shareInputSchema)
                .default([]),
        })
        .strict()
        .transform((input, context) => {
            const seenParticipantIds =
                new Set<string>();

            const uniqueShares = [];

            for (const share of input.shares) {
                if (
                    !seenParticipantIds.has(
                        share.participantId,
                    )
                ) {
                    seenParticipantIds.add(
                        share.participantId,
                    );
                    uniqueShares.push(share);
                }
            }

            let hasIssue = false;

            const parsedShares =
                uniqueShares.map((share, index) => {
                    const valuePath = [
                        "shares",
                        index,
                        "value",
                    ];

                    const emptyShare = {
                        participantId:
                            share.participantId,
                        quantityShare: null,
                        percentageBasisPoints:
                            null,
                        amountSen: null,
                    };

                    if (input.mode === "quantity") {
                        const rawValue =
                            typeof share.value ===
                            "string"
                                ? share.value.trim()
                                : "";

                        if (
                            !/^\d{1,9}$/.test(
                                rawValue,
                            )
                        ) {
                            hasIssue = true;
                            context.addIssue({
                                code: "custom",
                                message:
                                    "Enter a whole-number quantity greater than zero.",
                                path: valuePath,
                            });

                            return emptyShare;
                        }

                        return {
                            ...emptyShare,
                            quantityShare:
                                Number(rawValue),
                        };
                    }

                    if (input.mode === "percentage") {
                        const result =
                            parsePercentageInput(
                                share.value,
                            );

                        if (!result.success) {
                            hasIssue = true;
                            context.addIssue({
                                code: "custom",
                                message:
                                    result.message,
                                path: valuePath,
                            });

                            return emptyShare;
                        }

                        if (result.basisPoints === 0) {
                            hasIssue = true;
                            context.addIssue({
                                code: "custom",
                                message:
                                    "Enter a percentage greater than 0.",
                                path: valuePath,
                            });

                            return emptyShare;
                        }

                        return {
                            ...emptyShare,
                            percentageBasisPoints:
                                result.basisPoints,
                        };
                    }

                    if (input.mode === "custom") {
                        const result =
                            parseRinggitInput(
                                share.value,
                            );

                        if (!result.success) {
                            hasIssue = true;
                            context.addIssue({
                                code: "custom",
                                message:
                                    result.message,
                                path: valuePath,
                            });

                            return emptyShare;
                        }

                        if (result.amountSen === 0) {
                            hasIssue = true;
                            context.addIssue({
                                code: "custom",
                                message:
                                    "Enter an amount greater than zero.",
                                path: valuePath,
                            });

                            return emptyShare;
                        }

                        return {
                            ...emptyShare,
                            amountSen:
                                result.amountSen,
                        };
                    }

                    return emptyShare;
                });

            if (
                input.mode === "percentage" &&
                parsedShares.length > 0 &&
                !hasIssue
            ) {
                const totalBasisPoints =
                    parsedShares.reduce(
                        (sum, share) =>
                            sum +
                            (share.percentageBasisPoints ??
                                0),
                        0,
                    );

                if (totalBasisPoints !== 10_000) {
                    hasIssue = true;
                    context.addIssue({
                        code: "custom",
                        message:
                            "Percentages must add up to exactly 100%.",
                        path: ["shares"],
                    });
                }
            }

            if (hasIssue) {
                return z.NEVER;
            }

            return {
                billId: input.billId,
                itemId: input.itemId,
                mode: input.mode,
                shares: parsedShares,
            };
        });

export type SetBillItemAllocationsInput =
    z.infer<
        typeof setBillItemAllocationsInputSchema
    >;
