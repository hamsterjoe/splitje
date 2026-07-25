import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
    UpdateFixedBillAdjustmentRecordResult,
} from "../../../application/billing/update-fixed-bill-adjustment";
import type {
    UpdateFixedBillAdjustmentInput,
} from "../../../application/billing/validation/update-fixed-bill-adjustment-input";
import type { Database } from "../database.types";

export async function updateFixedBillAdjustmentRecord(
    supabase: SupabaseClient<Database>,
    input:
        UpdateFixedBillAdjustmentInput,
): Promise<UpdateFixedBillAdjustmentRecordResult> {
    const { data, error } =
        await supabase.rpc(
            "update_fixed_bill_adjustment",
            {
                p_adjustment_id:
                    input.adjustmentId,
                p_amount_sen:
                    input.amountSen,
                p_bill_id:
                    input.billId,
                p_label:
                    input.label,
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