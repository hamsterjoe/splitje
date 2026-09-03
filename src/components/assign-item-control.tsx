"use client";

import { useActionState, useId, useState } from "react";

import { setItemAllocationsAction } from "@/app/bills/[billId]/set-item-allocations-action";
import {
  initialSetItemAllocationsActionState,
  type SetItemAllocationsActionState,
} from "@/app/bills/[billId]/set-item-allocations-action-state";
import { Button } from "@/components/ui/button";

interface AssignItemControlParticipant {
  id: string;
  displayName: string;
}

interface AssignItemControlProps {
  billId: string;
  itemId: string;
  participants: AssignItemControlParticipant[];
  assignedParticipantIds: string[];
}

export function AssignItemControl({
  billId,
  itemId,
  participants,
  assignedParticipantIds,
}: AssignItemControlProps) {
  const formId = useId();

  const [isEditing, setIsEditing] = useState(false);
  const [selectedParticipantIds, setSelectedParticipantIds] =
    useState<string[]>(assignedParticipantIds);
  const [editedSinceSubmission, setEditedSinceSubmission] = useState(false);

  const hasAssignment = assignedParticipantIds.length > 0;

  const [state, formAction, isPending] = useActionState(
    async (
      previousState: SetItemAllocationsActionState,
      formData: FormData,
    ): Promise<SetItemAllocationsActionState> => {
      const nextState = await setItemAllocationsAction(
        previousState,
        formData,
      );

      setEditedSinceSubmission(false);

      if (nextState.status === "success") {
        setIsEditing(false);
      }

      return nextState;
    },
    initialSetItemAllocationsActionState,
  );

  function resetDraft() {
    setSelectedParticipantIds(assignedParticipantIds);
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

  function toggleParticipant(participantId: string) {
    setSelectedParticipantIds((current) =>
      current.includes(participantId)
        ? current.filter((id) => id !== participantId)
        : [...current, participantId],
    );
    setEditedSinceSubmission(true);
  }

  const participantIdsError = editedSinceSubmission
    ? undefined
    : state.fieldErrors.participantIds;

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
        {hasAssignment ? "Edit assignment" : "Assign"}
      </Button>
    );
  }

  const selectionHintId = `${formId}-selection-hint`;
  const participantIdsErrorId = `${formId}-participant-ids-error`;

  return (
    <form
      action={formAction}
      className="w-full rounded-lg border bg-muted/20 p-3"
    >
      <input type="hidden" name="billId" value={billId} />

      <input type="hidden" name="itemId" value={itemId} />

      <fieldset
        aria-describedby={
          participantIdsError ? participantIdsErrorId : selectionHintId
        }
        disabled={isPending}
        className="disabled:opacity-60"
      >
        <legend className="text-sm font-medium">
          Who shares this item?
        </legend>

        <p
          id={selectionHintId}
          className="mt-1 text-sm text-muted-foreground"
        >
          Selected people split this item equally. Select one person to
          assign the whole item, or clear everyone to unassign it.
        </p>

        <ul className="mt-2 flex flex-col gap-1">
          {participants.map((participant) => {
            const isSelected = selectedParticipantIds.includes(
              participant.id,
            );

            return (
              <li key={participant.id}>
                <label className="flex min-h-11 cursor-pointer touch-manipulation items-center gap-3 rounded-md px-2 hover:bg-muted/40">
                  <input
                    type="checkbox"
                    name="participantIds"
                    value={participant.id}
                    checked={isSelected}
                    onChange={() => toggleParticipant(participant.id)}
                    className="size-5 shrink-0"
                  />
                  <span className="text-sm">
                    {participant.displayName}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      {participantIdsError ? (
        <p
          id={participantIdsErrorId}
          role="alert"
          className="mt-2 text-sm leading-5 text-destructive"
        >
          {participantIdsError}
        </p>
      ) : null}

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
          {isPending ? "Saving assignment…" : "Save assignment"}
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
