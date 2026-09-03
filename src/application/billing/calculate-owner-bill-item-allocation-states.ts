import { calculateItemAllocationState } from "../../domain/billing/allocation/item-allocation-state";
import type { ItemAllocationSummary } from "../../domain/billing/types";
import type { OwnerBill } from "./get-owner-bill";

export type OwnerBillItemAllocationStates = Record<
    string,
    ItemAllocationSummary
>;

export function calculateOwnerBillItemAllocationStates(
    bill: Pick<OwnerBill, "items">,
): OwnerBillItemAllocationStates {
    const states: OwnerBillItemAllocationStates =
        {};

    for (const item of bill.items) {
        states[item.id] =
            calculateItemAllocationState(
                item.lineTotalSen,
                item.allocations.map(
                    (allocation) => ({
                        participantId:
                            allocation.participantId,
                        amountSen:
                            allocation.amountSen,
                    }),
                ),
            );
    }

    return states;
}
