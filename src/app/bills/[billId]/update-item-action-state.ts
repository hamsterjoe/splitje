export type UpdateItemField =
    | "description"
    | "quantity"
    | "unitPrice";

export interface UpdateItemActionState {
    status:
    | "idle"
    | "success"
    | "error";
    message: string | null;
    fieldErrors: Partial<
        Record<
            UpdateItemField,
            string
        >
    >;
}

export const initialUpdateItemActionState:
    UpdateItemActionState = {
    status: "idle",
    message: null,
    fieldErrors: {},
};