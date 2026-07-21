import "server-only";

import {
    addBillRoundingAdjustment,
    type AddBillRoundingAdjustmentResult,
} from "../../../application/billing/add-bill-rounding-adjustment";
import { createServerSupabaseClient } from "../server";
import { addBillRoundingAdjustmentRecord } from "./add-bill-rounding-adjustment-record";

export async function addServerBillRoundingAdjustment(
    input: unknown,
): Promise<AddBillRoundingAdjustmentResult> {
    const supabase =
        await createServerSupabaseClient();

    return addBillRoundingAdjustment(
        input,
        {
            addBillRoundingAdjustmentRecord:
                (validatedInput) =>
                    addBillRoundingAdjustmentRecord(
                        supabase,
                        validatedInput,
                    ),
        },
    );
}