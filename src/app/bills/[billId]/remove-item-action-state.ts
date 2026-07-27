export interface RemoveItemActionState {
  status: "idle" | "success" | "error";
  message: string | null;
}

export const initialRemoveItemActionState: RemoveItemActionState = {
  status: "idle",
  message: null,
};
