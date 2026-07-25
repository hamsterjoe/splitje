export type UpdateFixedAdjustmentField =
    "amount";

export interface UpdateFixedAdjustmentActionState {
    status:
        | "idle"
        | "success"
        | "error";
    message: string | null;
    fieldErrors: Partial<
        Record<
            UpdateFixedAdjustmentField,
            string
        >
    >;
}

export const initialUpdateFixedAdjustmentActionState:
    UpdateFixedAdjustmentActionState = {
    status: "idle",
    message: null,
    fieldErrors: {},
};