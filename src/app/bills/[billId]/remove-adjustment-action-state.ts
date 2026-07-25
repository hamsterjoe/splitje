export interface RemoveAdjustmentActionState {
    status:
        | "idle"
        | "success"
        | "error";
    message: string | null;
}

export const initialRemoveAdjustmentActionState:
    RemoveAdjustmentActionState = {
    status: "idle",
    message: null,
};