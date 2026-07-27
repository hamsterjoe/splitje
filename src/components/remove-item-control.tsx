"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { removeItemAction } from "@/app/bills/[billId]/remove-item-action";
import {
  initialRemoveItemActionState,
  type RemoveItemActionState,
} from "@/app/bills/[billId]/remove-item-action-state";
import { Button } from "@/components/ui/button";

const REMOVAL_DELAY_MS = 4_000;
const PROGRESS_INTERVAL_MS = 100;

interface RemoveItemControlProps {
  billId: string;
  itemId: string;
}

export function RemoveItemControl({ billId, itemId }: RemoveItemControlProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const removalTimeoutRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);

  const [isRemovalScheduled, setIsRemovalScheduled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hideActionMessage, setHideActionMessage] = useState(false);

  function clearRemovalTimers() {
    if (removalTimeoutRef.current !== null) {
      window.clearTimeout(removalTimeoutRef.current);
      removalTimeoutRef.current = null;
    }

    if (progressIntervalRef.current !== null) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }

  const [state, formAction, isPending] = useActionState(
    async (
      previousState: RemoveItemActionState,
      formData: FormData,
    ): Promise<RemoveItemActionState> => {
      const nextState = await removeItemAction(previousState, formData);

      clearRemovalTimers();
      setIsRemovalScheduled(false);
      setProgress(0);

      if (nextState.status === "error") {
        setHideActionMessage(false);
      }

      return nextState;
    },
    initialRemoveItemActionState,
  );

  useEffect(() => {
    return () => {
      if (removalTimeoutRef.current !== null) {
        window.clearTimeout(removalTimeoutRef.current);
      }

      if (progressIntervalRef.current !== null) {
        window.clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  function startRemoval() {
    if (isPending || isRemovalScheduled) {
      return;
    }

    clearRemovalTimers();
    setHideActionMessage(true);
    setIsRemovalScheduled(true);
    setProgress(0);

    const startedAt = performance.now();

    progressIntervalRef.current = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;

      setProgress(Math.min(100, (elapsed / REMOVAL_DELAY_MS) * 100));
    }, PROGRESS_INTERVAL_MS);

    removalTimeoutRef.current = window.setTimeout(() => {
      if (progressIntervalRef.current !== null) {
        window.clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      removalTimeoutRef.current = null;
      setProgress(100);
      formRef.current?.requestSubmit();
    }, REMOVAL_DELAY_MS);
  }

  function undoRemoval() {
    clearRemovalTimers();
    setIsRemovalScheduled(false);
    setProgress(0);
    setHideActionMessage(true);
  }

  const showError = state.status === "error" && !hideActionMessage;

  const showProgress = isRemovalScheduled || isPending;

  return (
    <form ref={formRef} action={formAction} className="contents">
      <input type="hidden" name="billId" value={billId} />

      <input type="hidden" name="itemId" value={itemId} />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="min-h-11 touch-manipulation px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
        disabled={isPending}
        aria-label={
          isPending
            ? "Removing item"
            : isRemovalScheduled
              ? "Undo item removal"
              : "Remove item"
        }
        aria-busy={isPending}
        onClick={isRemovalScheduled ? undoRemoval : startRemoval}
      >
        <span className="grid place-items-center">
          <span className="invisible col-start-1 row-start-1">Remove</span>
          <span className="col-start-1 row-start-1">
            {showProgress ? "Undo" : "Remove"}
          </span>
        </span>
      </Button>

      {showProgress ? (
        <div
          role="progressbar"
          aria-label="Time remaining to undo item removal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-destructive/15"
        >
          <div
            aria-hidden="true"
            className="h-full bg-destructive transition-[width] duration-100 ease-linear"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      ) : null}

      {showError ? (
        <p
          role="alert"
          className="w-full text-right text-sm leading-5 text-destructive"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
