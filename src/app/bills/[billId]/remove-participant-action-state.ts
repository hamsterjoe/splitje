export interface RemoveParticipantActionState {
  status: "idle" | "success" | "error";
  message: string | null;
}

export const initialRemoveParticipantActionState: RemoveParticipantActionState =
  {
    status: "idle",
    message: null,
  };
