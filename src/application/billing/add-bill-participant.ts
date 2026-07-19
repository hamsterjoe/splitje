import { ZodError } from "zod";

import {
  addBillParticipantInputSchema,
  type AddBillParticipantInput,
} from "./validation/add-bill-participant-input";

export type AddBillParticipantRecordResult =
  | {
      success: true;
      participantId: string;
    }
  | {
      success: false;
    };

export interface AddBillParticipantDependencies {
  addBillParticipantRecord(
    input: AddBillParticipantInput,
  ): Promise<AddBillParticipantRecordResult>;
}

export interface AddBillParticipantValidationIssue {
  path: string;
  message: string;
}

export type AddBillParticipantResult =
  | {
      success: true;
      participantId: string;
    }
  | {
      success: false;
      error:
        | {
            type: "validation_error";
            issues:
              AddBillParticipantValidationIssue[];
          }
        | {
            type: "database_error";
            code: "ADD_BILL_PARTICIPANT_FAILED";
            message: string;
          };
    };

export async function addBillParticipant(
  input: unknown,
  dependencies: AddBillParticipantDependencies,
): Promise<AddBillParticipantResult> {
  let validatedInput: AddBillParticipantInput;

  try {
    validatedInput =
      addBillParticipantInputSchema.parse(input);
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

  const recordResult =
    await dependencies.addBillParticipantRecord(
      validatedInput,
    );

  if (!recordResult.success) {
    return {
      success: false,
      error: {
        type: "database_error",
        code: "ADD_BILL_PARTICIPANT_FAILED",
        message:
          "Unable to add this person. Please try again.",
      },
    };
  }

  return {
    success: true,
    participantId:
      recordResult.participantId,
  };
}