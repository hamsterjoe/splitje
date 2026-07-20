"use client";

import {
    useActionState,
    useEffect,
    useState,
} from "react";

import { addAdjustmentAction } from "@/app/bills/[billId]/add-adjustment-action";
import { initialAddAdjustmentActionState } from "@/app/bills/[billId]/add-adjustment-action-state";
import { formatRinggitDigitInput } from "@/application/billing/validation/format-ringgit-digit-input";
import { parseRinggitInput } from "@/application/billing/validation/parse-ringgit-input";
import { AddAdjustmentSubmitButton } from "@/components/add-adjustment-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddAdjustmentFormProps {
    billId: string;
}

type FixedAdjustmentType =
    | "service_charge"
    | "tax"
    | "discount"
    | "other";

type AdjustmentField =
    | "type"
    | "label"
    | "amount";

export function AddAdjustmentForm({
    billId,
}: AddAdjustmentFormProps) {
    const [state, formAction] = useActionState(
        addAdjustmentAction,
        initialAddAdjustmentActionState,
    );

    const [type, setType] =
        useState<FixedAdjustmentType>(
            "service_charge",
        );

    const [label, setLabel] = useState("");

    const [amount, setAmount] =
        useState("0.00");

    const [
        touchedFields,
        setTouchedFields,
    ] = useState<
        Partial<
            Record<AdjustmentField, boolean>
        >
    >({});

    const [
        editedSinceSubmission,
        setEditedSinceSubmission,
    ] = useState(false);

    useEffect(() => {
        if (state.status === "success") {
            setType("service_charge");
            setLabel("");
            setAmount("0.00");
            setTouchedFields({});
            setEditedSinceSubmission(false);
        }
    }, [state]);

    function markTouched(
        field: AdjustmentField,
    ) {
        setTouchedFields((current) => ({
            ...current,
            [field]: true,
        }));
    }

    function markEdited() {
        setEditedSinceSubmission(true);
    }

    const labelLocalError =
        touchedFields.label &&
            label.trim().length === 0
            ? "Enter an adjustment label."
            : undefined;

    const amountResult =
        touchedFields.amount
            ? parseRinggitInput(amount)
            : null;

    const amountLocalError =
        amountResult !== null &&
            !amountResult.success
            ? amountResult.message
            : undefined;

    const typeError =
        touchedFields.type
            ? undefined
            : state.fieldErrors.type;

    const labelError =
        touchedFields.label
            ? labelLocalError
            : state.fieldErrors.label;

    const amountError =
        touchedFields.amount
            ? amountLocalError
            : state.fieldErrors.amount;

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

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                    <Label htmlFor="adjustmentType">
                        Type
                    </Label>

                    <select
                        id="adjustmentType"
                        name="type"
                        value={type}
                        aria-invalid={Boolean(typeError)}
                        aria-describedby={
                            typeError
                                ? "adjustmentType-error"
                                : undefined
                        }
                        className="
              h-11 w-full touch-manipulation
              rounded-md border border-input
              bg-card px-3 py-2 text-sm
              text-foreground
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              aria-invalid:border-destructive
              aria-invalid:ring-destructive/20
            "
                        onChange={(event) => {
                            setType(
                                event.target
                                    .value as FixedAdjustmentType,
                            );

                            markTouched("type");
                            markEdited();
                        }}
                    >
                        <option value="service_charge">
                            Service charge
                        </option>

                        <option value="tax">
                            Tax / SST
                        </option>

                        <option value="discount">
                            Discount
                        </option>

                        <option value="other">
                            Other fee
                        </option>
                    </select>

                    {typeError ? (
                        <p
                            id="adjustmentType-error"
                            role="alert"
                            className="text-sm leading-5 text-destructive"
                        >
                            {typeError}
                        </p>
                    ) : null}
                </div>

                <div className="flex flex-col gap-2">
                    <Label htmlFor="adjustmentAmount">
                        Amount (RM)
                    </Label>

                    <Input
                        id="adjustmentAmount"
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
                                ? "adjustmentAmount-error"
                                : "adjustmentAmount-help"
                        }
                        className="
              h-11 bg-card tabular-nums
              aria-invalid:border-destructive
              aria-invalid:ring-destructive/20
            "
                        onChange={(event) => {
                            setAmount(
                                formatRinggitDigitInput(
                                    event.target.value,
                                ),
                            );

                            markTouched("amount");
                            markEdited();
                        }}
                        onBlur={() => {
                            markTouched("amount");
                        }}
                        onInvalid={(event) => {
                            event.preventDefault();
                            markTouched("amount");
                        }}
                    />

                    {amountError ? (
                        <p
                            id="adjustmentAmount-error"
                            role="alert"
                            className="text-sm leading-5 text-destructive"
                        >
                            {amountError}
                        </p>
                    ) : (
                        <p
                            id="adjustmentAmount-help"
                            className="text-sm leading-5 text-muted-foreground"
                        >
                            Discounts are subtracted
                            automatically.
                        </p>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="adjustmentLabel">
                    Label
                </Label>

                <Input
                    id="adjustmentLabel"
                    name="label"
                    type="text"
                    autoComplete="off"
                    enterKeyHint="next"
                    placeholder="e.g. Service charge"
                    required
                    value={label}
                    aria-invalid={Boolean(labelError)}
                    aria-describedby={
                        labelError
                            ? "adjustmentLabel-error"
                            : "adjustmentLabel-help"
                    }
                    className="
            h-11 bg-card
            aria-invalid:border-destructive
            aria-invalid:ring-destructive/20
          "
                    onChange={(event) => {
                        setLabel(event.target.value);
                        markTouched("label");
                        markEdited();
                    }}
                    onBlur={() => {
                        markTouched("label");
                    }}
                    onInvalid={(event) => {
                        event.preventDefault();
                        markTouched("label");
                    }}
                />

                {labelError ? (
                    <p
                        id="adjustmentLabel-error"
                        role="alert"
                        className="text-sm leading-5 text-destructive"
                    >
                        {labelError}
                    </p>
                ) : (
                    <p
                        id="adjustmentLabel-help"
                        className="text-sm leading-5 text-muted-foreground"
                    >
                        Use the wording printed on the
                        receipt.
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

            <AddAdjustmentSubmitButton />
        </form>
    );
}