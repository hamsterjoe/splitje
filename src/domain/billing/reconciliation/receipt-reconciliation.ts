import { BillingDomainError } from "../errors";
import type {
    ReceiptAdjustmentAmount,
    ReceiptItemAmount,
    ReceiptReconciliationResult,
    Sen,
} from "../types";

function compareIds(first: string, second: string): number {
    if (first < second) return -1;
    if (first > second) return 1;
    return 0;
}

function isWithinSafeIntegerRange(value: bigint): boolean {
    return (
        value >= BigInt(Number.MIN_SAFE_INTEGER) &&
        value <= BigInt(Number.MAX_SAFE_INTEGER)
    );
}

export function reconcileReceipt(
    printedTotalSen: Sen,
    items: ReceiptItemAmount[],
    adjustments: ReceiptAdjustmentAmount[],
): ReceiptReconciliationResult {
    if (
        !Number.isSafeInteger(printedTotalSen) ||
        printedTotalSen < 0
    ) {
        throw new BillingDomainError(
            "INVALID_TOTAL_SEN",
            "The printed total must be a non-negative safe integer in sen.",
        );
    }

    const hasInvalidItemId = items.some(
        ({ itemId }) =>
            typeof itemId !== "string" ||
            itemId.trim().length === 0,
    );

    if (hasInvalidItemId) {
        throw new BillingDomainError(
            "INVALID_ITEM_ID",
            "Item IDs must be non-empty strings.",
        );
    }

    const itemIds = items.map(({ itemId }) => itemId);

    if (new Set(itemIds).size !== itemIds.length) {
        throw new BillingDomainError(
            "DUPLICATE_ITEM_ID",
            "Item IDs must be unique within a receipt.",
        );
    }

    const hasInvalidItemTotal = items.some(
        ({ lineTotalSen }) =>
            !Number.isSafeInteger(lineTotalSen) ||
            lineTotalSen < 0,
    );

    if (hasInvalidItemTotal) {
        throw new BillingDomainError(
            "INVALID_ITEM_TOTAL",
            "Item totals must be non-negative safe integers in sen.",
        );
    }

    const hasInvalidAdjustmentId = adjustments.some(
        ({ adjustmentId }) =>
            typeof adjustmentId !== "string" ||
            adjustmentId.trim().length === 0,
    );

    if (hasInvalidAdjustmentId) {
        throw new BillingDomainError(
            "INVALID_ADJUSTMENT_ID",
            "Adjustment IDs must be non-empty strings.",
        );
    }

    const adjustmentIds = adjustments.map(
        ({ adjustmentId }) => adjustmentId,
    );

    if (
        new Set(adjustmentIds).size !== adjustmentIds.length
    ) {
        throw new BillingDomainError(
            "DUPLICATE_ADJUSTMENT_ID",
            "Adjustment IDs must be unique within a receipt.",
        );
    }

    const hasInvalidAdjustmentAmount = adjustments.some(
        ({ amountSen }) => !Number.isSafeInteger(amountSen),
    );

    if (hasInvalidAdjustmentAmount) {
        throw new BillingDomainError(
            "INVALID_ADJUSTMENT_AMOUNT",
            "Adjustment amounts must be safe integers in sen.",
        );
    }

    const canonicalItems = items
        .map((item) => ({ ...item }))
        .sort((first, second) =>
            compareIds(first.itemId, second.itemId),
        );

    const canonicalAdjustments = adjustments
        .map((adjustment) => ({ ...adjustment }))
        .sort((first, second) =>
            compareIds(
                first.adjustmentId,
                second.adjustmentId,
            ),
        );

    const itemSubtotalBigInt = canonicalItems.reduce(
        (sum, { lineTotalSen }) => sum + BigInt(lineTotalSen),
        BigInt(0),
    );

    const adjustmentTotalBigInt =
        canonicalAdjustments.reduce(
            (sum, { amountSen }) => sum + BigInt(amountSen),
            BigInt(0),
        );

    const calculatedTotalBigInt =
        itemSubtotalBigInt + adjustmentTotalBigInt;

    if (
        !isWithinSafeIntegerRange(itemSubtotalBigInt) ||
        !isWithinSafeIntegerRange(adjustmentTotalBigInt) ||
        !isWithinSafeIntegerRange(calculatedTotalBigInt)
    ) {
        throw new BillingDomainError(
            "UNSAFE_CALCULATION",
            "Receipt arithmetic exceeds the supported safe-integer range.",
        );
    }

    if (calculatedTotalBigInt < BigInt(0)) {
        throw new BillingDomainError(
            "NEGATIVE_CALCULATED_TOTAL",
            "Adjustments cannot reduce the calculated receipt total below zero.",
        );
    }

    const itemSubtotalSen = Number(itemSubtotalBigInt);
    const adjustmentTotalSen = Number(
        adjustmentTotalBigInt,
    );
    const calculatedTotalSen = Number(
        calculatedTotalBigInt,
    );

    const differenceSen =
        calculatedTotalSen - printedTotalSen;

    return {
        printedTotalSen,
        itemSubtotalSen,
        adjustmentTotalSen,
        calculatedTotalSen,
        differenceSen,
        isReconciled: differenceSen === 0,
        items: canonicalItems,
        adjustments: canonicalAdjustments,
    };
}