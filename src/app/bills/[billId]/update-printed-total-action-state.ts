export type UpdatePrintedTotalField =
    "printedTotal";

export interface UpdatePrintedTotalActionState {
    status: "idle" | "success" | "error";
    message: string | null;
    fieldErrors: Partial<
        Record<
            UpdatePrintedTotalField,
            string
        >
    >;
}

export const initialUpdatePrintedTotalActionState:
    UpdatePrintedTotalActionState = {
    status: "idle",
    message: null,
    fieldErrors: {},
};