"use client";

import {
    useActionState,
    useId,
    useState,
} from "react";

import { updateItemAction } from "@/app/bills/[billId]/update-item-action";
import { initialUpdateItemActionState, type UpdateItemActionState } from "@/app/bills/[billId]/update-item-action-state";
import { parseRinggitInput } from "@/application/billing/validation/parse-ringgit-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const POSTGRES_INTEGER_MAX =
    2_147_483_647;

type ItemField =
    | "description"
    | "quantity"
    | "unitPrice";

interface EditItemControlProps {
    billId: string;
    itemId: string;
    description: string;
    quantity: number;
    unitPriceSen: number;
}

function getQuantityError(
    value: string,
): string | undefined {
    const normalizedValue =
        value.trim();

    if (
        !/^\d+$/.test(
            normalizedValue,
        ) ||
        normalizedValue.length > 10
    ) {
        return "Enter a positive whole number.";
    }

    const parsedValue =
        Number(normalizedValue);

    if (
        !Number.isInteger(
            parsedValue,
        ) ||
        parsedValue <= 0 ||
        parsedValue >
        POSTGRES_INTEGER_MAX
    ) {
        return "Enter a positive whole number.";
    }

    return undefined;
}

function getUnitPriceError(
    value: string,
): string | undefined {
    const result =
        parseRinggitInput(value);

    return result.success
        ? undefined
        : result.message;
}

