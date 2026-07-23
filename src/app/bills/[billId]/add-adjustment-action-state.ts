export type AddAdjustmentField =
    | "calculationMethod"
    | "type"
    | "label"
    | "amount"
    | "percentage"
    | "direction"
    | "scope"
    | "applicableItemIds";
    
export interface AddAdjustmentActionState {
    status:
    | "idle"
    | "success"
    | "error";
    message: string | null;
    fieldErrors: Partial<
        Record<
            AddAdjustmentField,
            string
        >
    >;
}

export const initialAddAdjustmentActionState:
    AddAdjustmentActionState = {
    status: "idle",
    message: null,
    fieldErrors: {},
};