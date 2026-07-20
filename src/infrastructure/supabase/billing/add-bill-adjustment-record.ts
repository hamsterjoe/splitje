import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
    AddBillAdjustmentRecordResult,
} from "../../../application/billing/add-bill-adjustment";
import type {
    AddBillAdjustmentInput,
} from "../../../application/billing/validation/add-bill-adjustment-input";
import type { Database } from "../database.types";

export async function addBillAdjustmentRecord(
    supabase: SupabaseClient<Database>,
    input: AddBillAdjustmentInput,
): Promise<AddBillAdjustmentRecordResult> {
    const { data, error } = await supabase.rpc(
        "add_bill_adjustment",
        {
            p_bill_id: input.billId,
            p_type: input.type,
            p_label: input.label,
            p_amount_sen: input.amountSen,
        },
    );

    const createdAdjustment = data?.[0];

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
            createdAdjustment.adjustment_id,
    };
}