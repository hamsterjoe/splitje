export type SetItemAllocationsField = "shares";

export interface SetItemAllocationsActionState {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors: Partial<Record<SetItemAllocationsField, string>>;
}

export const initialSetItemAllocationsActionState: SetItemAllocationsActionState =
  {
    status: "idle",
    message: null,
    fieldErrors: {},
  };
