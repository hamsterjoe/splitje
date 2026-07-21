import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
    AddBillRoundingAdjustmentRecordResult,
} from "../../../application/billing/add-bill-rounding-adjustment";
import type {
    AddBillRoundingAdjustmentInput,
} from "../../../application/billing/validation/add-bill-rounding-adjustment-input";
import type { Database } from "../database.types";

export async function addBillRoundingAdjustmentRecord(
    supabase: SupabaseClient<Database>,
    input: AddBillRoundingAdjustmentInput,
): Promise<AddBillRoundingAdjustmentRecordResult> {
    const { data, error } =
        await supabase.rpc(
            "add_bill_rounding_adjustment",
            {
                p_bill_id:
                    input.billId,
                p_amount_sen:
                    input.amountSen,
            },
        );

    const createdAdjustment =
        data?.[0];

    if (
        error ||
        !createdAdjustment?.adjustment_id
    ) {
        return {
            success: false,
        };
    }

    return {
        success: true,
        adjustmentId:
            createdAdjustment
                .adjustment_id,
    };
}