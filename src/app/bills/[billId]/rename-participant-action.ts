"use server";

import { revalidatePath } from "next/cache";

import { renameServerBillParticipant } from "@/infrastructure/supabase/billing/rename-server-bill-participant";

import type {
  RenameParticipantActionState,
  RenameParticipantField,
} from "./rename-participant-action-state";

function mapFieldErrors(
  issues: Array<{
    path: string;
    message: string;
  }>,
): Partial<Record<RenameParticipantField, string>> {
  const fieldErrors: Partial<Record<RenameParticipantField, string>> = {};

  for (const issue of issues) {
    if (issue.path === "displayName") {
      fieldErrors.displayName ??= issue.message;
    }
  }

  return fieldErrors;
}

export async function renameParticipantAction(
  _previousState: RenameParticipantActionState,
  formData: FormData,
): Promise<RenameParticipantActionState> {
  const billId = formData.get("billId");
  const participantId = formData.get("participantId");
  const displayName = formData.get("displayName");

  const result = await renameServerBillParticipant({
    billId: billId ?? undefined,
    participantId: participantId ?? undefined,
    displayName: displayName ?? undefined,
  });

  if (!result.success) {
    if (result.error.type === "validation_error") {
      const fieldErrors = mapFieldErrors(result.error.issues);

      return {
        status: "error",
        message:
          Object.keys(fieldErrors).length > 0
            ? null
            : "Unable to rename this person.",
        fieldErrors,
      };
    }

    return {
      status: "error",
      message: result.error.message,
      fieldErrors: {},
    };
  }

  if (typeof billId !== "string") {
    return {
      status: "error",
      message: "Unable to refresh this bill.",
      fieldErrors: {},
    };
  }

  revalidatePath(`/bills/${billId}`);

  return {
    status: "success",
    message: null,
    fieldErrors: {},
  };
}
