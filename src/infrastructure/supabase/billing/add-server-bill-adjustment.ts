import "server-only";

import {
    addBillAdjustment,
    type AddBillAdjustmentResult,
} from "../../../application/billing/add-bill-adjustment";
import { createServerSupabaseClient } from "../server";
import { addBillAdjustmentRecord } from "./add-bill-adjustment-record";

export async function addServerBillAdjustment(
    input: unknown,
): Promise<AddBillAdjustmentResult> {
    const supabase =
        await createServerSupabaseClient();

    return addBillAdjustment(input, {
        addBillAdjustmentRecord: (
            validatedInput,
        ) =>
            addBillAdjustmentRecord(
                supabase,
                validatedInput,
            ),
    });
}