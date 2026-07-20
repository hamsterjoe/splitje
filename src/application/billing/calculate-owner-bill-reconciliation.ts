import { reconcileReceipt } from "../../domain/billing/reconciliation/receipt-reconciliation";
import type {
    ReceiptReconciliationResult,
} from "../../domain/billing/types";
import type { OwnerBill } from "./get-owner-bill";

export function calculateOwnerBillReconciliation(
    bill: Pick<
        OwnerBill,
        | "printedTotalSen"
        | "items"
        | "adjustments"
    >,
): ReceiptReconciliationResult {
    return reconcileReceipt(
        bill.printedTotalSen,

        bill.items.map((item) => ({
            itemId: item.id,
            lineTotalSen: item.lineTotalSen,
        })),

        bill.adjustments.map(
            (adjustment) => ({
                adjustmentId: adjustment.id,
                type: adjustment.type,
                amountSen:
                    adjustment.amountSen,
            }),
        ),
    );
}