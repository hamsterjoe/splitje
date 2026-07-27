export type RenameParticipantField = "displayName";

export interface RenameParticipantActionState {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors: Partial<Record<RenameParticipantField, string>>;
}

export const initialRenameParticipantActionState: RenameParticipantActionState =
  {
    status: "idle",
    message: null,
    fieldErrors: {},
  };
