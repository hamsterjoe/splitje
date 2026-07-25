import "server-only";

import {
    removeBillAdjustment,
    type RemoveBillAdjustmentResult,
} from "../../../application/billing/remove-bill-adjustment";
import { createServerSupabaseClient } from "../server";
import { removeBillAdjustmentRecord } from "./remove-bill-adjustment-record";

export async function removeServerBillAdjustment(
    input: unknown,
): Promise<RemoveBillAdjustmentResult> {
    const supabase =
        await createServerSupabaseClient();

    return removeBillAdjustment(
        input,
        {
            removeBillAdjustmentRecord:
                (validatedInput) =>
                    removeBillAdjustmentRecord(
                        supabase,
                        validatedInput,
                    ),
        },
    );
}