export type AddParticipantField =
  "displayName";

export interface AddParticipantActionState {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors: Partial<
    Record<AddParticipantField, string>
  >;
}

export const initialAddParticipantActionState:
  AddParticipantActionState = {
    status: "idle",
    message: null,
    fieldErrors: {},
  };