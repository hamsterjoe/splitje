import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
    AddBillRateAdjustmentRecordResult,
} from "../../../application/billing/add-bill-rate-adjustment";
import type {
    AddBillRateAdjustmentInput,
} from "../../../application/billing/validation/add-bill-rate-adjustment-input";
import type { Database } from "../database.types";

export async function addBillRateAdjustmentRecord(
    supabase: SupabaseClient<Database>,
    input: AddBillRateAdjustmentInput,
): Promise<AddBillRateAdjustmentRecordResult> {
    const { data, error } =
        await supabase.rpc(
            "add_bill_rate_adjustment",
            {
                p_bill_id: input.billId,
                p_type: input.type,
                p_label: input.label,
                p_rate_basis_points:
                    input.rateBasisPoints,
                p_rounding_mode:
                    input.roundingMode,
                p_calculation_base_mode:
                    input.calculationBaseMode,
            },
        );

    const createdAdjustment = data?.[0];

    if (
        error ||
        !createdAdjustment?.adjustment_id ||
        createdAdjustment
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
            createdAdjustment.adjustment_id,
        amountSen:
            createdAdjustment
                .calculated_amount_sen,
    };
}