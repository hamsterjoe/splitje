import "server-only";

import {
    updateBillItem,
    type UpdateBillItemResult,
} from "../../../application/billing/update-bill-item";
import { createServerSupabaseClient } from "../server";
import { updateBillItemRecord } from "./update-bill-item-record";

export async function updateServerBillItem(
    input: unknown,
): Promise<UpdateBillItemResult> {
    const supabase =
        await createServerSupabaseClient();

    return updateBillItem(
        input,
        {
            updateBillItemRecord:
                (validatedInput) =>
                    updateBillItemRecord(
                        supabase,
                        validatedInput,
                    ),
        },
    );
}