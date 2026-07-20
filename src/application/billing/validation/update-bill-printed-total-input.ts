import { z } from "zod";

import { parseRinggitInput } from "./parse-ringgit-input";

const rowVersionSchema = z
    .union([
        z.number(),
        z.string(),
    ])
    .transform((value, context) => {
        if (
            typeof value === "number" &&
            Number.isSafeInteger(value) &&
            value >= 0
        ) {
            return value;
        }

        if (typeof value === "string") {
            const normalizedValue = value.trim();

            if (
                /^\d+$/.test(normalizedValue) &&
                normalizedValue.length <= 16
            ) {
                const parsedValue =
                    Number(normalizedValue);

                if (
                    Number.isSafeInteger(
                        parsedValue,
                    ) &&
                    parsedValue >= 0
                ) {
                    return parsedValue;
                }
            }
        }

        context.addIssue({
            code: "custom",
            message:
                "Bill version must be a non-negative safe integer.",
        });

        return z.NEVER;
    });

const printedTotalSchema = z
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

export const updateBillPrintedTotalInputSchema =
    z
        .object({
            billId: z.string().uuid({
                message:
                    "Bill ID must be a valid UUID.",
            }),

            expectedRowVersion: rowVersionSchema,

            printedTotal: printedTotalSchema,
        })
        .strict()
        .transform(
            ({
                billId,
                expectedRowVersion,
                printedTotal,
            }) => ({
                billId,
                expectedRowVersion,
                printedTotalSen: printedTotal,
            }),
        );

export type UpdateBillPrintedTotalInput =
    z.infer<
        typeof updateBillPrintedTotalInputSchema
    >;