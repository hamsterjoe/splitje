import "server-only";

import {
    updateBillRateAdjustment,
    type UpdateBillRateAdjustmentResult,
} from "../../../application/billing/update-bill-rate-adjustment";
import { createServerSupabaseClient } from "../server";
import { updateBillRateAdjustmentRecord } from "./update-bill-rate-adjustment-record";

export async function updateServerBillRateAdjustment(
    input: unknown,
): Promise<UpdateBillRateAdjustmentResult> {
    const supabase =
        await createServerSupabaseClient();

    return updateBillRateAdjustment(
        input,
        {
            updateBillRateAdjustmentRecord:
                (validatedInput) =>
                    updateBillRateAdjustmentRecord(
                        supabase,
                        validatedInput,
                    ),
        },
    );
}