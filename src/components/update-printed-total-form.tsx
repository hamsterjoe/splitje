"use client";

import {
    useActionState,
    useEffect,
    useState,
} from "react";

import { updatePrintedTotalAction } from "@/app/bills/[billId]/update-printed-total-action";
import { initialUpdatePrintedTotalActionState } from "@/app/bills/[billId]/update-printed-total-action-state";
import { parseRinggitInput } from "@/application/billing/validation/parse-ringgit-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UpdatePrintedTotalSubmitButton } from "@/components/update-printed-total-submit-button";
import { formatRinggitDigitInput } from "@/application/billing/validation/format-ringgit-digit-input";

interface UpdatePrintedTotalFormProps {
    billId: string;
    rowVersion: number;
    printedTotalSen: number;
}

function formatSenForInput(
    amountSen: number,
): string {
    return formatRinggitDigitInput(
        amountSen.toString(),
    );
}

export function UpdatePrintedTotalForm({
    billId,
    rowVersion,
    printedTotalSen,
}: UpdatePrintedTotalFormProps) {
    const [state, formAction] = useActionState(
        updatePrintedTotalAction,
        initialUpdatePrintedTotalActionState,
    );

    const [printedTotal, setPrintedTotal] =
        useState(() =>
            formatSenForInput(
                printedTotalSen,
            ),
        );

    const [
        printedTotalTouched,
        setPrintedTotalTouched,
    ] = useState(false);

    const [
        editedSinceSubmission,
        setEditedSinceSubmission,
    ] = useState(false);

    useEffect(() => {
        setPrintedTotal(
            formatSenForInput(
                printedTotalSen,
            ),
        );

        setPrintedTotalTouched(false);
        setEditedSinceSubmission(false);
    }, [
        printedTotalSen,
        rowVersion,
    ]);

    const localResult =
        printedTotalTouched
            ? parseRinggitInput(printedTotal)
            : null;

    const localError =
        localResult !== null &&
            !localResult.success
            ? localResult.message
            : undefined;

    const printedTotalError =
        printedTotalTouched
            ? localError
            : state.fieldErrors.printedTotal;

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
                name="expectedRowVersion"
                value={rowVersion}
            />

            <div className="flex flex-col gap-2">
                <Label htmlFor="printedTotal">
                    Printed receipt total (RM)
                </Label>

                <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                        id="printedTotal"
                        name="printedTotal"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        enterKeyHint="done"
                        spellCheck={false}
                        required
                        maxLength={11}
                        value={printedTotal}
                        aria-invalid={Boolean(
                            printedTotalError,
                        )}
                        aria-describedby={
                            printedTotalError
                                ? "printedTotal-error"
                                : "printedTotal-help"
                        }
                        className="
              h-11 min-w-0 bg-card
              tabular-nums
              aria-invalid:border-destructive
              aria-invalid:ring-destructive/20
            "
                        onChange={(event) => {
                            setPrintedTotal(
                                formatRinggitDigitInput(
                                    event.target.value,
                                ),
                            );

                            setPrintedTotalTouched(true);
                            setEditedSinceSubmission(true);
                        }}
                        onBlur={() => {
                            setPrintedTotalTouched(true);
                        }}
                        onInvalid={(event) => {
                            event.preventDefault();
                            setPrintedTotalTouched(true);
                        }}
                    />

                    <UpdatePrintedTotalSubmitButton />
                </div>

                {printedTotalError ? (
                    <p
                        id="printedTotal-error"
                        role="alert"
                        className="text-sm leading-5 text-destructive"
                    >
                        {printedTotalError}
                    </p>
                ) : (
                    <p
                        id="printedTotal-help"
                        className="text-sm leading-5 text-muted-foreground"
                    >
                        Enter the final total shown on
                        the receipt.
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
        </form>
    );
}