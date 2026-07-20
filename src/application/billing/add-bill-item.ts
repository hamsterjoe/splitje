import { ZodError } from "zod";

import { BillingDomainError } from "../../domain/billing/errors";
import { calculateLineTotal } from "../../domain/billing/items/calculate-line-total";
import {
  addBillItemInputSchema,
  type AddBillItemInput,
} from "./validation/add-bill-item-input";

const POSTGRES_INTEGER_MAX =
  2_147_483_647;

export interface AddBillItemRecordInput {
  billId: string;
  description: string;
  quantity: number;
  unitPriceSen: number;
  lineTotalSen: number;
}

export type AddBillItemRecordResult =
  | {
    success: true;
    itemId: string;
  }
  | {
    success: false;
  };

export interface AddBillItemDependencies {
  addBillItemRecord(
    input: AddBillItemRecordInput,
  ): Promise<AddBillItemRecordResult>;
}

export interface AddBillItemValidationIssue {
  path: string;
  message: string;
}

export type AddBillItemResult =
  | {
    success: true;
    itemId: string;
  }
  | {
    success: false;
    error:
    | {
      type: "validation_error";
      issues:
      AddBillItemValidationIssue[];
    }
    | {
      type: "database_error";
      code: "ADD_BILL_ITEM_FAILED";
      message: string;
    };
  };

function lineTotalTooLargeResult():
  AddBillItemResult {
  return {
    success: false,
    error: {
      type: "validation_error",
      issues: [
        {
          path: "unitPrice",
          message: "Line total is too large.",
        },
      ],
    },
  };
}

export async function addBillItem(
  input: unknown,
  dependencies: AddBillItemDependencies,
): Promise<AddBillItemResult> {
  let validatedInput: AddBillItemInput;

  try {
    validatedInput =
      addBillItemInputSchema.parse(input);
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: {
          type: "validation_error",
          issues: error.issues.map((issue) => ({
            path: issue.path
              .map(String)
              .join("."),
            message: issue.message,
          })),
        },
      };
    }

    throw error;
  }

  let lineTotalSen: number;

  try {
    const lineTotal = calculateLineTotal({
      quantity: validatedInput.quantity,
      unitPriceSen:
        validatedInput.unitPriceSen,
    });

    lineTotalSen =
      lineTotal.effectiveLineTotalSen;
  } catch (error) {
    if (
      error instanceof BillingDomainError &&
      error.code === "UNSAFE_CALCULATION"
    ) {
      return lineTotalTooLargeResult();
    }

    throw error;
  }

  if (
    lineTotalSen >
    POSTGRES_INTEGER_MAX
  ) {
    return lineTotalTooLargeResult();
  }

  const recordResult =
    await dependencies.addBillItemRecord({
      billId: validatedInput.billId,
      description:
        validatedInput.description,
      quantity: validatedInput.quantity,
      unitPriceSen:
        validatedInput.unitPriceSen,
      lineTotalSen,
    });

  if (!recordResult.success) {
    return {
      success: false,
      error: {
        type: "database_error",
        code: "ADD_BILL_ITEM_FAILED",
        message:
          "Unable to add this item. Please try again.",
      },
    };
  }

  return {
    success: true,
    itemId: recordResult.itemId,
  };
}