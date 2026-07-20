import "server-only";

import {
    updateBillPrintedTotal,
    type UpdateBillPrintedTotalResult,
} from "../../../application/billing/update-bill-printed-total";
import { createServerSupabaseClient } from "../server";
import { updateBillPrintedTotalRecord } from "./update-bill-printed-total-record";

export async function updateServerBillPrintedTotal(
    input: unknown,
): Promise<UpdateBillPrintedTotalResult> {
    const supabase =
        await createServerSupabaseClient();

    return updateBillPrintedTotal(input, {
        updateBillPrintedTotalRecord: (
            validatedInput,
        ) =>
            updateBillPrintedTotalRecord(
                supabase,
                validatedInput,
            ),
    });
}