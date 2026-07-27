import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
    UpdateBillRoundingAdjustmentRecordResult,
} from "../../../application/billing/update-bill-rounding-adjustment";
import type {
    UpdateBillRoundingAdjustmentInput,
} from "../../../application/billing/validation/update-bill-rounding-adjustment-input";
import type { Database } from "../database.types";

export async function updateBillRoundingAdjustmentRecord(
    supabase: SupabaseClient<Database>,
    input:
        UpdateBillRoundingAdjustmentInput,
): Promise<UpdateBillRoundingAdjustmentRecordResult> {
    const { data, error } =
        await supabase.rpc(
            "update_bill_rounding_adjustment",
            {
                p_adjustment_id:
                    input.adjustmentId,
                p_amount_sen:
                    input.amountSen,
                p_bill_id:
                    input.billId,
            },
        );

    const updatedAdjustment =
        data?.[0];

    if (
        error ||
        !updatedAdjustment
            ?.updated_adjustment_id
    ) {
        return {
            success: false,
        };
    }

    return {
        success: true,
        adjustmentId:
            updatedAdjustment
                .updated_adjustment_id,
    };
}