"use client";

import {
    useActionState,
    useState,
} from "react";

import { removeAdjustmentAction } from "@/app/bills/[billId]/remove-adjustment-action";
import { initialRemoveAdjustmentActionState, type RemoveAdjustmentActionState } from "@/app/bills/[billId]/remove-adjustment-action-state";
import { Button } from "@/components/ui/button";

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
        isConfirming,
        setIsConfirming,
    ] = useState(false);

    const [
        hideActionMessage,
        setHideActionMessage,
    ] = useState(false);

    const [
        state,
        formAction,
        isPending,
    ] = useActionState(
        async (
            previousState: RemoveAdjustmentActionState,
            formData: FormData,
        ): Promise<RemoveAdjustmentActionState> => {
            const nextState =
                await removeAdjustmentAction(
                    previousState,
                    formData,
                );

            if (
                nextState.status ===
                "error"
            ) {
                setHideActionMessage(
                    false,
                );
            }

            return nextState;
        },
        initialRemoveAdjustmentActionState,
    );

    function startConfirmation() {
        setHideActionMessage(true);
        setIsConfirming(true);
    }

    function cancelConfirmation() {
        setHideActionMessage(true);
        setIsConfirming(false);
    }

    const showError =
        state.status === "error" &&
        !hideActionMessage;

    return (
        <form
            action={formAction}
            className="flex max-w-52 flex-col items-end gap-2"
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

            {isConfirming ? (
                <div className="flex flex-col items-end gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-2">
                    <p className="text-right text-xs leading-4 text-destructive">
                        Remove{" "}
                        <span className="font-medium">
                            {adjustmentLabel}
                        </span>
                        ?
                    </p>

                    <div className="flex flex-wrap justify-end gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="min-h-11 touch-manipulation px-3"
                            disabled={isPending}
                            onClick={
                                cancelConfirmation
                            }
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            variant="destructive"
                            size="sm"
                            className="min-h-11 touch-manipulation px-3"
                            disabled={isPending}
                            aria-disabled={
                                isPending
                            }
                            aria-busy={
                                isPending
                            }
                        >
                            {isPending
                                ? "Removing…"
                                : "Remove adjustment"}
                        </Button>
                    </div>
                </div>
            ) : (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="min-h-11 touch-manipulation px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove ${adjustmentLabel}`}
                    onClick={
                        startConfirmation
                    }
                >
                    Remove
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