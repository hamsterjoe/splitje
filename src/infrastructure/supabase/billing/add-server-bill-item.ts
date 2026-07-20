import "server-only";

import {
    addBillItem,
    type AddBillItemResult,
} from "../../../application/billing/add-bill-item";
import { createServerSupabaseClient } from "../server";
import { addBillItemRecord } from "./add-bill-item-record";

export async function addServerBillItem(
    input: unknown,
): Promise<AddBillItemResult> {
    const supabase =
        await createServerSupabaseClient();

    return addBillItem(input, {
        addBillItemRecord: (
            validatedInput,
        ) =>
            addBillItemRecord(
                supabase,
                validatedInput,
            ),
    });
}