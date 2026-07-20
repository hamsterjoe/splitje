"use client";

import {
    useActionState,
    useEffect,
    useState,
} from "react";

import { addItemAction } from "@/app/bills/[billId]/add-item-action";
import { initialAddItemActionState } from "@/app/bills/[billId]/add-item-action-state";
import { parseRinggitInput } from "@/application/billing/validation/parse-ringgit-input";
import { AddItemSubmitButton } from "@/components/add-item-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddItemFormProps {
    billId: string;
}

const POSTGRES_INTEGER_MAX =
    2_147_483_647;

function getQuantityError(
    value: string,
): string | undefined {
    const normalizedValue = value.trim();

    if (
        !/^\d+$/.test(normalizedValue) ||
        normalizedValue.length > 10
    ) {
        return "Enter a positive whole number.";
    }

    const parsedValue = Number(normalizedValue);

    if (
        !Number.isInteger(parsedValue) ||
        parsedValue <= 0 ||
        parsedValue > POSTGRES_INTEGER_MAX
    ) {
        return "Enter a positive whole number.";
    }

    return undefined;
}

function getUnitPriceError(
    value: string,
): string | undefined {
    const result = parseRinggitInput(value);

    return result.success
        ? undefined
        : result.message;
}

export function AddItemForm({
    billId,
}: AddItemFormProps) {
    const [state, formAction] = useActionState(
        addItemAction,
        initialAddItemActionState,
    );

    const [description, setDescription] =
        useState("");

    const [quantity, setQuantity] =
        useState("1");

    const [unitPrice, setUnitPrice] =
        useState("");

    const [
        touchedFields,
        setTouchedFields,
    ] = useState<
        Partial<
            Record<
                | "description"
                | "quantity"
                | "unitPrice",
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
            setDescription("");
            setQuantity("1");
            setUnitPrice("");
            setTouchedFields({});
            setEditedSinceSubmission(false);
        }
    }, [state]);

    const descriptionLocalError =
        touchedFields.description &&
            description.trim().length === 0
            ? "Enter an item description."
            : undefined;

    const quantityLocalError =
        touchedFields.quantity
            ? getQuantityError(quantity)
            : undefined;

    const unitPriceLocalError =
        touchedFields.unitPrice
            ? getUnitPriceError(unitPrice)
            : undefined;

    const descriptionError =
        touchedFields.description
            ? descriptionLocalError
            : state.fieldErrors.description;

    const quantityError =
        touchedFields.quantity
            ? quantityLocalError
            : state.fieldErrors.quantity;

    const unitPriceError =
        touchedFields.unitPrice
            ? unitPriceLocalError
            : state.fieldErrors.unitPrice;

    const showStatusMessage =
        state.message !== null &&
        !editedSinceSubmission;

    function markTouched(
        field:
            | "description"
            | "quantity"
            | "unitPrice",
    ) {
        setTouchedFields((current) => ({
            ...current,
            [field]: true,
        }));
    }

    function markEdited() {
        setEditedSinceSubmission(true);
    }

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

            <div className="flex flex-col gap-2">
                <Label htmlFor="itemDescription">
                    Item
                </Label>

                <Input
                    id="itemDescription"
                    name="description"
                    type="text"
                    autoComplete="off"
                    enterKeyHint="next"
                    placeholder="e.g. Nasi Lemak"
                    required
                    value={description}
                    aria-invalid={Boolean(
                        descriptionError,
                    )}
                    aria-describedby={
                        descriptionError
                            ? "itemDescription-error"
                            : undefined
                    }
                    className="
            h-11 bg-card
            aria-invalid:border-destructive
            aria-invalid:ring-destructive/20
          "
                    onChange={(event) => {
                        setDescription(
                            event.target.value,
                        );
                        markTouched("description");
                        markEdited();
                    }}
                    onBlur={() => {
                        markTouched("description");
                    }}
                    onInvalid={(event) => {
                        event.preventDefault();
                        markTouched("description");
                    }}
                />

                {descriptionError ? (
                    <p
                        id="itemDescription-error"
                        role="alert"
                        className="text-sm leading-5 text-destructive"
                    >
                        {descriptionError}
                    </p>
                ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                    <Label htmlFor="itemQuantity">
                        Quantity
                    </Label>

                    <Input
                        id="itemQuantity"
                        name="quantity"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        enterKeyHint="next"
                        placeholder="1"
                        required
                        value={quantity}
                        aria-invalid={Boolean(
                            quantityError,
                        )}
                        aria-describedby={
                            quantityError
                                ? "itemQuantity-error"
                                : undefined
                        }
                        className="
              h-11 bg-card tabular-nums
              aria-invalid:border-destructive
              aria-invalid:ring-destructive/20
            "
                        onChange={(event) => {
                            setQuantity(
                                event.target.value,
                            );
                            markTouched("quantity");
                            markEdited();
                        }}
                        onBlur={() => {
                            markTouched("quantity");
                        }}
                        onInvalid={(event) => {
                            event.preventDefault();
                            markTouched("quantity");
                        }}
                    />

                    {quantityError ? (
                        <p
                            id="itemQuantity-error"
                            role="alert"
                            className="text-sm leading-5 text-destructive"
                        >
                            {quantityError}
                        </p>
                    ) : null}
                </div>

                <div className="flex flex-col gap-2">
                    <Label htmlFor="itemUnitPrice">
                        Unit price (RM)
                    </Label>

                    <Input
                        id="itemUnitPrice"
                        name="unitPrice"
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        enterKeyHint="done"
                        spellCheck={false}
                        placeholder="0.00"
                        required
                        value={unitPrice}
                        aria-invalid={Boolean(
                            unitPriceError,
                        )}
                        aria-describedby={
                            unitPriceError
                                ? "itemUnitPrice-error"
                                : "itemUnitPrice-help"
                        }
                        className="
              h-11 bg-card tabular-nums
              aria-invalid:border-destructive
              aria-invalid:ring-destructive/20
            "
                        onChange={(event) => {
                            setUnitPrice(
                                event.target.value,
                            );
                            markTouched("unitPrice");
                            markEdited();
                        }}
                        onBlur={() => {
                            markTouched("unitPrice");
                        }}
                        onInvalid={(event) => {
                            event.preventDefault();
                            markTouched("unitPrice");
                        }}
                    />

                    {unitPriceError ? (
                        <p
                            id="itemUnitPrice-error"
                            role="alert"
                            className="text-sm leading-5 text-destructive"
                        >
                            {unitPriceError}
                        </p>
                    ) : (
                        <p
                            id="itemUnitPrice-help"
                            className="text-sm leading-5 text-muted-foreground"
                        >
                            Enter the price for one item.
                        </p>
                    )}
                </div>
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

            <AddItemSubmitButton />
        </form>
    );
}