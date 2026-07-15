import { ZodError } from "zod";

import { calculateBill } from "../../domain/billing/calculate-bill";
import { BillingDomainError } from "../../domain/billing/errors";
import type { BillCalculationResult } from "../../domain/billing/types";
import { parseBillCalculationInput } from "./validation/bill-calculation-input";

export interface ApplicationValidationIssue {
  path: string;
  message: string;
}

export type CalculateValidatedBillResult =
  | {
      success: true;
      data: BillCalculationResult;
    }
  | {
      success: false;
      error: {
        type: "validation_error";
        issues: ApplicationValidationIssue[];
      };
    }
  | {
      success: false;
      error: {
        type: "domain_error";
        code: string;
        message: string;
      };
    };

export function calculateValidatedBill(
  input: unknown,
): CalculateValidatedBillResult {
  try {
    const validatedInput =
      parseBillCalculationInput(input);

    const calculatedBill =
      calculateBill(validatedInput);

    return {
      success: true,
      data: calculatedBill,
    };
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

    if (error instanceof BillingDomainError) {
      return {
        success: false,
        error: {
          type: "domain_error",
          code: error.code,
          message: error.message,
        },
      };
    }

    throw error;
  }
}