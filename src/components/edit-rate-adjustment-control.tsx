"use client";

import {
    useActionState,
    useEffect,
    useId,
    useState,
} from "react";

import { updateRateAdjustmentAction } from "@/app/bills/[billId]/update-rate-adjustment-action";
import { initialUpdateRateAdjustmentActionState } from "@/app/bills/[billId]/update-rate-adjustment-action-state";
import { getDefaultBillAdjustmentLabel } from "@/application/billing/validation/get-default-bill-adjustment-label";
import { parsePercentageInput } from "@/application/billing/validation/parse-percentage-input";
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
import type { BillAdjustmentType } from "@/domain/billing/types";

type EditableRateAdjustmentType =
    Exclude<
        BillAdjustmentType,
        "rounding"
    >;

type AdjustmentScope =
    | "all_items"
    | "selected_items";

interface RateAdjustmentScopeItem {
    id: string;
    description: string;
    lineTotalSen: number;
}

interface EditRateAdjustmentControlProps {
    billId: string;
    adjustmentId: string;
    adjustmentType:
    EditableRateAdjustmentType;
    adjustmentLabel: string;
    rateBasisPoints: number;
    appliesToAllItems: boolean;
    applicableItemIds: string[];
    currency: string;
    items:
    RateAdjustmentScopeItem[];
}

function getInitialScope(
    appliesToAllItems: boolean,
): AdjustmentScope {
    return appliesToAllItems
        ? "all_items"
        : "selected_items";
}

