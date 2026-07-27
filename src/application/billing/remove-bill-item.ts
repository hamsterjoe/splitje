import { ZodError } from "zod";

import {
  removeBillItemInputSchema,
  type RemoveBillItemInput,
} from "./validation/remove-bill-item-input";

export type RemoveBillItemRecordResult =
  | {
      success: true;
      itemId: string;
    }
  | {
      success: false;
    };

export interface RemoveBillItemDependencies {
  removeBillItemRecord(
    input: RemoveBillItemInput,
  ): Promise<RemoveBillItemRecordResult>;
}

export interface RemoveBillItemValidationIssue {
  path: string;
  message: string;
}

export type RemoveBillItemResult =
  | {
      success: true;
      itemId: string;
    }
  | {
      success: false;
      error:
        | {
            type: "validation_error";
            issues: RemoveBillItemValidationIssue[];
          }
        | {
            type: "database_error";
            code: "REMOVE_BILL_ITEM_FAILED";
            message: string;
          };
    };

export async function removeBillItem(
  input: unknown,
  dependencies: RemoveBillItemDependencies,
): Promise<RemoveBillItemResult> {
  let validatedInput: RemoveBillItemInput;

  try {
    validatedInput = removeBillItemInputSchema.parse(input);
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: {
          type: "validation_error",
          issues: error.issues.map((issue) => ({
            path: issue.path.map(String).join("."),
            message: issue.message,
          })),
        },
      };
    }

    throw error;
  }

  const recordResult = await dependencies.removeBillItemRecord(validatedInput);

  if (!recordResult.success) {
    return {
      success: false,
      error: {
        type: "database_error",
        code: "REMOVE_BILL_ITEM_FAILED",
        message: "Unable to remove this item. Please try again.",
      },
    };
  }

  return {
    success: true,
    itemId: recordResult.itemId,
  };
}
