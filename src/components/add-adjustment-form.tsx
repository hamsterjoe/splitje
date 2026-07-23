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
import { getDefaultBillAdjustmentLabel } from "@/application/billing/validation/get-default-bill-adjustment-label";

interface AdjustmentScopeItem {
    id: string;
    description: string;
    lineTotalSen: number;
}

interface AddAdjustmentFormProps {
    billId: string;
    hasItems: boolean;
    currency: string;
    items: AdjustmentScopeItem[];
}

type AdjustmentType =
    | "service_charge"
    | "tax"
    | "discount"
    | "rounding"
    | "other";

type RoundingDirection =
    | "add"
    | "subtract";

type CalculationMethod =
    | "fixed"
    | "rate";

type AdjustmentField =
    | "calculationMethod"
    | "type"
    | "amount"
    | "percentage"
    | "direction"
    | "scope"
    | "applicableItemIds";

type AdjustmentScope =
    | "all_items"
    | "selected_items";

const adjustmentScopeLabels:
    Record<
        AdjustmentScope,
        string
    > = {
    all_items: "All items",
    selected_items:
        "Selected items",
};

const adjustmentTypeLabels:
    Record<
        AdjustmentType,
        string
    > = {
    service_charge:
        "Service charge",
    tax: "Tax / SST",
    discount: "Discount",
    rounding: "Rounding",
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

const roundingDirectionLabels:
    Record<
        RoundingDirection,
        string
    > = {
    add: "Add",
    subtract: "Subtract",
};

interface AdjustmentDefaults {
    calculationMethod:
    CalculationMethod;
    percentage: string;
}

function isAdjustmentScope(
    value: unknown,
): value is AdjustmentScope {
    return (
        value === "all_items" ||
        value === "selected_items"
    );
}

function getAdjustmentDefaults(
    type: AdjustmentType,
    hasItems: boolean,
): AdjustmentDefaults {
    if (!hasItems) {
        return {
            calculationMethod: "fixed",
            percentage: "",
        };
    }

    if (type === "service_charge") {
        return {
            calculationMethod: "rate",
            percentage: "10",
        };
    }

    if (type === "tax") {
        return {
            calculationMethod: "rate",
            percentage: "6",
        };
    }

    return {
        calculationMethod: "fixed",
        percentage: "",
    };
}

function isAdjustmentType(
    value: unknown,
): value is AdjustmentType {
    return (
        value === "service_charge" ||
        value === "tax" ||
        value === "discount" ||
        value === "rounding" ||
        value === "other"
    );
}

function isRoundingDirection(
    value: unknown,
): value is RoundingDirection {
    return (
        value === "add" ||
        value === "subtract"
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

function formatMoney(
    amountSen: number,
    currency: string,
): string {
    return new Intl.NumberFormat(
        "en-MY",
        {
            style: "currency",
            currency,
        },
    ).format(amountSen / 100);
}

export function AddAdjustmentForm({
    billId,
    hasItems,
    currency,
    items,
}: AddAdjustmentFormProps) {
    const [state, formAction] =
        useActionState(
            addAdjustmentAction,
            initialAddAdjustmentActionState,
        );

    const [type, setType] =
        useState<AdjustmentType>(
            "service_charge",
        );

    const [
        calculationMethod,
        setCalculationMethod,
    ] = useState<CalculationMethod>(
        () => getAdjustmentDefaults(
            "service_charge",
            hasItems,
        ).calculationMethod,
    );

    const [label, setLabel] =
        useState("");

    const [amount, setAmount] =
        useState("0.00");

    const [
        roundingDirection,
        setRoundingDirection,
    ] = useState<RoundingDirection>(
        "subtract",
    );

    const [percentage, setPercentage] =
        useState(
            () => getAdjustmentDefaults(
                "service_charge",
                hasItems,
            ).percentage,
        );

    const [scope, setScope] =
        useState<AdjustmentScope>(
            "all_items",
        );

    const [
        selectedItemIds,
        setSelectedItemIds,
    ] = useState<string[]>([]);

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
            const defaults =
                getAdjustmentDefaults(
                    "service_charge",
                    hasItems,
                );

            setType("service_charge");

            setCalculationMethod(
                defaults.calculationMethod,
            );

            setLabel("");
            setAmount("0.00");

            setPercentage(
                defaults.percentage,
            );
            setTouchedFields({});
            setEditedSinceSubmission(
                false,
            );
            setRoundingDirection(
                "subtract",
            );

            setScope("all_items");
            setSelectedItemIds([]);
        }
    }, [state, hasItems]);

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

    const amountResult =
        touchedFields.amount
            ? parseRinggitInput(amount)
            : null;

    const amountLocalError =
        amountResult !== null &&
            !amountResult.success
            ? amountResult.message
            : type === "rounding" &&
                amountResult !== null &&
                amountResult.success &&
                amountResult.amountSen === 0
                ? "Enter a rounding amount greater than zero."
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

    const directionError =
        touchedFields.direction
            ? undefined
            : state.fieldErrors.direction;

    const amountError =
        touchedFields.amount
            ? amountLocalError
            : state.fieldErrors.amount;

    const percentageError =
        touchedFields.percentage
            ? percentageLocalError
            : state.fieldErrors.percentage;

    const scopeError =
        touchedFields.scope
            ? undefined
            : state.fieldErrors.scope;

    const applicableItemIdsLocalError =
        touchedFields.applicableItemIds &&
            scope === "selected_items" &&
            selectedItemIds.length === 0
            ? "Select at least one applicable item."
            : undefined;

    const applicableItemIdsError =
        touchedFields.applicableItemIds
            ? applicableItemIdsLocalError
            : state.fieldErrors
                .applicableItemIds;

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

            {type === "rounding" ? (
                <input
                    type="hidden"
                    name="direction"
                    value={roundingDirection}
                />
            ) : null}

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
                                !isAdjustmentType(
                                    nextType,
                                )
                            ) {
                                return;
                            }

                            const defaults =
                                getAdjustmentDefaults(
                                    nextType,
                                    hasItems,
                                );

                            setType(nextType);

                            setCalculationMethod(
                                defaults.calculationMethod,
                            );

                            setScope("all_items");
                            setSelectedItemIds([]);

                            setPercentage(
                                defaults.percentage,
                            );

                            if (nextType === "rounding") {
                                setRoundingDirection(
                                    "subtract",
                                );

                                setAmount("0.00");
                            }

                            markTouched("type");

                            markTouched(
                                "calculationMethod",
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

                            <SelectItem
                                value="rounding"
                                disabled={!hasItems}
                            >
                                {
                                    adjustmentTypeLabels.rounding
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

                {type === "rounding" ? (
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="roundingDirection">
                            Direction
                        </Label>

                        <Select
                            value={roundingDirection}
                            onValueChange={(
                                nextDirection,
                            ) => {
                                if (
                                    !isRoundingDirection(
                                        nextDirection,
                                    )
                                ) {
                                    return;
                                }

                                setRoundingDirection(
                                    nextDirection,
                                );

                                markTouched(
                                    "direction",
                                );

                                markEdited();
                            }}
                        >
                            <SelectTrigger
                                id="roundingDirection"
                                aria-invalid={Boolean(
                                    directionError,
                                )}
                                aria-describedby={
                                    directionError
                                        ? "roundingDirection-error"
                                        : "roundingDirection-help"
                                }
                                className="h-11 w-full bg-card"
                            >
                                <SelectValue>
                                    {
                                        roundingDirectionLabels[
                                        roundingDirection
                                        ]
                                    }
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
                                id="roundingDirection-error"
                                role="alert"
                                className="text-sm leading-5 text-destructive"
                            >
                                {directionError}
                            </p>
                        ) : (
                            <p
                                id="roundingDirection-help"
                                className="text-sm leading-5 text-muted-foreground"
                            >
                                Match the sign printed
                                on the receipt.
                            </p>
                        )}
                    </div>
                ) : (
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

                                if (nextMethod === "fixed") {
                                    setScope("all_items");
                                    setSelectedItemIds([]);
                                }

                                if (
                                    nextMethod === "rate" &&
                                    percentage.trim().length === 0
                                ) {
                                    const defaults =
                                        getAdjustmentDefaults(
                                            type,
                                            hasItems,
                                        );

                                    setPercentage(
                                        defaults.percentage,
                                    );
                                }

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
                )}
            </div>

            {type !== "rounding" ? (
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
                        placeholder={
                            getDefaultBillAdjustmentLabel(
                                type,
                            )
                        }
                        value={label}
                        className="h-11 bg-card"
                        onChange={(event) => {
                            setLabel(
                                event.target.value,
                            );
                            markEdited();
                        }}
                    />
                </div>
            ) : null}

            {type === "rounding" ||
                calculationMethod === "fixed" ? (
                <div className="flex flex-col gap-2">
                    <Label htmlFor="adjustmentAmount">
                        {type === "rounding"
                            ? "Rounding amount (RM)"
                            : "Amount (RM)"}
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
                            {type === "rounding"
                                ? "Enter the absolute rounding amount shown on the receipt."
                                : "Discounts are subtracted automatically."}
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
                            the eligible item
                            subtotal using
                            half-up rounding.
                        </p>
                    )}
                </div>
            )}


            {type !== "rounding" &&
                calculationMethod === "rate" ? (
                <fieldset
                    className="flex flex-col gap-3"
                    aria-invalid={Boolean(
                        scopeError ||
                        applicableItemIdsError,
                    )}
                    aria-describedby={
                        scopeError
                            ? "adjustmentScope-error"
                            : applicableItemIdsError
                                ? "applicableItemIds-error"
                                : "adjustmentScope-help"
                    }
                >
                    <legend className="text-sm font-medium">
                        Applies to
                    </legend>

                    <input
                        type="hidden"
                        name="scope"
                        value={scope}
                    />

                    <Select
                        value={scope}
                        onValueChange={(nextScope) => {
                            if (
                                !isAdjustmentScope(
                                    nextScope,
                                )
                            ) {
                                return;
                            }

                            setScope(nextScope);
                            markTouched("scope");
                            markEdited();
                        }}
                    >
                        <SelectTrigger
                            id="adjustmentScope"
                            aria-invalid={Boolean(
                                scopeError,
                            )}
                            className="h-11 w-full bg-card"
                        >
                            <SelectValue>
                                {
                                    adjustmentScopeLabels[
                                    scope
                                    ]
                                }
                            </SelectValue>
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value="all_items">
                                All items
                            </SelectItem>

                            <SelectItem value="selected_items">
                                Selected items
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    {scopeError ? (
                        <p
                            id="adjustmentScope-error"
                            role="alert"
                            className="text-sm leading-5 text-destructive"
                        >
                            {scopeError}
                        </p>
                    ) : null}

                    {scope === "selected_items" ? (
                        <div className="overflow-hidden rounded-lg border">
                            <div className="border-b bg-muted/30 px-3 py-2">
                                <p className="text-sm font-medium">
                                    Select applicable
                                    receipt items
                                </p>
                            </div>

                            <div className="divide-y">
                                {items.map((item) => {
                                    const checked =
                                        selectedItemIds.includes(
                                            item.id,
                                        );

                                    return (
                                        <label
                                            key={item.id}
                                            className="
                                    flex min-h-12
                                    cursor-pointer
                                    items-center gap-3
                                    px-3 py-2
                                    hover:bg-muted/30
                                "
                                        >
                                            <input
                                                type="checkbox"
                                                name="applicableItemIds"
                                                value={
                                                    item.id
                                                }
                                                checked={
                                                    checked
                                                }
                                                className="
                                        size-4
                                        shrink-0
                                        accent-primary
                                    "
                                                onChange={(
                                                    event,
                                                ) => {
                                                    setSelectedItemIds(
                                                        (
                                                            current,
                                                        ) =>
                                                            event
                                                                .target
                                                                .checked
                                                                ? [
                                                                    ...current,
                                                                    item.id,
                                                                ]
                                                                : current.filter(
                                                                    (
                                                                        itemId,
                                                                    ) =>
                                                                        itemId !==
                                                                        item.id,
                                                                ),
                                                    );

                                                    markTouched(
                                                        "applicableItemIds",
                                                    );

                                                    markEdited();
                                                }}
                                            />

                                            <span className="min-w-0 flex-1 break-words text-sm">
                                                {
                                                    item.description
                                                }
                                            </span>

                                            <span className="shrink-0 text-sm font-medium tabular-nums">
                                                {formatMoney(
                                                    item.lineTotalSen,
                                                    currency,
                                                )}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}

                    {applicableItemIdsError ? (
                        <p
                            id="applicableItemIds-error"
                            role="alert"
                            className="text-sm leading-5 text-destructive"
                        >
                            {
                                applicableItemIdsError
                            }
                        </p>
                    ) : (
                        <p
                            id="adjustmentScope-help"
                            className="text-sm leading-5 text-muted-foreground"
                        >
                            {scope ===
                                "all_items"
                                ? "The percentage is calculated from the complete item subtotal."
                                : "The percentage is calculated only from the selected item totals."}
                        </p>
                    )}
                </fieldset>
            ) : null}

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