export function EditItemControl({
    billId,
    itemId,
    description,
    quantity,
    unitPriceSen,
}: EditItemControlProps) {
    const formId = useId();

    const [
        isEditing,
        setIsEditing,
    ] = useState(false);

    const [
        draftDescription,
        setDraftDescription,
    ] = useState(description);

    const [
        draftQuantity,
        setDraftQuantity,
    ] = useState(
        String(quantity),
    );

    const [
        draftUnitPrice,
        setDraftUnitPrice,
    ] = useState(
        formatSenForInput(
            unitPriceSen,
        ),
    );

    const [
        touchedFields,
        setTouchedFields,
    ] = useState<
        Partial<
            Record<
                ItemField,
                boolean
            >
        >
    >({});

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
            previousState: UpdateItemActionState,
            formData: FormData,
        ): Promise<UpdateItemActionState> => {
            const nextState =
                await updateItemAction(
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
                setTouchedFields(
                    {},
                );
            }

            return nextState;
        },
        initialUpdateItemActionState,
    );

    function resetDraft() {
        setDraftDescription(
            description,
        );

        setDraftQuantity(
            String(quantity),
        );

        setDraftUnitPrice(
            formatSenForInput(
                unitPriceSen,
            ),
        );

        setTouchedFields({});
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

    function markTouched(
        field: ItemField,
    ) {
        setTouchedFields(
            (current) => ({
                ...current,
                [field]: true,
            }),
        );
    }

    const descriptionLocalError =
        touchedFields.description &&
            draftDescription
                .trim()
                .length === 0
            ? "Enter an item description."
            : undefined;

    const quantityLocalError =
        touchedFields.quantity
            ? getQuantityError(
                draftQuantity,
            )
            : undefined;

    const unitPriceLocalError =
        touchedFields.unitPrice
            ? getUnitPriceError(
                draftUnitPrice,
            )
            : undefined;

    const descriptionError =
        touchedFields.description
            ? descriptionLocalError
            : editedSinceSubmission
                ? undefined
                : state.fieldErrors
                    .description;

    const quantityError =
        touchedFields.quantity
            ? quantityLocalError
            : editedSinceSubmission
                ? undefined
                : state.fieldErrors
                    .quantity;

    const unitPriceError =
        touchedFields.unitPrice
            ? unitPriceLocalError
            : editedSinceSubmission
                ? undefined
                : state.fieldErrors
                    .unitPrice;

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

    const descriptionId =
        `${formId}-description`;

    const descriptionErrorId =
        `${formId}-description-error`;

    const quantityId =
        `${formId}-quantity`;

    const quantityErrorId =
        `${formId}-quantity-error`;

    const unitPriceId =
        `${formId}-unit-price`;

    const unitPriceErrorId =
        `${formId}-unit-price-error`;

    const unitPriceHelpId =
        `${formId}-unit-price-help`;

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
                name="itemId"
                value={itemId}
            />

            <div className="flex flex-col gap-2">
                <Label
                    htmlFor={
                        descriptionId
                    }
                >
                    Item
                </Label>

                <Input
                    id={descriptionId}
                    name="description"
                    type="text"
                    autoComplete="off"
                    enterKeyHint="next"
                    maxLength={200}
                    required
                    value={
                        draftDescription
                    }
                    aria-invalid={Boolean(
                        descriptionError,
                    )}
                    aria-describedby={
                        descriptionError
                            ? descriptionErrorId
                            : undefined
                    }
                    className="
                        h-11 bg-card
                        aria-invalid:border-destructive
                        aria-invalid:ring-destructive/20
                    "
                    onChange={(
                        event,
                    ) => {
                        setDraftDescription(
                            event.target
                                .value,
                        );

                        if (
                            state.fieldErrors
                                .description !==
                            undefined
                        ) {
                            markTouched(
                                "description",
                            );
                        }

                        setEditedSinceSubmission(
                            true,
                        );
                    }}
                    onInvalid={(
                        event,
                    ) => {
                        event.preventDefault();
                        markTouched(
                            "description",
                        );
                    }}
                />

                {descriptionError ? (
                    <p
                        id={
                            descriptionErrorId
                        }
                        role="alert"
                        className="text-sm leading-5 text-destructive"
                    >
                        {
                            descriptionError
                        }
                    </p>
                ) : null}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                    <Label
                        htmlFor={
                            quantityId
                        }
                    >
                        Quantity
                    </Label>

                    <Input
                        id={quantityId}
                        name="quantity"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        enterKeyHint="next"
                        maxLength={10}
                        required
                        value={
                            draftQuantity
                        }
                        aria-invalid={Boolean(
                            quantityError,
                        )}
                        aria-describedby={
                            quantityError
                                ? quantityErrorId
                                : undefined
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
                            setDraftQuantity(
                                event.target
                                    .value,
                            );

                            if (
                                state.fieldErrors
                                    .quantity !==
                                undefined
                            ) {
                                markTouched(
                                    "quantity",
                                );
                            }

                            setEditedSinceSubmission(
                                true,
                            );
                        }}
                        onInvalid={(
                            event,
                        ) => {
                            event.preventDefault();
                            markTouched(
                                "quantity",
                            );
                        }}
                    />

                    {quantityError ? (
                        <p
                            id={
                                quantityErrorId
                            }
                            role="alert"
                            className="text-sm leading-5 text-destructive"
                        >
                            {quantityError}
                        </p>
                    ) : null}
                </div>

                <div className="flex flex-col gap-2">
                    <Label
                        htmlFor={
                            unitPriceId
                        }
                    >
                        Unit price (RM)
                    </Label>

                    <Input
                        id={unitPriceId}
                        name="unitPrice"
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        enterKeyHint="done"
                        spellCheck={false}
                        required
                        value={
                            draftUnitPrice
                        }
                        aria-invalid={Boolean(
                            unitPriceError,
                        )}
                        aria-describedby={
                            unitPriceError
                                ? unitPriceErrorId
                                : unitPriceHelpId
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
                            setDraftUnitPrice(
                                event.target
                                    .value,
                            );

                            if (
                                state.fieldErrors
                                    .unitPrice !==
                                undefined
                            ) {
                                markTouched(
                                    "unitPrice",
                                );
                            }

                            setEditedSinceSubmission(
                                true,
                            );
                        }}
                        onInvalid={(
                            event,
                        ) => {
                            event.preventDefault();
                            markTouched(
                                "unitPrice",
                            );
                        }}
                    />

                    {unitPriceError ? (
                        <p
                            id={
                                unitPriceErrorId
                            }
                            role="alert"
                            className="text-sm leading-5 text-destructive"
                        >
                            {unitPriceError}
                        </p>
                    ) : (
                        <p
                            id={
                                unitPriceHelpId
                            }
                            className="text-sm leading-5 text-muted-foreground"
                        >
                            The line total
                            updates automatically.
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
    const ringgit =
        Math.floor(
            amountSen / 100,
        );

    const sen =
        amountSen % 100;

    return `${ringgit}.${String(
        sen,
    ).padStart(2, "0")}`;
}