export type UpdateRoundingAdjustmentField =
    | "direction"
    | "amount";

export interface UpdateRoundingAdjustmentActionState {
    status:
    | "idle"
    | "success"
    | "error";
    message: string | null;
    fieldErrors: Partial<
        Record<
            UpdateRoundingAdjustmentField,
            string
        >
    >;
}

export const initialUpdateRoundingAdjustmentActionState:
    UpdateRoundingAdjustmentActionState = {
    status: "idle",
    message: null,
    fieldErrors: {},
};