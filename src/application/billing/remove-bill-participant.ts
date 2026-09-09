import { ZodError } from "zod";

import {
    removeBillParticipantInputSchema,
    type RemoveBillParticipantInput,
} from "./validation/remove-bill-participant-input";

export type RemoveBillParticipantRecordResult =
    | {
        success: true;
        participantId: string;
    }
    | {
        success: false;
    };

export interface RemoveBillParticipantDependencies {
    removeBillParticipantRecord(
        input: RemoveBillParticipantInput,
    ): Promise<RemoveBillParticipantRecordResult>;
}

export interface RemoveBillParticipantValidationIssue {
    path: string;
    message: string;
}

export type RemoveBillParticipantResult =
    | {
        success: true;
        participantId: string;
    }
    | {
        success: false;
        error:
            | {
                type:
                    "validation_error";
                issues:
                    RemoveBillParticipantValidationIssue[];
            }
            | {
                type:
                    "database_error";
                code:
                    "REMOVE_BILL_PARTICIPANT_FAILED";
                message: string;
            };
    };

export async function removeBillParticipant(
    input: unknown,
    dependencies:
        RemoveBillParticipantDependencies,
): Promise<RemoveBillParticipantResult> {
    let validatedInput:
        RemoveBillParticipantInput;

    try {
        validatedInput =
            removeBillParticipantInputSchema.parse(
                input,
            );
    } catch (error) {
        if (error instanceof ZodError) {
            return {
                success: false,
                error: {
                    type:
                        "validation_error",
                    issues:
                        error.issues.map(
                            (issue) => ({
                                path: issue.path
                                    .map(String)
                                    .join("."),
                                message:
                                    issue.message,
                            }),
                        ),
                },
            };
        }

        throw error;
    }

    const recordResult =
        await dependencies
            .removeBillParticipantRecord(
                validatedInput,
            );

    if (!recordResult.success) {
        return {
            success: false,
            error: {
                type:
                    "database_error",
                code:
                    "REMOVE_BILL_PARTICIPANT_FAILED",
                message:
                    "Unable to remove this person. Please try again.",
            },
        };
    }

    return {
        success: true,
        participantId:
            recordResult.participantId,
    };
}
