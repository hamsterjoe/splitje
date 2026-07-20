import { z } from "zod";

import { parseRinggitInput } from "./parse-ringgit-input";

const POSTGRES_INTEGER_MAX =
    2_147_483_647;

const positiveIntegerInputSchema = z
    .union([
        z.number(),
        z.string(),
    ])
    .transform((value, context) => {
        if (
            typeof value === "number" &&
            Number.isInteger(value) &&
            value > 0 &&
            value <= POSTGRES_INTEGER_MAX
        ) {
            return value;
        }

        if (typeof value === "string") {
            const normalizedValue = value.trim();

            if (
                /^\d+$/.test(normalizedValue) &&
                normalizedValue.length <= 10
            ) {
                const parsedValue =
                    Number(normalizedValue);

                if (
                    Number.isInteger(parsedValue) &&
                    parsedValue > 0 &&
                    parsedValue <=
                    POSTGRES_INTEGER_MAX
                ) {
                    return parsedValue;
                }
            }
        }

        context.addIssue({
            code: "custom",
            message:
                "Quantity must be a positive whole number.",
        });

        return z.NEVER;
    });

const ringgitInputSchema = z
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

export const addBillItemInputSchema = z
    .object({
        billId: z.string().uuid({
            message: "Bill ID must be a valid UUID.",
        }),

        description: z
            .string({
                message: "Item description is required.",
            })
            .trim()
            .min(1, {
                message: "Enter an item description.",
            }),

        quantity: positiveIntegerInputSchema,

        unitPrice: ringgitInputSchema,
    })
    .strict()
    .transform(
        ({
            billId,
            description,
            quantity,
            unitPrice,
        }) => ({
            billId,
            description,
            quantity,
            unitPriceSen: unitPrice,
        }),
    );

export type AddBillItemInput = z.infer<
    typeof addBillItemInputSchema
>;