export function EditRateAdjustmentControl({
    billId,
    adjustmentId,
    adjustmentType,
    adjustmentLabel,
    rateBasisPoints,
    appliesToAllItems,
    applicableItemIds,
    currency,
    items,
}: EditRateAdjustmentControlProps) {
    const [
        state,
        formAction,
        isPending,
    ] = useActionState(
        updateRateAdjustmentAction,
        initialUpdateRateAdjustmentActionState,
    );

    const formId = useId();

    const [
        isEditing,
        setIsEditing,
    ] = useState(false);

    const [label, setLabel] =
        useState(adjustmentLabel);

    const [
        percentage,
        setPercentage,
    ] = useState(
        formatBasisPointsForInput(
            rateBasisPoints,
        ),
    );

    const [scope, setScope] =
        useState<AdjustmentScope>(
            getInitialScope(
                appliesToAllItems,
            ),
        );

    const [
        selectedItemIds,
        setSelectedItemIds,
    ] = useState<string[]>(
        applicableItemIds,
    );

    const [
        percentageTouched,
        setPercentageTouched,
    ] = useState(false);

    const [
        scopeTouched,
        setScopeTouched,
    ] = useState(false);

    const [
        applicableItemsTouched,
        setApplicableItemsTouched,
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
            setPercentageTouched(false);
            setScopeTouched(false);
            setApplicableItemsTouched(
                false,
            );
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

    function resetDraft() {
        setLabel(adjustmentLabel);

        setPercentage(
            formatBasisPointsForInput(
                rateBasisPoints,
            ),
        );

        setScope(
            getInitialScope(
                appliesToAllItems,
            ),
        );

        setSelectedItemIds(
            applicableItemIds,
        );

        setPercentageTouched(false);
        setScopeTouched(false);
        setApplicableItemsTouched(
            false,
        );
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

    const percentageResult =
        percentageTouched
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

    const percentageError =
        percentageTouched
            ? percentageLocalError
            : editedSinceSubmission
                ? undefined
                : state.fieldErrors
                    .percentage;

    const scopeError =
        scopeTouched ||
            editedSinceSubmission
            ? undefined
            : state.fieldErrors.scope;

    const applicableItemsLocalError =
        applicableItemsTouched &&
            scope === "selected_items" &&
            selectedItemIds.length === 0
            ? "Select at least one applicable item."
            : undefined;

    const applicableItemsError =
        applicableItemsTouched
            ? applicableItemsLocalError
            : editedSinceSubmission
                ? undefined
                : state.fieldErrors
                    .applicableItemIds;

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

    const percentageId =
        `${formId}-percentage`;

    const percentageErrorId =
        `${formId}-percentage-error`;

    const percentageHelpId =
        `${formId}-percentage-help`;

    const scopeId =
        `${formId}-scope`;

    const scopeErrorId =
        `${formId}-scope-error`;

    const scopeHelpId =
        `${formId}-scope-help`;

    const applicableItemsErrorId =
        `${formId}-applicable-items-error`;

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
                        htmlFor={
                            percentageId
                        }
                    >
                        Percentage (%)
                    </Label>

                    <Input
                        id={percentageId}
                        name="percentage"
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        enterKeyHint="done"
                        spellCheck={false}
                        maxLength={6}
                        required
                        value={percentage}
                        aria-invalid={Boolean(
                            percentageError,
                        )}
                        aria-describedby={
                            percentageError
                                ? percentageErrorId
                                : percentageHelpId
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

                            setEditedSinceSubmission(
                                true,
                            );
                        }}
                        onBlur={() => {
                            setPercentageTouched(
                                true,
                            );
                        }}
                        onInvalid={(
                            event,
                        ) => {
                            event.preventDefault();
                            setPercentageTouched(
                                true,
                            );
                        }}
                    />

                    {percentageError ? (
                        <p
                            id={
                                percentageErrorId
                            }
                            role="alert"
                            className="text-sm leading-5 text-destructive"
                        >
                            {
                                percentageError
                            }
                        </p>
                    ) : (
                        <p
                            id={
                                percentageHelpId
                            }
                            className="text-sm leading-5 text-muted-foreground"
                        >
                            {adjustmentType ===
                                "discount"
                                ? "The discount is subtracted automatically."
                                : "Calculated using half-up rounding."}
                        </p>
                    )}
                </div>
            </div>

            <fieldset
                className="mt-4 flex flex-col gap-3"
                aria-invalid={Boolean(
                    scopeError ||
                    applicableItemsError,
                )}
                aria-describedby={
                    scopeError
                        ? scopeErrorId
                        : applicableItemsError
                            ? applicableItemsErrorId
                            : scopeHelpId
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
                    onValueChange={(
                        nextScope,
                    ) => {
                        if (
                            nextScope !==
                            "all_items" &&
                            nextScope !==
                            "selected_items"
                        ) {
                            return;
                        }

                        setScope(
                            nextScope,
                        );
                        setScopeTouched(
                            true,
                        );

                        setApplicableItemsTouched(
                            false,
                        );

                        setEditedSinceSubmission(
                            true,
                        );
                    }}
                >
                    <SelectTrigger
                        id={scopeId}
                        aria-invalid={Boolean(
                            scopeError,
                        )}
                        className="h-11 w-full bg-card"
                    >
                        <SelectValue>
                            {scope ===
                                "all_items"
                                ? "All items"
                                : "Selected items"}
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
                        id={scopeErrorId}
                        role="alert"
                        className="text-sm leading-5 text-destructive"
                    >
                        {scopeError}
                    </p>
                ) : null}

                {scope ===
                    "selected_items" ? (
                    <div className="overflow-hidden rounded-lg border bg-card">
                        <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-3 py-2">
                            <p className="text-sm font-medium">
                                Select applicable
                                receipt items
                            </p>

                            <span className="shrink-0 text-xs text-muted-foreground">
                                {
                                    selectedItemIds.length
                                }{" "}
                                selected
                            </span>
                        </div>

                        <div className="divide-y">
                            {items.map(
                                (item) => {
                                    const checked =
                                        selectedItemIds.includes(
                                            item.id,
                                        );

                                    return (
                                        <label
                                            key={
                                                item.id
                                            }
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

                                                    setApplicableItemsTouched(
                                                        true,
                                                    );

                                                    setEditedSinceSubmission(
                                                        true,
                                                    );
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
                                },
                            )}
                        </div>
                    </div>
                ) : null}

                {applicableItemsError ? (
                    <p
                        id={
                            applicableItemsErrorId
                        }
                        role="alert"
                        className="text-sm leading-5 text-destructive"
                    >
                        {
                            applicableItemsError
                        }
                    </p>
                ) : (
                    <p
                        id={scopeHelpId}
                        className="text-sm leading-5 text-muted-foreground"
                    >
                        {scope ===
                            "all_items"
                            ? "The percentage is calculated from the complete item subtotal."
                            : "The percentage is calculated only from the selected item totals."}
                    </p>
                )}
            </fieldset>

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

function formatBasisPointsForInput(
    basisPoints: number,
): string {
    const absoluteBasisPoints =
        Math.abs(basisPoints);

    const wholePercentage =
        Math.floor(
            absoluteBasisPoints /
            100,
        );

    const fractionalBasisPoints =
        absoluteBasisPoints % 100;

    if (
        fractionalBasisPoints === 0
    ) {
        return String(
            wholePercentage,
        );
    }

    if (
        fractionalBasisPoints %
        10 ===
        0
    ) {
        return `${wholePercentage}.${fractionalBasisPoints / 10}`;
    }

    return `${wholePercentage}.${String(
        fractionalBasisPoints,
    ).padStart(2, "0")}`;
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