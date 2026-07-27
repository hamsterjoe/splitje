import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
    UpdateBillItemRecordInput,
    UpdateBillItemRecordResult,
} from "../../../application/billing/update-bill-item";
import type { Database } from "../database.types";

export async function updateBillItemRecord(
    supabase: SupabaseClient<Database>,
    input: UpdateBillItemRecordInput,
): Promise<UpdateBillItemRecordResult> {
    const { data, error } =
        await supabase.rpc(
            "update_bill_item",
            {
                p_bill_id:
                    input.billId,
                p_description:
                    input.description,
                p_item_id:
                    input.itemId,
                p_line_total_sen:
                    input.lineTotalSen,
                p_quantity:
                    input.quantity,
                p_unit_price_sen:
                    input.unitPriceSen,
            },
        );

    const updatedItem =
        data?.[0];

    if (
        error ||
        !updatedItem
            ?.updated_item_id
    ) {
        return {
            success: false,
        };
    }

    return {
        success: true,
        itemId:
            updatedItem
                .updated_item_id,
    };
}