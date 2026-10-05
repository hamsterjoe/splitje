import { allocateAdjustmentProportionally } from "../../domain/billing/adjustments/allocate-adjustment-proportionally";
import { calculateAdjustmentBases } from "../../domain/billing/adjustments/calculate-adjustment-bases";
import { calculateBill } from "../../domain/billing/calculate-bill";
import type {
    AdjustmentAllocationInput,
    BillCalculationAdjustment,
    BillCalculationResult,
} from "../../domain/billing/types";
import type { OwnerBill } from "./get-owner-bill";

export function calculateOwnerBillSummary(
    bill: OwnerBill,
): BillCalculationResult {
    const participantIds = bill.participants.map(
        (participant) => participant.id,
    );

    const items = bill.items.map((item) => ({
        itemId: item.id,
        lineTotalSen: item.lineTotalSen,
        allocations: item.allocations.map(
            (allocation) => ({
                participantId: allocation.participantId,
                amountSen: allocation.amountSen,
            }),
        ),
    }));

    const hasItems = items.length > 0;

    const adjustments: BillCalculationAdjustment[] =
        bill.adjustments.map((adjustment) => {
            let allocations:
                AdjustmentAllocationInput[] = [];

            if (hasItems) {
                const { bases } =
                    calculateAdjustmentBases({
                        participantIds,
                        items,
                        applicableItemIds:
                            adjustment.appliesToAllItems
                                ? null
                                : adjustment.applicableItemIds,
                    });

                const eligibleSubtotalSen =
                    bases.reduce(
                        (sum, base) =>
                            sum +
                            base.itemSubtotalSen,
                        0,
                    );

                // Proportional allocation is impossible when nothing is
                // assigned yet; leaving the adjustment unallocated lets
                // the financial state surface it as a finalisation
                // blocker instead of inventing a split.
                if (
                    adjustment.amountSen !== 0 &&
                    eligibleSubtotalSen > 0
                ) {
                    allocations =
                        allocateAdjustmentProportionally(
                            adjustment.amountSen,
                            bases,
                        ).allocations.map(
                            (allocation) => ({
                                participantId:
                                    allocation.participantId,
                                amountSen:
                                    allocation.amountSen,
                            }),
                        );
                }
            }

            return {
                adjustmentId: adjustment.id,
                type: adjustment.type,
                amountSen: adjustment.amountSen,
                allocations,
            };
        });

    return calculateBill({
        printedTotalSen: bill.printedTotalSen,
        participantIds,
        items,
        adjustments,
    });
}
