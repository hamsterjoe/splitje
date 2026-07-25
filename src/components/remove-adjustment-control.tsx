"use client";

import {
    useActionState,
    useEffect,
    useRef,
    useState,
} from "react";

import { removeAdjustmentAction } from "@/app/bills/[billId]/remove-adjustment-action";
import { initialRemoveAdjustmentActionState } from "@/app/bills/[billId]/remove-adjustment-action-state";
import { Button } from "@/components/ui/button";

const removalDelayMs = 4_000;

interface RemoveAdjustmentControlProps {
    billId: string;
    adjustmentId: string;
    adjustmentLabel: string;
}

export function RemoveAdjustmentControl({
    billId,
    adjustmentId,
    adjustmentLabel,
}: RemoveAdjustmentControlProps) {
    const [
        state,
        formAction,
        isPending,
    ] = useActionState(
        removeAdjustmentAction,
        initialRemoveAdjustmentActionState,
    );

    const formRef =
        useRef<HTMLFormElement>(null);

    const removalTimerRef =
        useRef<
            ReturnType<
                typeof setTimeout
            > | null
        >(null);

    const [
        isScheduled,
        setIsScheduled,
    ] = useState(false);

    const [
        isCommitting,
        setIsCommitting,
    ] = useState(false);

    const [
        hideActionMessage,
        setHideActionMessage,
    ] = useState(false);

    useEffect(() => {
        return () => {
            clearRemovalTimer();
        };
    }, []);

    useEffect(() => {
        if (
            state.status === "error"
        ) {
            setIsScheduled(false);
            setIsCommitting(false);
            setHideActionMessage(
                false,
            );
        }
    }, [state]);

    function clearRemovalTimer() {
        if (
            removalTimerRef.current ===
            null
        ) {
            return;
        }

        clearTimeout(
            removalTimerRef.current,
        );

        removalTimerRef.current =
            null;
    }

    function scheduleRemoval() {
        if (
            isScheduled ||
            isCommitting ||
            isPending
        ) {
            return;
        }

        setHideActionMessage(true);
        setIsScheduled(true);

        removalTimerRef.current =
            setTimeout(() => {
                removalTimerRef.current =
                    null;

                setIsScheduled(false);
                setIsCommitting(true);

                const form =
                    formRef.current;

                if (form === null) {
                    setIsCommitting(
                        false,
                    );
                    return;
                }

                form.requestSubmit();
            }, removalDelayMs);
    }

    function undoRemoval() {
        clearRemovalTimer();
        setIsScheduled(false);
        setHideActionMessage(true);
    }

    const isRemoving =
        isCommitting || isPending;

    const showError =
        state.status === "error" &&
        !hideActionMessage;

    const liveMessage =
        isScheduled
            ? `${adjustmentLabel} scheduled for removal. Undo is available for 4 seconds.`
            : isRemoving
                ? `Removing ${adjustmentLabel}.`
                : null;

    return (
        <form
            ref={formRef}
            action={formAction}
            className="flex max-w-48 flex-col items-end gap-2"
        >
            <input
                type="hidden"
                name="billId"
                value={billId}
            />

            <input
                type="hidden"
                name="adjustmentId"
                value={adjustmentId}
            />

            <p
                className="sr-only"
                aria-live="polite"
            >
                {liveMessage}
            </p>

            {isScheduled ? (
                <div className="w-44 rounded-md border border-destructive/20 bg-destructive/5 p-2">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-xs leading-4 text-destructive">
                            Removing in 4
                            seconds…
                        </p>

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="min-h-11 touch-manipulation px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Undo removal of ${adjustmentLabel}`}
                            onClick={
                                undoRemoval
                            }
                        >
                            Undo
                        </Button>
                    </div>

                    <div
                        className="mt-1 h-1 overflow-hidden rounded-full bg-destructive/15"
                        aria-hidden="true"
                    >
                        <div className="removal-countdown-progress h-full w-full bg-destructive" />
                    </div>
                </div>
            ) : (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="min-h-11 touch-manipulation px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={isRemoving}
                    aria-label={`Remove ${adjustmentLabel}`}
                    onClick={
                        scheduleRemoval
                    }
                >
                    {isRemoving
                        ? "Removing…"
                        : "Remove"}
                </Button>
            )}

            {showError ? (
                <p
                    role="alert"
                    className="text-right text-sm leading-5 text-destructive"
                >
                    {state.message}
                </p>
            ) : null}
        </form>
    );
}