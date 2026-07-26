export type UpdateRateAdjustmentField =
    | "percentage"
    | "scope"
    | "applicableItemIds";

export interface UpdateRateAdjustmentActionState {
    status:
    | "idle"
    | "success"
    | "error";
    message: string | null;
    fieldErrors: Partial<
        Record<
            UpdateRateAdjustmentField,
            string
        >
    >;
}

export const initialUpdateRateAdjustmentActionState:
    UpdateRateAdjustmentActionState = {
    status: "idle",
    message: null,
    fieldErrors: {},
};