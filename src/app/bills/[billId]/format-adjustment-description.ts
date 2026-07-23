import type { OwnerBillAdjustment } from "@/application/billing/get-owner-bill";

export function formatAdjustmentDescription(
    adjustment: OwnerBillAdjustment,
): string {
    if (
        adjustment.type ===
        "rounding"
    ) {
        return "Receipt rounding";
    }

    if (
        adjustment.calculationMethod ===
        "fixed"
    ) {
        return "Fixed amount";
    }

    if (
        adjustment.rateBasisPoints ===
        null
    ) {
        return "Percentage adjustment";
    }

    const percentage =
        formatBasisPointsAsPercentage(
            adjustment.rateBasisPoints,
        );

    if (
        adjustment.calculationBaseMode ===
        "running_total"
    ) {
        return `${percentage}% of running total`;
    }

    if (
        adjustment.appliesToAllItems
    ) {
        return `${percentage}% of all items`;
    }

    const selectedItemCount =
        adjustment
            .applicableItemIds
            .length;

    const itemLabel =
        selectedItemCount === 1
            ? "selected item"
            : "selected items";

    return `${percentage}% of ${selectedItemCount} ${itemLabel}`;
}

function formatBasisPointsAsPercentage(
    rateBasisPoints: number,
): string {
    const absoluteBasisPoints =
        Math.abs(rateBasisPoints);

    const wholePercentage =
        Math.floor(
            absoluteBasisPoints /
                100,
        );

    const fractionalBasisPoints =
        absoluteBasisPoints % 100;

    if (
        fractionalBasisPoints === 0
    ) {
        return String(
            wholePercentage,
        );
    }

    const fractionalText =
        String(
            fractionalBasisPoints,
        )
            .padStart(2, "0")
            .replace(/0$/, "");

    return `${wholePercentage}.${fractionalText}`;
}