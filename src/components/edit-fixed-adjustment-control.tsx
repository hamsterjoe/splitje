"use client";

import {
    useActionState,
    useEffect,
    useId,
    useState,
} from "react";

import { updateFixedAdjustmentAction } from "@/app/bills/[billId]/update-fixed-adjustment-action";
import { initialUpdateFixedAdjustmentActionState } from "@/app/bills/[billId]/update-fixed-adjustment-action-state";
import { formatRinggitDigitInput } from "@/application/billing/validation/format-ringgit-digit-input";
import { getDefaultBillAdjustmentLabel } from "@/application/billing/validation/get-default-bill-adjustment-label";
import { parseRinggitInput } from "@/application/billing/validation/parse-ringgit-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BillAdjustmentType } from "@/domain/billing/types";

type EditableFixedAdjustmentType =
    Exclude<
        BillAdjustmentType,
        "rounding"
    >;

interface EditFixedAdjustmentControlProps {
    billId: string;
    adjustmentId: string;
    adjustmentType:
    EditableFixedAdjustmentType;
    adjustmentLabel: string;
    amountSen: number;
}

export function EditFixedAdjustmentControl({
    billId,
    adjustmentId,
    adjustmentType,
    adjustmentLabel,
    amountSen,
}: EditFixedAdjustmentControlProps) {
    const [
        state,
        formAction,
        isPending,
    ] = useActionState(
        updateFixedAdjustmentAction,
        initialUpdateFixedAdjustmentActionState,
    );

    const formId = useId();

    const [
        isEditing,
        setIsEditing,
    ] = useState(false);

    const [label, setLabel] =
        useState(adjustmentLabel);

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

    useEffect(() => {
        if (
            state.status === "success"
        ) {
            setIsEditing(false);
            setAmountTouched(false);
            setEditedSinceSubmission(
                false,
            );
        }

        if (
            state.status === "error"
        ) {
            setEditedSinceSubmission(
                false,
            );
        }
    }, [state]);

    function startEditing() {
        setLabel(adjustmentLabel);
        setAmount(
            formatSenForInput(
                amountSen,
            ),
        );
        setAmountTouched(false);
        setEditedSinceSubmission(
            true,
        );
        setIsEditing(true);
    }

    function cancelEditing() {
        setLabel(adjustmentLabel);
        setAmount(
            formatSenForInput(
                amountSen,
            ),
        );
        setAmountTouched(false);
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
            : undefined;

    const amountError =
        amountTouched
            ? amountLocalError
            : editedSinceSubmission
                ? undefined
                : state.fieldErrors.amount;

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

    const labelId =
        `${formId}-label`;

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

            <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                    <Label
                        htmlFor={labelId}
                    >
                        Label
                    </Label>

                    <Input
                        id={labelId}
                        name="label"
                        type="text"
                        autoComplete="off"
                        enterKeyHint="next"
                        placeholder={
                            getDefaultBillAdjustmentLabel(
                                adjustmentType,
                            )
                        }
                        value={label}
                        className="h-11 bg-card"
                        onChange={(
                            event,
                        ) => {
                            setLabel(
                                event.target
                                    .value,
                            );

                            setEditedSinceSubmission(
                                true,
                            );
                        }}
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <Label
                        htmlFor={amountId}
                    >
                        Amount (RM)
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
                            {adjustmentType ===
                                "discount"
                                ? "The discount is subtracted automatically."
                                : "Enter the amount shown on the receipt."}
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