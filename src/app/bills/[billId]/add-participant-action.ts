"use server";

import { revalidatePath } from "next/cache";

import { addServerBillParticipant } from "@/infrastructure/supabase/billing/add-server-bill-participant";

import type {
  AddParticipantActionState,
  AddParticipantField,
} from "./add-participant-action-state";

function mapFieldErrors(
  issues: Array<{
    path: string;
    message: string;
  }>,
): Partial<
  Record<AddParticipantField, string>
> {
  const fieldErrors: Partial<
    Record<AddParticipantField, string>
  > = {};

  for (const issue of issues) {
    if (issue.path === "displayName") {
      fieldErrors.displayName ??=
        issue.message;
    }
  }

  return fieldErrors;
}

export async function addParticipantAction(
  _previousState: AddParticipantActionState,
  formData: FormData,
): Promise<AddParticipantActionState> {
  const billId = formData.get("billId");
  const displayName =
    formData.get("displayName");

  const result =
    await addServerBillParticipant({
      billId: billId ?? undefined,
      displayName: displayName ?? undefined,
    });

  if (!result.success) {
    if (
      result.error.type === "validation_error"
    ) {
      const fieldErrors = mapFieldErrors(
        result.error.issues,
      );

      return {
        status: "error",
        message:
          Object.keys(fieldErrors).length > 0
            ? "Check the highlighted field and try again."
            : "Unable to add this person.",
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
      message:
        "Unable to refresh this bill.",
      fieldErrors: {},
    };
  }

  revalidatePath(`/bills/${billId}`);

  return {
    status: "success",
    message: "Person added.",
    fieldErrors: {},
  };
}