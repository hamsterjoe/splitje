import "server-only";

import {
    addBillRateAdjustment,
    type AddBillRateAdjustmentResult,
} from "../../../application/billing/add-bill-rate-adjustment";
import { createServerSupabaseClient } from "../server";
import { addBillRateAdjustmentRecord } from "./add-bill-rate-adjustment-record";

export async function addServerBillRateAdjustment(
    input: unknown,
): Promise<AddBillRateAdjustmentResult> {
    const supabase =
        await createServerSupabaseClient();

    return addBillRateAdjustment(input, {
        addBillRateAdjustmentRecord: (
            validatedInput,
        ) =>
            addBillRateAdjustmentRecord(
                supabase,
                validatedInput,
            ),
    });
}