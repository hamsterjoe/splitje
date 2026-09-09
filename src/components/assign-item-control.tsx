"use client";

import { useActionState, useId, useState } from "react";

import { setItemAllocationsAction } from "@/app/bills/[billId]/set-item-allocations-action";
import {
  initialSetItemAllocationsActionState,
  type SetItemAllocationsActionState,
} from "@/app/bills/[billId]/set-item-allocations-action-state";
import { parsePercentageInput } from "@/application/billing/validation/parse-percentage-input";
import { parseRinggitInput } from "@/application/billing/validation/parse-ringgit-input";
import { Button } from "@/components/ui/button";

type SplitMode = "equal" | "quantity" | "percentage" | "custom";

interface AssignItemControlParticipant {
  id: string;
  displayName: string;
}

interface AssignItemControlAllocation {
  participantId: string;
  allocationType: "entire" | "equal" | "quantity" | "percentage" | "custom";
  amountSen: number;
  quantityShare: number | null;
  percentageBasisPoints: number | null;
}

interface AssignItemControlProps {
  billId: string;
  itemId: string;
  lineTotalSen: number;
  currency: string;
  participants: AssignItemControlParticipant[];
  allocations: AssignItemControlAllocation[];
}

const splitModeOptions: Array<{ value: SplitMode; label: string }> = [
  { value: "equal", label: "Equally" },
  { value: "quantity", label: "By quantity" },
  { value: "percentage", label: "By percentage" },
  { value: "custom", label: "Custom amounts" },
];

function formatMoney(amountSen: number, currency: string): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency,
    currencyDisplay: "symbol",
  }).format(amountSen / 100);
}

function initialModeFor(
  allocations: AssignItemControlAllocation[],
): SplitMode {
  const first = allocations[0]?.allocationType;

  if (
    first === "quantity" ||
    first === "percentage" ||
    first === "custom"
  ) {
    return first;
  }

  return "equal";
}

function initialQuantityValues(
  allocations: AssignItemControlAllocation[],
): Record<string, string> {
  const values: Record<string, string> = {};

  for (const allocation of allocations) {
    if (allocation.quantityShare !== null) {
      values[allocation.participantId] = String(allocation.quantityShare);
    }
  }

  return values;
}

function initialPercentageValues(
  allocations: AssignItemControlAllocation[],
): Record<string, string> {
  const values: Record<string, string> = {};

  for (const allocation of allocations) {
    if (allocation.percentageBasisPoints !== null) {
      values[allocation.participantId] = String(
        allocation.percentageBasisPoints / 100,
      );
    }
  }

  return values;
}

function initialAmountValues(
  allocations: AssignItemControlAllocation[],
): Record<string, string> {
  const values: Record<string, string> = {};

  for (const allocation of allocations) {
    if (allocation.allocationType === "custom") {
      values[allocation.participantId] = (allocation.amountSen / 100).toFixed(
        2,
      );
    }
  }

  return values;
}

function parseQuantityDraft(value: string): number | null {
  const trimmed = value.trim();

  if (!/^\d{1,9}$/.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed);

  return parsed > 0 ? parsed : null;
}

function describeSplit(args: {
  mode: SplitMode;
  selectedCount: number;
  lineTotalSen: number;
  currency: string;
  quantityTotal: number;
  percentageTotalBasisPoints: number;
  customTotalSen: number;
}): { text: string; isError: boolean } {
  const {
    mode,
    selectedCount,
    lineTotalSen,
    currency,
    quantityTotal,
    percentageTotalBasisPoints,
    customTotalSen,
  } = args;

  if (selectedCount === 0) {
    return {
      text: "No one selected — saving clears this assignment.",
      isError: false,
    };
  }

  if (mode === "equal") {
    const base = Math.floor(lineTotalSen / selectedCount);
    const remainder = lineTotalSen - base * selectedCount;

    return {
      text:
        remainder === 0
          ? `${formatMoney(base, currency)} per person.`
          : `${formatMoney(base + 1, currency)} × ${remainder}, ${formatMoney(base, currency)} × ${selectedCount - remainder}.`,
      isError: false,
    };
  }

  if (mode === "quantity") {
    return quantityTotal > 0
      ? {
          text: `Split across ${quantityTotal} unit${quantityTotal === 1 ? "" : "s"}, proportional to each person's quantity.`,
          isError: false,
        }
      : {
          text: "Enter a quantity for each selected person.",
          isError: false,
        };
  }

  if (mode === "percentage") {
    return percentageTotalBasisPoints === 10_000
      ? { text: "Percentages add up to 100%.", isError: false }
      : {
          text: `Percentages add up to ${percentageTotalBasisPoints / 100}% — they must total exactly 100%.`,
          isError: true,
        };
  }

  const remaining = lineTotalSen - customTotalSen;

  if (remaining < 0) {
    return {
      text: `Over the item total by ${formatMoney(-remaining, currency)}.`,
      isError: true,
    };
  }

  return {
    text:
      remaining === 0
        ? "Fully assigned."
        : `${formatMoney(customTotalSen, currency)} assigned · ${formatMoney(remaining, currency)} left unassigned.`,
    isError: false,
  };
}

