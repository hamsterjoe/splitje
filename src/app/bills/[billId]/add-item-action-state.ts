export type AddItemField =
    | "description"
    | "quantity"
    | "unitPrice";

export interface AddItemActionState {
    status: "idle" | "success" | "error";
    message: string | null;
    fieldErrors: Partial<
        Record<AddItemField, string>
    >;
}

export const initialAddItemActionState:
    AddItemActionState = {
    status: "idle",
    message: null,
    fieldErrors: {},
};