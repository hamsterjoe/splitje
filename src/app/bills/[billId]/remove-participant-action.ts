"use server";

import { revalidatePath } from "next/cache";

import { removeServerBillParticipant } from "@/infrastructure/supabase/billing/remove-server-bill-participant";

import type { RemoveParticipantActionState } from "./remove-participant-action-state";

export async function removeParticipantAction(
  _previousState: RemoveParticipantActionState,
  formData: FormData,
): Promise<RemoveParticipantActionState> {
  const billId = formData.get("billId");
  const participantId = formData.get("participantId");

  const result = await removeServerBillParticipant({
    billId: billId ?? undefined,
    participantId: participantId ?? undefined,
  });

  if (!result.success) {
    return {
      status: "error",
      message:
        result.error.type === "database_error"
          ? result.error.message
          : "Unable to remove this person.",
    };
  }

  if (typeof billId !== "string") {
    return {
      status: "error",
      message: "Unable to refresh this bill.",
    };
  }

  revalidatePath(`/bills/${billId}`);

  return {
    status: "success",
    message: null,
  };
}
