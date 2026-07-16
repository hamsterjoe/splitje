"use server";

import { redirect } from "next/navigation";

import { createServerDraftBill } from "@/infrastructure/supabase/billing/create-server-draft-bill";

import type {
  CreateBillActionState,
  CreateBillField,
} from "./create-bill-action-state";

function mapFieldErrors(
  issues: Array<{
    path: string;
    message: string;
  }>,
): Partial<Record<CreateBillField, string>> {
  const fieldErrors: Partial<
    Record<CreateBillField, string>
  > = {};

  for (const issue of issues) {
    if (
      issue.path === "ownerDisplayName" ||
      issue.path === "merchantName"
    ) {
      fieldErrors[issue.path] ??=
        issue.message;
    }
  }

  return fieldErrors;
}

export async function createBillAction(
  _previousState: CreateBillActionState,
  formData: FormData,
): Promise<CreateBillActionState> {
  const ownerDisplayName = formData.get(
    "ownerDisplayName",
  );

  const merchantName = formData.get(
    "merchantName",
  );

  const result = await createServerDraftBill({
    ownerDisplayName:
      ownerDisplayName ?? undefined,
    merchantName,
    printedTotalSen: 0,
  });

  if (!result.success) {
    if (result.error.type === "validation_error") {
      return {
        message:
          "Check the highlighted fields and try again.",
        fieldErrors: mapFieldErrors(
          result.error.issues,
        ),
      };
    }

    return {
      message: result.error.message,
      fieldErrors: {},
    };
  }

  redirect(`/bills/${result.billId}`);
}