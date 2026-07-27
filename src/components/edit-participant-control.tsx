"use client";

import { useActionState, useId, useState } from "react";

import { renameParticipantAction } from "@/app/bills/[billId]/rename-participant-action";
import {
  initialRenameParticipantActionState,
  type RenameParticipantActionState,
} from "@/app/bills/[billId]/rename-participant-action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EditParticipantControlProps {
  billId: string;
  participantId: string;
  displayName: string;
}

export function EditParticipantControl({
  billId,
  participantId,
  displayName,
}: EditParticipantControlProps) {
  const formId = useId();

  const [isEditing, setIsEditing] = useState(false);
  const [draftDisplayName, setDraftDisplayName] = useState(displayName);
  const [displayNameTouched, setDisplayNameTouched] = useState(false);
  const [editedSinceSubmission, setEditedSinceSubmission] = useState(false);

  const [state, formAction, isPending] = useActionState(
    async (
      previousState: RenameParticipantActionState,
      formData: FormData,
    ): Promise<RenameParticipantActionState> => {
      const nextState = await renameParticipantAction(previousState, formData);

      setEditedSinceSubmission(false);

      if (nextState.status === "success") {
        setIsEditing(false);
        setDisplayNameTouched(false);
      }

      return nextState;
    },
    initialRenameParticipantActionState,
  );

  function resetDraft() {
    setDraftDisplayName(displayName);
    setDisplayNameTouched(false);
  }

  function startEditing() {
    resetDraft();
    setEditedSinceSubmission(true);
    setIsEditing(true);
  }

  function cancelEditing() {
    resetDraft();
    setEditedSinceSubmission(true);
    setIsEditing(false);
  }

  const localError = displayNameTouched
    ? draftDisplayName.trim().length === 0
      ? "Enter a participant name."
      : draftDisplayName.trim().length > 100
        ? "Participant name cannot exceed 100 characters."
        : undefined
    : undefined;

  const displayNameError = displayNameTouched
    ? localError
    : editedSinceSubmission
      ? undefined
      : state.fieldErrors.displayName;

  const showStatusMessage =
    state.status === "error" &&
    state.message !== null &&
    !editedSinceSubmission;

  if (!isEditing) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="min-h-11 touch-manipulation px-3"
        onClick={startEditing}
      >
        Edit
      </Button>
    );
  }

  const displayNameId = `${formId}-display-name`;
  const displayNameErrorId = `${formId}-display-name-error`;

  return (
    <form
      action={formAction}
      className="w-full rounded-lg border bg-muted/20 p-3"
    >
      <input type="hidden" name="billId" value={billId} />

      <input type="hidden" name="participantId" value={participantId} />

      <div className="flex flex-col gap-2">
        <Label htmlFor={displayNameId}>Name</Label>

        <Input
          id={displayNameId}
          name="displayName"
          type="text"
          autoComplete="off"
          enterKeyHint="done"
          maxLength={100}
          required
          value={draftDisplayName}
          aria-invalid={Boolean(displayNameError)}
          aria-describedby={displayNameError ? displayNameErrorId : undefined}
          className="h-11 bg-card aria-invalid:border-destructive aria-invalid:ring-destructive/20"
          onChange={(event) => {
            setDraftDisplayName(event.target.value);

            if (state.fieldErrors.displayName !== undefined) {
              setDisplayNameTouched(true);
            }

            setEditedSinceSubmission(true);
          }}
          onInvalid={(event) => {
            event.preventDefault();
            setDisplayNameTouched(true);
          }}
        />

        {displayNameError ? (
          <p
            id={displayNameErrorId}
            role="alert"
            className="text-sm leading-5 text-destructive"
          >
            {displayNameError}
          </p>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 touch-manipulation"
          disabled={isPending}
          onClick={cancelEditing}
        >
          Cancel
        </Button>

        <Button
          type="submit"
          className="min-h-11 touch-manipulation"
          disabled={isPending}
          aria-disabled={isPending}
          aria-busy={isPending}
        >
          {isPending ? "Saving changes…" : "Save changes"}
        </Button>
      </div>

      {showStatusMessage ? (
        <p role="alert" className="mt-3 text-sm leading-5 text-destructive">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
