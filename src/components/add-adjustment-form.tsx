"use client";

import {
    useActionState,
    useEffect,
    useState,
} from "react";

import { addAdjustmentAction } from "@/app/bills/[billId]/add-adjustment-action";
import { initialAddAdjustmentActionState } from "@/app/bills/[billId]/add-adjustment-action-state";
import { formatRinggitDigitInput } from "@/application/billing/validation/format-ringgit-digit-input";
import { parsePercentageInput } from "@/application/billing/validation/parse-percentage-input";
import { parseRinggitInput } from "@/application/billing/validation/parse-ringgit-input";
import { AddAdjustmentSubmitButton } from "@/components/add-adjustment-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface AddAdjustmentFormProps {
    billId: string;
    hasItems: boolean;
}

type FixedAdjustmentType =
    | "service_charge"
    | "tax"
    | "discount"
    | "other";

type CalculationMethod =
    | "fixed"
    | "rate";

type AdjustmentField =
    | "calculationMethod"
    | "type"
    | "label"
    | "amount"
    | "percentage";

const adjustmentTypeLabels:
    Record<
        FixedAdjustmentType,
        string
    > = {
    service_charge:
        "Service charge",
    tax: "Tax / SST",
    discount: "Discount",
    other: "Other fee",
};

const calculationMethodLabels:
    Record<
        CalculationMethod,
        string
    > = {
    fixed: "Fixed amount",
    rate: "Percentage",
};

function isFixedAdjustmentType(
    value: unknown,
): value is FixedAdjustmentType {
    return (
        value === "service_charge" ||
        value === "tax" ||
        value === "discount" ||
        value === "other"
    );
}

function isCalculationMethod(
    value: unknown,
): value is CalculationMethod {
    return (
        value === "fixed" ||
        value === "rate"
    );
}

