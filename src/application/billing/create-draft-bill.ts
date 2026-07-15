import { ZodError } from "zod";

import type { EnsureOwnerSessionResult } from "../auth/ensure-owner-session";
import {
  createDraftBillInputSchema,
  type CreateDraftBillInput,
} from "./validation/create-draft-bill-input";

export type CreateDraftBillRecordResult =
  | {
      success: true;
      billId: string;
      ownerParticipantId: string;
    }
  | {
      success: false;
    };

export interface CreateDraftBillDependencies {
  ensureOwnerSession(): Promise<EnsureOwnerSessionResult>;

  createDraftBillRecord(
    input: CreateDraftBillInput,
  ): Promise<CreateDraftBillRecordResult>;
}

export interface CreateDraftBillValidationIssue {
  path: string;
  message: string;
}

export type CreateDraftBillResult =
  | {
      success: true;
      billId: string;
      ownerParticipantId: string;
      createdAnonymousSession: boolean;
    }
  | {
      success: false;
      error:
        | {
            type: "validation_error";
            issues: CreateDraftBillValidationIssue[];
          }
        | {
            type: "authentication_error";
            code: "ANONYMOUS_SIGN_IN_FAILED";
            message: string;
          }
        | {
            type: "database_error";
            code: "CREATE_DRAFT_BILL_FAILED";
            message: string;
          };
    };

    export async function createDraftBill(
        input: unknown,
        dependencies: CreateDraftBillDependencies,
      ): Promise<CreateDraftBillResult> {
        let validatedInput: CreateDraftBillInput;
      
        try {
          validatedInput =
            createDraftBillInputSchema.parse(input);
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
      
        const ownerSession =
          await dependencies.ensureOwnerSession();
      
        if (!ownerSession.success) {
          return {
            success: false,
            error: {
              type: "authentication_error",
              code: ownerSession.error.code,
              message: ownerSession.error.message,
            },
          };
        }
      
        const recordResult =
          await dependencies.createDraftBillRecord(
            validatedInput,
          );
      
        if (!recordResult.success) {
          return {
            success: false,
            error: {
              type: "database_error",
              code: "CREATE_DRAFT_BILL_FAILED",
              message:
                "Unable to create the bill. Please try again.",
            },
          };
        }
      
        return {
          success: true,
          billId: recordResult.billId,
          ownerParticipantId:
            recordResult.ownerParticipantId,
          createdAnonymousSession:
            ownerSession.createdAnonymousSession,
        };
      }