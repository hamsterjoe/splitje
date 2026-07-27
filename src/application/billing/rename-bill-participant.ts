import { ZodError } from "zod";

import {
  renameBillParticipantInputSchema,
  type RenameBillParticipantInput,
} from "./validation/rename-bill-participant-input";

export type RenameBillParticipantRecordResult =
  | {
      success: true;
      participantId: string;
    }
  | {
      success: false;
    };

export interface RenameBillParticipantDependencies {
  renameBillParticipantRecord(
    input: RenameBillParticipantInput,
  ): Promise<RenameBillParticipantRecordResult>;
}

export interface RenameBillParticipantValidationIssue {
  path: string;
  message: string;
}

export type RenameBillParticipantResult =
  | {
      success: true;
      participantId: string;
    }
  | {
      success: false;
      error:
        | {
            type: "validation_error";
            issues: RenameBillParticipantValidationIssue[];
          }
        | {
            type: "database_error";
            code: "RENAME_BILL_PARTICIPANT_FAILED";
            message: string;
          };
    };

export async function renameBillParticipant(
  input: unknown,
  dependencies: RenameBillParticipantDependencies,
): Promise<RenameBillParticipantResult> {
  let validatedInput: RenameBillParticipantInput;

  try {
    validatedInput = renameBillParticipantInputSchema.parse(input);
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

  const recordResult =
    await dependencies.renameBillParticipantRecord(validatedInput);

  if (!recordResult.success) {
    return {
      success: false,
      error: {
        type: "database_error",
        code: "RENAME_BILL_PARTICIPANT_FAILED",
        message: "Unable to rename this person. Please try again.",
      },
    };
  }

  return {
    success: true,
    participantId: recordResult.participantId,
  };
}
