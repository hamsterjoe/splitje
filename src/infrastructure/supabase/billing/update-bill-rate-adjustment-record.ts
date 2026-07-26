import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
    UpdateBillRateAdjustmentRecordResult,
} from "../../../application/billing/update-bill-rate-adjustment";
import type {
    UpdateBillRateAdjustmentInput,
} from "../../../application/billing/validation/update-bill-rate-adjustment-input";
import type { Database } from "../database.types";

export async function updateBillRateAdjustmentRecord(
    supabase: SupabaseClient<Database>,
    input:
        UpdateBillRateAdjustmentInput,
): Promise<UpdateBillRateAdjustmentRecordResult> {
    const { data, error } =
        await supabase.rpc(
            "update_bill_rate_adjustment",
            {
                p_adjustment_id:
                    input.adjustmentId,
                p_applicable_item_ids:
                    input
                        .applicableItemIds ??
                    [],
                p_applies_to_all_items:
                    input
                        .appliesToAllItems,
                p_bill_id:
                    input.billId,
                p_label:
                    input.label,
                p_rate_basis_points:
                    input
                        .rateBasisPoints,
            },
        );

    const updatedAdjustment =
        data?.[0];

    if (
        error ||
        !updatedAdjustment
            ?.updated_adjustment_id ||
        updatedAdjustment
            .calculated_amount_sen ===
        undefined
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
        amountSen:
            updatedAdjustment
                .calculated_amount_sen,
    };
}