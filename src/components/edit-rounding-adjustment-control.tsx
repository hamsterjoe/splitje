"use client";

import {
    useActionState,
    useId,
    useState,
} from "react";

import { updateRoundingAdjustmentAction } from "@/app/bills/[billId]/update-rounding-adjustment-action";
import { initialUpdateRoundingAdjustmentActionState, type UpdateRoundingAdjustmentActionState } from "@/app/bills/[billId]/update-rounding-adjustment-action-state";
import { formatRinggitDigitInput } from "@/application/billing/validation/format-ringgit-digit-input";
import { parseRinggitInput } from "@/application/billing/validation/parse-ringgit-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type RoundingDirection =
    | "add"
    | "subtract";

interface EditRoundingAdjustmentControlProps {
    billId: string;
    adjustmentId: string;
    amountSen: number;
}

function getDirection(
    amountSen: number,
): RoundingDirection {
    return amountSen < 0
        ? "subtract"
        : "add";
}

export function EditRoundingAdjustmentControl({
    billId,
    adjustmentId,
    amountSen,
}: EditRoundingAdjustmentControlProps) {
    const formId = useId();

    const [
        isEditing,
        setIsEditing,
    ] = useState(false);

    const [
        direction,
        setDirection,
    ] = useState<RoundingDirection>(
        getDirection(amountSen),
    );

    const [amount, setAmount] =
        useState(
            formatSenForInput(
                amountSen,
            ),
        );

    const [
        amountTouched,
        setAmountTouched,
    ] = useState(false);

    const [
        editedSinceSubmission,
        setEditedSinceSubmission,
    ] = useState(false);

    const [
        state,
        formAction,
        isPending,
    ] = useActionState(
        async (
            previousState: UpdateRoundingAdjustmentActionState,
            formData: FormData,
        ): Promise<UpdateRoundingAdjustmentActionState> => {
            const nextState =
                await updateRoundingAdjustmentAction(
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
                setIsEditing(false);
                setAmountTouched(
                    false,
                );
            }

            return nextState;
        },
        initialUpdateRoundingAdjustmentActionState,
    );

    function resetDraft() {
        setDirection(
            getDirection(amountSen),
        );

        setAmount(
            formatSenForInput(
                amountSen,
            ),
        );

        setAmountTouched(false);
    }

    function startEditing() {
        resetDraft();
        setEditedSinceSubmission(
            true,
        );
        setIsEditing(true);
    }

    function cancelEditing() {
        resetDraft();
        setEditedSinceSubmission(
            true,
        );
        setIsEditing(false);
    }

    const amountResult =
        amountTouched
            ? parseRinggitInput(
                amount,
            )
            : null;

    const amountLocalError =
        amountResult !== null &&
            !amountResult.success
            ? amountResult.message
            : amountResult !== null &&
                amountResult
                    .amountSen === 0
                ? "Enter a rounding amount greater than zero."
                : undefined;

    const directionError =
        editedSinceSubmission
            ? undefined
            : state.fieldErrors
                .direction;

    const amountError =
        amountTouched
            ? amountLocalError
            : editedSinceSubmission
                ? undefined
                : state.fieldErrors
                    .amount;

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

    const directionId =
        `${formId}-direction`;

    const directionErrorId =
        `${formId}-direction-error`;

    const directionHelpId =
        `${formId}-direction-help`;

    const amountId =
        `${formId}-amount`;

    const amountErrorId =
        `${formId}-amount-error`;

    const amountHelpId =
        `${formId}-amount-help`;

    return (
        <form
            action={formAction}
            className="w-full rounded-lg border bg-muted/20 p-3"
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

            <input
                type="hidden"
                name="direction"
                value={direction}
            />

            <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                    <Label
                        htmlFor={
                            directionId
                        }
                    >
                        Direction
                    </Label>

                    <Select
                        value={direction}
                        onValueChange={(
                            nextDirection,
                        ) => {
                            if (
                                nextDirection !==
                                "add" &&
                                nextDirection !==
                                "subtract"
                            ) {
                                return;
                            }

                            setDirection(
                                nextDirection,
                            );

                            setEditedSinceSubmission(
                                true,
                            );
                        }}
                    >
                        <SelectTrigger
                            id={
                                directionId
                            }
                            aria-invalid={Boolean(
                                directionError,
                            )}
                            aria-describedby={
                                directionError
                                    ? directionErrorId
                                    : directionHelpId
                            }
                            className="h-11 w-full bg-card"
                        >
                            <SelectValue>
                                {direction ===
                                    "add"
                                    ? "Add"
                                    : "Subtract"}
                            </SelectValue>
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value="subtract">
                                Subtract
                            </SelectItem>

                            <SelectItem value="add">
                                Add
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    {directionError ? (
                        <p
                            id={
                                directionErrorId
                            }
                            role="alert"
                            className="text-sm leading-5 text-destructive"
                        >
                            {
                                directionError
                            }
                        </p>
                    ) : (
                        <p
                            id={
                                directionHelpId
                            }
                            className="text-sm leading-5 text-muted-foreground"
                        >
                            Match the sign
                            printed on the
                            receipt.
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-2">
                    <Label
                        htmlFor={amountId}
                    >
                        Rounding amount (RM)
                    </Label>

                    <Input
                        id={amountId}
                        name="amount"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        enterKeyHint="done"
                        spellCheck={false}
                        maxLength={11}
                        required
                        value={amount}
                        aria-invalid={Boolean(
                            amountError,
                        )}
                        aria-describedby={
                            amountError
                                ? amountErrorId
                                : amountHelpId
                        }
                        className="
                            h-11 bg-card
                            tabular-nums
                            aria-invalid:border-destructive
                            aria-invalid:ring-destructive/20
                        "
                        onChange={(
                            event,
                        ) => {
                            setAmount(
                                formatRinggitDigitInput(
                                    event
                                        .target
                                        .value,
                                ),
                            );

                            setEditedSinceSubmission(
                                true,
                            );
                        }}
                        onInvalid={(
                            event,
                        ) => {
                            event.preventDefault();
                            setAmountTouched(
                                true,
                            );
                        }}
                    />

                    {amountError ? (
                        <p
                            id={
                                amountErrorId
                            }
                            role="alert"
                            className="text-sm leading-5 text-destructive"
                        >
                            {amountError}
                        </p>
                    ) : (
                        <p
                            id={
                                amountHelpId
                            }
                            className="text-sm leading-5 text-muted-foreground"
                        >
                            Enter the absolute
                            rounding amount.
                        </p>
                    )}
                </div>
            </div>

            <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11 touch-manipulation"
                    disabled={isPending}
                    onClick={
                        cancelEditing
                    }
                >
                    Cancel
                </Button>

                <Button
                    type="submit"
                    className="min-h-11 touch-manipulation"
                    disabled={isPending}
                    aria-disabled={
                        isPending
                    }
                    aria-busy={
                        isPending
                    }
                >
                    {isPending
                        ? "Saving changes…"
                        : "Save changes"}
                </Button>
            </div>

            {showStatusMessage ? (
                <p
                    role="alert"
                    className="mt-3 text-sm leading-5 text-destructive"
                >
                    {state.message}
                </p>
            ) : null}
        </form>
    );
}

function formatSenForInput(
    amountSen: number,
): string {
    const absoluteAmountSen =
        Math.abs(amountSen);

    const ringgit =
        Math.floor(
            absoluteAmountSen /
            100,
        );

    const sen =
        absoluteAmountSen % 100;

    return `${ringgit}.${String(
        sen,
    ).padStart(2, "0")}`;
}