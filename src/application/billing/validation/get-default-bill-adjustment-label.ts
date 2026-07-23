export type AdjustmentLabelType =
    | "discount"
    | "service_charge"
    | "tax"
    | "rounding"
    | "other";

const defaultLabels:
    Record<
        AdjustmentLabelType,
        string
    > = {
        discount: "Discount",
        service_charge:
            "Service charge",
        tax: "Tax / SST",
        rounding: "Rounding",
        other: "Other fee",
    };

export function getDefaultBillAdjustmentLabel(
    type: AdjustmentLabelType,
): string {
    return defaultLabels[type];
}