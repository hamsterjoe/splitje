"use client";

import {
  useActionState,
  useState,
} from "react";

import { addParticipantAction } from "@/app/bills/[billId]/add-participant-action";
import { initialAddParticipantActionState, type AddParticipantActionState } from "@/app/bills/[billId]/add-participant-action-state";
import { AddParticipantSubmitButton } from "@/components/add-participant-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddParticipantFormProps {
  billId: string;
}

export function AddParticipantForm({
  billId,
}: AddParticipantFormProps) {

  const [displayName, setDisplayName] =
    useState("");

  const [
    displayNameTouched,
    setDisplayNameTouched,
  ] = useState(false);

  const [
    editedSinceSubmission,
    setEditedSinceSubmission,
  ] = useState(false);

  const [state, formAction] =
    useActionState(
      async (
        previousState: AddParticipantActionState,
        formData: FormData,
      ): Promise<AddParticipantActionState> => {
        const nextState =
          await addParticipantAction(
            previousState,
            formData,
          );

        setEditedSinceSubmission(
          false,
        );

        if (
          nextState.status ===
          "success"
        ) {
          setDisplayName("");
          setDisplayNameTouched(
            false,
          );
        }

        return nextState;
      },
      initialAddParticipantActionState,
    );

  const serverError =
    state.fieldErrors.displayName;

  const localError =
    displayNameTouched &&
      displayName.trim().length === 0
      ? "Enter a participant name."
      : undefined;

  const displayNameError =
    displayNameTouched
      ? localError
      : serverError;

  const showStatusMessage =
    state.message !== null &&
    !editedSinceSubmission;

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4"
    >
      <input
        type="hidden"
        name="billId"
        value={billId}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="participantDisplayName">
          Add a person
        </Label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            id="participantDisplayName"
            name="displayName"
            type="text"
            autoComplete="off"
            enterKeyHint="done"
            placeholder="e.g. Amanda"
            maxLength={100}
            required
            value={displayName}
            aria-invalid={Boolean(
              displayNameError,
            )}
            aria-describedby={
              displayNameError
                ? "participantDisplayName-error"
                : "participantDisplayName-help"
            }
            className="
              h-11 min-w-0 bg-card
              aria-invalid:border-destructive
              aria-invalid:ring-destructive/20
            "
            onChange={(event) => {
              setDisplayName(
                event.target.value,
              );

              if (
                serverError !== undefined
              ) {
                setDisplayNameTouched(
                  true,
                );
              }

              setEditedSinceSubmission(
                true,
              );
            }}
            onInvalid={(event) => {
              event.preventDefault();
              setDisplayNameTouched(true);
            }}
          />

          <AddParticipantSubmitButton />
        </div>

        {displayNameError ? (
          <p
            id="participantDisplayName-error"
            role="alert"
            className="text-sm leading-5 text-destructive"
          >
            {displayNameError}
          </p>
        ) : (
          <p
            id="participantDisplayName-help"
            className="text-sm leading-5 text-muted-foreground"
          >
            You can rename or assign items to
            this person later.
          </p>
        )}
      </div>

      <div
        aria-live="polite"
        aria-atomic="true"
      >
        {showStatusMessage ? (
          <p
            role={
              state.status === "error"
                ? "alert"
                : "status"
            }
            className={
              state.status === "error"
                ? "text-sm leading-5 text-destructive"
                : "text-sm leading-5 text-muted-foreground"
            }
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}