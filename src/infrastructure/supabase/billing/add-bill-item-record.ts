import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
    AddBillItemRecordInput,
    AddBillItemRecordResult,
} from "../../../application/billing/add-bill-item";
import type { Database } from "../database.types";

export async function addBillItemRecord(
    supabase: SupabaseClient<Database>,
    input: AddBillItemRecordInput,
): Promise<AddBillItemRecordResult> {
    const { data, error } = await supabase.rpc(
        "add_bill_item",
        {
            p_bill_id: input.billId,
            p_description: input.description,
            p_quantity: input.quantity,
            p_unit_price_sen:
                input.unitPriceSen,
            p_line_total_sen:
                input.lineTotalSen,
        },
    );

    const createdItem = data?.[0];

    if (
        error ||
        !createdItem?.item_id
    ) {
        return {
            success: false,
        };
    }

    return {
        success: true,
        itemId: createdItem.item_id,
    };
}