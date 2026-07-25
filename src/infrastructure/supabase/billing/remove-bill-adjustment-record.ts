import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
    RemoveBillAdjustmentRecordResult,
} from "../../../application/billing/remove-bill-adjustment";
import type {
    RemoveBillAdjustmentInput,
} from "../../../application/billing/validation/remove-bill-adjustment-input";
import type { Database } from "../database.types";

export async function removeBillAdjustmentRecord(
    supabase: SupabaseClient<Database>,
    input: RemoveBillAdjustmentInput,
): Promise<RemoveBillAdjustmentRecordResult> {
    const { data, error } =
        await supabase.rpc(
            "remove_bill_adjustment",
            {
                p_adjustment_id:
                    input.adjustmentId,
                p_bill_id:
                    input.billId,
            },
        );

    const removedAdjustment =
        data?.[0];

    if (
        error ||
        !removedAdjustment
            ?.removed_adjustment_id
    ) {
        return {
            success: false,
        };
    }

    return {
        success: true,
        adjustmentId:
            removedAdjustment
                .removed_adjustment_id,
    };
}