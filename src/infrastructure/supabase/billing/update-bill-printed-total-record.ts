import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
    UpdateBillPrintedTotalRecordResult,
} from "../../../application/billing/update-bill-printed-total";
import type {
    UpdateBillPrintedTotalInput,
} from "../../../application/billing/validation/update-bill-printed-total-input";
import type { Database } from "../database.types";

export async function updateBillPrintedTotalRecord(
    supabase: SupabaseClient<Database>,
    input: UpdateBillPrintedTotalInput,
): Promise<UpdateBillPrintedTotalRecordResult> {
    const { data, error } = await supabase.rpc(
        "update_bill_printed_total",
        {
            p_bill_id: input.billId,
            p_expected_row_version:
                input.expectedRowVersion,
            p_printed_total_sen:
                input.printedTotalSen,
        },
    );

    if (error) {
        if (error.code === "40001") {
            return {
                success: false,
                reason: "conflict",
            };
        }

        return {
            success: false,
            reason: "unknown",
        };
    }

    const updatedBill = data?.[0];

    if (
        updatedBill?.updated_row_version ===
        undefined
    ) {
        return {
            success: false,
            reason: "unknown",
        };
    }

    return {
        success: true,
        rowVersion:
            updatedBill.updated_row_version,
    };
}