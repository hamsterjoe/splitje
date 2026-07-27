import "server-only";

import {
    updateBillRoundingAdjustment,
    type UpdateBillRoundingAdjustmentResult,
} from "../../../application/billing/update-bill-rounding-adjustment";
import { createServerSupabaseClient } from "../server";
import { updateBillRoundingAdjustmentRecord } from "./update-bill-rounding-adjustment-record";

export async function updateServerBillRoundingAdjustment(
    input: unknown,
): Promise<UpdateBillRoundingAdjustmentResult> {
    const supabase =
        await createServerSupabaseClient();

    return updateBillRoundingAdjustment(
        input,
        {
            updateBillRoundingAdjustmentRecord:
                (validatedInput) =>
                    updateBillRoundingAdjustmentRecord(
                        supabase,
                        validatedInput,
                    ),
        },
    );
}