export function AssignItemControl({
  billId,
  itemId,
  lineTotalSen,
  currency,
  participants,
  allocations,
}: AssignItemControlProps) {
  const formId = useId();

  const [isEditing, setIsEditing] = useState(false);
  const [mode, setMode] = useState<SplitMode>(() =>
    initialModeFor(allocations),
  );
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<
    string[]
  >(() => allocations.map((allocation) => allocation.participantId));
  const [quantityValues, setQuantityValues] = useState<Record<string, string>>(
    () => initialQuantityValues(allocations),
  );
  const [percentageValues, setPercentageValues] = useState<
    Record<string, string>
  >(() => initialPercentageValues(allocations));
  const [amountValues, setAmountValues] = useState<Record<string, string>>(
    () => initialAmountValues(allocations),
  );
  const [editedSinceSubmission, setEditedSinceSubmission] = useState(false);

  const hasAssignment = allocations.length > 0;

  const [state, formAction, isPending] = useActionState(
    async (
      previousState: SetItemAllocationsActionState,
      formData: FormData,
    ): Promise<SetItemAllocationsActionState> => {
      const nextState = await setItemAllocationsAction(
        previousState,
        formData,
      );

      setEditedSinceSubmission(false);

      if (nextState.status === "success") {
        setIsEditing(false);
      }

      return nextState;
    },
    initialSetItemAllocationsActionState,
  );

  function resetDraft() {
    setMode(initialModeFor(allocations));
    setSelectedParticipantIds(
      allocations.map((allocation) => allocation.participantId),
    );
    setQuantityValues(initialQuantityValues(allocations));
    setPercentageValues(initialPercentageValues(allocations));
    setAmountValues(initialAmountValues(allocations));
  }

  function startEditing() {
    resetDraft();
    setEditedSinceSubmission(true);
    setIsEditing(true);
  }

  function cancelEditing() {
    resetDraft();
    setEditedSinceSubmission(true);
    setIsEditing(false);
  }

  function toggleParticipant(participantId: string) {
    setSelectedParticipantIds((current) =>
      current.includes(participantId)
        ? current.filter((id) => id !== participantId)
        : [...current, participantId],
    );
    setEditedSinceSubmission(true);
  }

  function updateDraftValue(participantId: string, value: string) {
    if (mode === "quantity") {
      setQuantityValues((current) => ({ ...current, [participantId]: value }));
    } else if (mode === "percentage") {
      setPercentageValues((current) => ({
        ...current,
        [participantId]: value,
      }));
    } else {
      setAmountValues((current) => ({ ...current, [participantId]: value }));
    }

    setEditedSinceSubmission(true);
  }

  function draftValueFor(participantId: string): string {
    if (mode === "quantity") {
      return quantityValues[participantId] ?? "";
    }

    if (mode === "percentage") {
      return percentageValues[participantId] ?? "";
    }

    return amountValues[participantId] ?? "";
  }

  const valueFieldName =
    mode === "quantity"
      ? "quantityShare"
      : mode === "percentage"
        ? "percentage"
        : "amount";

  const valueInputLabel =
    mode === "quantity"
      ? "Quantity"
      : mode === "percentage"
        ? "Percentage"
        : "Amount";

  let percentageTotalBasisPoints = 0;

  for (const participantId of selectedParticipantIds) {
    const parsed = parsePercentageInput(
      percentageValues[participantId] ?? "",
    );

    if (parsed.success) {
      percentageTotalBasisPoints += parsed.basisPoints;
    }
  }

  let customTotalSen = 0;

  for (const participantId of selectedParticipantIds) {
    const parsed = parseRinggitInput(amountValues[participantId] ?? "");

    if (parsed.success) {
      customTotalSen += parsed.amountSen;
    }
  }

  const quantityTotal = selectedParticipantIds.reduce(
    (sum, participantId) =>
      sum + (parseQuantityDraft(quantityValues[participantId] ?? "") ?? 0),
    0,
  );

  const splitSummary = describeSplit({
    mode,
    selectedCount: selectedParticipantIds.length,
    lineTotalSen,
    currency,
    quantityTotal,
    percentageTotalBasisPoints,
    customTotalSen,
  });

  const submitBlocked =
    (mode === "percentage" &&
      selectedParticipantIds.length > 0 &&
      percentageTotalBasisPoints !== 10_000) ||
    (mode === "custom" && customTotalSen > lineTotalSen);

  const sharesError = editedSinceSubmission
    ? undefined
    : state.fieldErrors.shares;

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
        {hasAssignment ? "Edit assignment" : "Assign"}
      </Button>
    );
  }

  const selectionHintId = `${formId}-selection-hint`;
  const sharesErrorId = `${formId}-shares-error`;

  return (
    <form
      action={formAction}
      className="w-full rounded-lg border bg-muted/20 p-3"
    >
      <input type="hidden" name="billId" value={billId} />

      <input type="hidden" name="itemId" value={itemId} />

      <fieldset disabled={isPending} className="disabled:opacity-60">
        <legend className="text-sm font-medium">
          How is this item split?
        </legend>

        <div className="mt-2 flex flex-wrap gap-1">
          {splitModeOptions.map((option) => (
            <label
              key={option.value}
              className="flex min-h-11 cursor-pointer touch-manipulation items-center gap-2 rounded-md px-3 hover:bg-muted/40"
            >
              <input
                type="radio"
                name="mode"
                value={option.value}
                checked={mode === option.value}
                onChange={() => {
                  setMode(option.value);
                  setEditedSinceSubmission(true);
                }}
                className="size-4 shrink-0"
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset
        aria-describedby={selectionHintId}
        disabled={isPending}
        className="mt-4 disabled:opacity-60"
      >
        <legend className="text-sm font-medium">
          Who shares this item?
        </legend>

        <p
          id={selectionHintId}
          className="mt-1 text-sm text-muted-foreground"
        >
          Clear everyone to unassign the item.
        </p>

        <ul className="mt-2 flex flex-col gap-1">
          {participants.map((participant) => {
            const isSelected = selectedParticipantIds.includes(
              participant.id,
            );

            return (
              <li
                key={participant.id}
                className="flex items-center justify-between gap-3"
              >
                <label className="flex min-h-11 flex-1 cursor-pointer touch-manipulation items-center gap-3 rounded-md px-2 hover:bg-muted/40">
                  <input
                    type="checkbox"
                    name="participantIds"
                    value={participant.id}
                    checked={isSelected}
                    onChange={() => toggleParticipant(participant.id)}
                    className="size-5 shrink-0"
                  />
                  <span className="text-sm">
                    {participant.displayName}
                  </span>
                </label>

                {isSelected && mode !== "equal" ? (
                  <input
                    type="text"
                    inputMode={
                      mode === "quantity" ? "numeric" : "decimal"
                    }
                    name={`${valueFieldName}-${participant.id}`}
                    value={draftValueFor(participant.id)}
                    onChange={(event) =>
                      updateDraftValue(
                        participant.id,
                        event.target.value,
                      )
                    }
                    aria-label={`${valueInputLabel} for ${participant.displayName}`}
                    placeholder={
                      mode === "quantity"
                        ? "1"
                        : mode === "percentage"
                          ? "0.0"
                          : "0.00"
                    }
                    autoComplete="off"
                    className="h-11 w-24 shrink-0 rounded-md border bg-card px-3 text-right text-sm tabular-nums"
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      </fieldset>

      <p
        className={`mt-3 text-sm leading-5 ${
          splitSummary.isError
            ? "text-destructive"
            : "text-muted-foreground"
        }`}
      >
        {splitSummary.text}
      </p>

      {sharesError ? (
        <p
          id={sharesErrorId}
          role="alert"
          className="mt-2 text-sm leading-5 text-destructive"
        >
          {sharesError}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 touch-manipulation"
          disabled={isPending}
          onClick={cancelEditing}
        >
          Cancel
        </Button>

        <Button
          type="submit"
          className="min-h-11 touch-manipulation"
          disabled={isPending || submitBlocked}
          aria-disabled={isPending || submitBlocked}
          aria-busy={isPending}
        >
          {isPending ? "Saving assignment…" : "Save assignment"}
        </Button>
      </div>

      {showStatusMessage ? (
        <p role="alert" className="mt-3 text-sm leading-5 text-destructive">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
