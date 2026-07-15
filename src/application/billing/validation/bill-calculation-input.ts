import { z } from "zod";

import type { BillCalculationInput } from "../../../domain/billing/types";
import {
  idSchema,
  nonNegativeSenSchema,
  signedSenSchema,
} from "./primitives";

const itemAllocationSchema = z
  .object({
    participantId: idSchema,
    amountSen: nonNegativeSenSchema,
  })
  .strict();

const billItemSchema = z
  .object({
    itemId: idSchema,
    lineTotalSen: nonNegativeSenSchema,
    allocations: z.array(itemAllocationSchema),
  })
  .strict();

const adjustmentTypeSchema = z.enum([
  "discount",
  "service_charge",
  "tax",
  "rounding",
  "other",
]);

const adjustmentAllocationSchema = z
  .object({
    participantId: idSchema,
    amountSen: signedSenSchema,
  })
  .strict();

const billAdjustmentSchema = z
  .object({
    adjustmentId: idSchema,
    type: adjustmentTypeSchema,
    amountSen: signedSenSchema,
    allocations: z.array(
      adjustmentAllocationSchema,
    ),
  })
  .strict();

export const billCalculationInputSchema: z.ZodType<BillCalculationInput> =
  z
    .object({
      printedTotalSen: nonNegativeSenSchema,
      participantIds: z
        .array(idSchema)
        .min(1, {
          message:
            "A bill requires at least one participant.",
        }),
      items: z.array(billItemSchema),
      adjustments: z.array(
        billAdjustmentSchema,
      ),
    })
    .strict();

export function parseBillCalculationInput(
  input: unknown,
): BillCalculationInput {
  return billCalculationInputSchema.parse(input);
}