export function AddAdjustmentForm({
    billId,
    hasItems,
}: AddAdjustmentFormProps) {
    const [state, formAction] =
        useActionState(
            addAdjustmentAction,
            initialAddAdjustmentActionState,
        );

    const [type, setType] =
        useState<FixedAdjustmentType>(
            "service_charge",
        );

    const [
        calculationMethod,
        setCalculationMethod,
    ] = useState<CalculationMethod>(
        "fixed",
    );

    const [label, setLabel] =
        useState("");

    const [amount, setAmount] =
        useState("0.00");

    const [percentage, setPercentage] =
        useState("");

    const [
        touchedFields,
        setTouchedFields,
    ] = useState<
        Partial<
            Record<
                AdjustmentField,
                boolean
            >
        >
    >({});

    const [
        editedSinceSubmission,
        setEditedSinceSubmission,
    ] = useState(false);

    useEffect(() => {
        if (state.status === "success") {
            setType("service_charge");
            setCalculationMethod("fixed");
            setLabel("");
            setAmount("0.00");
            setPercentage("");
            setTouchedFields({});
            setEditedSinceSubmission(
                false,
            );
        }
    }, [state]);

    function markTouched(
        field: AdjustmentField,
    ) {
        setTouchedFields(
            (current) => ({
                ...current,
                [field]: true,
            }),
        );
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

    const percentageResult =
        touchedFields.percentage
            ? parsePercentageInput(
                percentage,
            )
            : null;

    const percentageLocalError =
        percentageResult !== null &&
            !percentageResult.success
            ? percentageResult.message
            : percentageResult !== null &&
                percentageResult
                    .basisPoints === 0
                ? "Enter a percentage greater than 0."
                : undefined;

    const typeError =
        touchedFields.type
            ? undefined
            : state.fieldErrors.type;

    const calculationMethodError =
        touchedFields.calculationMethod
            ? undefined
            : state.fieldErrors
                .calculationMethod;

    const labelError =
        touchedFields.label
            ? labelLocalError
            : state.fieldErrors.label;

    const amountError =
        touchedFields.amount
            ? amountLocalError
            : state.fieldErrors.amount;

    const percentageError =
        touchedFields.percentage
            ? percentageLocalError
            : state.fieldErrors.percentage;

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

            <input
                type="hidden"
                name="type"
                value={type}
            />

            <input
                type="hidden"
                name="calculationMethod"
                value={calculationMethod}
            />

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                    <Label htmlFor="adjustmentType">
                        Type
                    </Label>

                    <Select
                        value={type}
                        onValueChange={(
                            nextType,
                        ) => {
                            if (
                                !isFixedAdjustmentType(
                                    nextType,
                                )
                            ) {
                                return;
                            }

                            setType(nextType);
                            markTouched(
                                "type",
                            );
                            markEdited();
                        }}
                    >
                        <SelectTrigger
                            id="adjustmentType"
                            aria-invalid={Boolean(
                                typeError,
                            )}
                            aria-describedby={
                                typeError
                                    ? "adjustmentType-error"
                                    : undefined
                            }
                            className="h-11 w-full bg-card"
                        >
                            <SelectValue>
                                {
                                    adjustmentTypeLabels[
                                    type
                                    ]
                                }
                            </SelectValue>
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value="service_charge">
                                {
                                    adjustmentTypeLabels.service_charge
                                }
                            </SelectItem>

                            <SelectItem value="tax">
                                {
                                    adjustmentTypeLabels.tax
                                }
                            </SelectItem>

                            <SelectItem value="discount">
                                {
                                    adjustmentTypeLabels.discount
                                }
                            </SelectItem>

                            <SelectItem value="other">
                                {
                                    adjustmentTypeLabels.other
                                }
                            </SelectItem>
                        </SelectContent>
                    </Select>

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
                    <Label htmlFor="adjustmentCalculationMethod">
                        Calculation
                    </Label>

                    <Select
                        value={
                            calculationMethod
                        }
                        onValueChange={(
                            nextMethod,
                        ) => {
                            if (
                                !isCalculationMethod(
                                    nextMethod,
                                )
                            ) {
                                return;
                            }

                            setCalculationMethod(
                                nextMethod,
                            );

                            markTouched(
                                "calculationMethod",
                            );

                            markEdited();
                        }}
                    >
                        <SelectTrigger
                            id="adjustmentCalculationMethod"
                            aria-invalid={Boolean(
                                calculationMethodError,
                            )}
                            aria-describedby={
                                calculationMethodError
                                    ? "adjustmentCalculationMethod-error"
                                    : !hasItems
                                        ? "adjustmentCalculationMethod-help"
                                        : undefined
                            }
                            className="h-11 w-full bg-card"
                        >
                            <SelectValue>
                                {
                                    calculationMethodLabels[
                                    calculationMethod
                                    ]
                                }
                            </SelectValue>
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value="fixed">
                                Fixed amount
                            </SelectItem>

                            <SelectItem
                                value="rate"
                                disabled={
                                    !hasItems
                                }
                            >
                                Percentage
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    {calculationMethodError ? (
                        <p
                            id="adjustmentCalculationMethod-error"
                            role="alert"
                            className="text-sm leading-5 text-destructive"
                        >
                            {
                                calculationMethodError
                            }
                        </p>
                    ) : !hasItems ? (
                        <p
                            id="adjustmentCalculationMethod-help"
                            className="text-sm leading-5 text-muted-foreground"
                        >
                            Add an item to
                            enable percentage
                            adjustments.
                        </p>
                    ) : null}
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
                    aria-invalid={Boolean(
                        labelError,
                    )}
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
                        setLabel(
                            event.target.value,
                        );
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
                        Use the wording
                        printed on the
                        receipt.
                    </p>
                )}
            </div>

            {calculationMethod ===
                "fixed" ? (
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

                            markTouched(
                                "amount",
                            );
                            markEdited();
                        }}
                        onBlur={() => {
                            markTouched(
                                "amount",
                            );
                        }}
                        onInvalid={(
                            event,
                        ) => {
                            event.preventDefault();
                            markTouched(
                                "amount",
                            );
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
                            Discounts are
                            subtracted
                            automatically.
                        </p>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    <Label htmlFor="adjustmentPercentage">
                        Percentage (%)
                    </Label>

                    <Input
                        id="adjustmentPercentage"
                        name="percentage"
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        enterKeyHint="done"
                        spellCheck={false}
                        maxLength={6}
                        placeholder="6"
                        required
                        value={percentage}
                        aria-invalid={Boolean(
                            percentageError,
                        )}
                        aria-describedby={
                            percentageError
                                ? "adjustmentPercentage-error"
                                : "adjustmentPercentage-help"
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
                            setPercentage(
                                event.target
                                    .value,
                            );

                            markTouched(
                                "percentage",
                            );
                            markEdited();
                        }}
                        onBlur={() => {
                            markTouched(
                                "percentage",
                            );
                        }}
                        onInvalid={(
                            event,
                        ) => {
                            event.preventDefault();
                            markTouched(
                                "percentage",
                            );
                        }}
                    />

                    {percentageError ? (
                        <p
                            id="adjustmentPercentage-error"
                            role="alert"
                            className="text-sm leading-5 text-destructive"
                        >
                            {
                                percentageError
                            }
                        </p>
                    ) : (
                        <p
                            id="adjustmentPercentage-help"
                            className="text-sm leading-5 text-muted-foreground"
                        >
                            Calculated from
                            the full item
                            subtotal using
                            half-up rounding.
                        </p>
                    )}
                </div>
            )}

            <div
                aria-live="polite"
                aria-atomic="true"
            >
                {showStatusMessage ? (
                    <p
                        role={
                            state.status ===
                                "error"
                                ? "alert"
                                : "status"
                        }
                        className={
                            state.status ===
                                "error"
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