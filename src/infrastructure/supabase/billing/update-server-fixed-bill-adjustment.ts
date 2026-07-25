import "server-only";

import {
    updateFixedBillAdjustment,
    type UpdateFixedBillAdjustmentResult,
} from "../../../application/billing/update-fixed-bill-adjustment";
import { createServerSupabaseClient } from "../server";
import { updateFixedBillAdjustmentRecord } from "./update-fixed-bill-adjustment-record";

export async function updateServerFixedBillAdjustment(
    input: unknown,
): Promise<UpdateFixedBillAdjustmentResult> {
    const supabase =
        await createServerSupabaseClient();

    return updateFixedBillAdjustment(
        input,
        {
            updateFixedBillAdjustmentRecord:
                (validatedInput) =>
                    updateFixedBillAdjustmentRecord(
                        supabase,
                        validatedInput,
                    ),
        },
    );
}