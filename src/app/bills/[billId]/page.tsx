import Link from "next/link";
import { notFound } from "next/navigation";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { getServerOwnerBill } from "@/infrastructure/supabase/billing/get-server-owner-bill";
import { AddParticipantForm } from "@/components/add-participant-form";
import { AddAdjustmentForm } from "@/components/add-adjustment-form";
import { formatAdjustmentDescription } from "./format-adjustment-description";
import { AddItemForm } from "@/components/add-item-form";
import { UpdatePrintedTotalForm } from "@/components/update-printed-total-form";
import { calculateOwnerBillReconciliation } from "@/application/billing/calculate-owner-bill-reconciliation";
import { RemoveAdjustmentControl } from "@/components/remove-adjustment-control";
import { EditFixedAdjustmentControl } from "@/components/edit-fixed-adjustment-control";
import { EditRateAdjustmentControl } from "@/components/edit-rate-adjustment-control";
import { EditRoundingAdjustmentControl } from "@/components/edit-rounding-adjustment-control";
import { EditItemControl } from "@/components/edit-item-control";
import { RemoveItemControl } from "@/components/remove-item-control";
import { EditParticipantControl } from "@/components/edit-participant-control";
import { AssignItemControl } from "@/components/assign-item-control";
import { RemoveParticipantControl } from "@/components/remove-participant-control";
import { calculateOwnerBillItemAllocationStates } from "@/application/billing/calculate-owner-bill-item-allocation-states";
import type {
    OwnerBillItem,
    OwnerBillParticipant,
} from "@/application/billing/get-owner-bill";
import { calculateOwnerBillSummary } from "@/application/billing/calculate-owner-bill-summary";
import type {
    BillFinalisationBlocker,
    ItemAllocationSummary,
    ParticipantFinancialSummary,
} from "@/domain/billing/types";

interface BillPageProps {
    params: Promise<{
        billId: string;
    }>;
}

export default async function BillPage({
    params,
}: BillPageProps) {
    const { billId } = await params;
    const result =
        await getServerOwnerBill(billId);

    if (!result.success) {
        if (result.error.type === "not_found") {
            notFound();
        }

        throw new Error(result.error.message);
    }

    const { bill } = result;

    const reconciliation =
        calculateOwnerBillReconciliation(bill);

    const itemAllocationStates =
        calculateOwnerBillItemAllocationStates(bill);

    const billSummary =
        calculateOwnerBillSummary(bill);

    const participantSummariesById = new Map(
        billSummary.participantResult.participantSummaries.map(
            (summary) => [
                summary.participantId,
                summary,
            ],
        ),
    );

    const hasItems = bill.items.length > 0;

    const adjustmentScopeItems =
        bill.items.map((item) => ({
            id: item.id,
            description:
                item.description,
            lineTotalSen:
                item.lineTotalSen,
        }));

    return (
        <main
            id="main-content"
            className="min-h-dvh bg-muted/30"
        >
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-8 sm:px-6 sm:py-12">
                <header className="flex flex-col gap-2">
                    <Link
                        href="/"
                        className="w-fit touch-manipulation font-display text-lg text-primary focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        SplitJe
                    </Link>

                    <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium text-muted-foreground">
                            {getBillStatusLabel(bill.status)}
                        </p>

                        <h1 className="text-pretty text-3xl font-semibold tracking-tight">
                            {bill.merchantName ?? "New bill"}
                        </h1>
                    </div>
                </header>

                <section aria-labelledby="bill-summary-heading">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                <h2 id="bill-summary-heading">
                                    Bill summary
                                </h2>
                            </CardTitle>

                            <CardDescription>
                                Review the persisted bill before adding
                                items and charges.
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <div className="flex flex-col gap-5">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="rounded-lg border bg-muted/30 p-4">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Printed total
                                        </p>

                                        <p className="mt-1 text-2xl font-semibold tabular-nums">
                                            {formatMoney(
                                                bill.printedTotalSen,
                                                bill.currency,
                                            )}
                                        </p>
                                    </div>

                                    <div className="rounded-lg border bg-muted/30 p-4">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Currency
                                        </p>

                                        <p
                                            className="mt-1 text-2xl font-semibold"
                                            translate="no"
                                        >
                                            {bill.currency}
                                        </p>
                                    </div>
                                </div>

                                <div className="border-t pt-5">
                                    <UpdatePrintedTotalForm
                                        key={`${bill.id}:${bill.rowVersion}:${bill.printedTotalSen}`}
                                        billId={bill.id}
                                        rowVersion={
                                            bill.rowVersion
                                        }
                                        printedTotalSen={
                                            bill.printedTotalSen
                                        }
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>


                <section aria-labelledby="people-heading">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                <h2 id="people-heading">People</h2>
                            </CardTitle>

                            <CardDescription>
                                People currently included in this bill.
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <div className="flex flex-col gap-5">
                                {bill.participants.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        No people have been added yet.
                                    </p>
                                ) : (
                                    <ul className="flex flex-col divide-y">
                                        {bill.participants.map(
                                            (participant) => (
                                                <li
                                                    key={participant.id}
                                                    className="py-3 first:pt-0 last:pb-0"
                                                >
                                                    <div className="flex min-h-14 items-center justify-between gap-4">
                                                        <span className="min-w-0 break-words font-medium">
                                                            {
                                                                participant.displayName
                                                            }
                                                        </span>

                                                        {participant.isOwner ? (
                                                            <span className="shrink-0 text-sm text-muted-foreground">
                                                                Owner
                                                            </span>
                                                        ) : null}
                                                    </div>

                                                    <div className="mt-1 flex flex-wrap justify-end gap-1">
                                                        <EditParticipantControl
                                                            billId={bill.id}
                                                            participantId={
                                                                participant.id
                                                            }
                                                            displayName={
                                                                participant.displayName
                                                            }
                                                        />

                                                        {participant.isOwner ? null : (
                                                            <RemoveParticipantControl
                                                                billId={
                                                                    bill.id
                                                                }
                                                                participantId={
                                                                    participant.id
                                                                }
                                                                displayName={
                                                                    participant.displayName
                                                                }
                                                            />
                                                        )}
                                                    </div>
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                )}

                                <div className="border-t pt-5">
                                    <AddParticipantForm
                                        billId={bill.id}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                <section aria-labelledby="items-heading">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                <h2 id="items-heading">Items</h2>
                            </CardTitle>

                            <CardDescription>
                                Items currently included in this bill.
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <div className="flex flex-col gap-5">
                                {bill.items.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        No items have been added yet.
                                    </p>
                                ) : (
                                    <ul className="flex flex-col divide-y">
                                        {bill.items.map(
                                            (item) => (
                                                <li
                                                    key={item.id}
                                                    className="relative py-3 first:pt-0 last:pb-0"
                                                >
                                                    <div className="flex min-h-16 items-start justify-between gap-4">
                                                        <div className="min-w-0">
                                                            <p className="break-words font-medium">
                                                                {
                                                                    item.description
                                                                }
                                                            </p>

                                                            <p className="mt-1 text-sm text-muted-foreground">
                                                                {formatQuantity(
                                                                    item.quantity,
                                                                )}
                                                                {" × "}
                                                                <span className="tabular-nums">
                                                                    {formatMoney(
                                                                        item.unitPriceSen,
                                                                        bill.currency,
                                                                    )}
                                                                </span>
                                                            </p>

                                                            <p className="mt-1 text-sm text-muted-foreground">
                                                                {describeItemAssignment(
                                                                    item,
                                                                    itemAllocationStates[
                                                                        item.id
                                                                    ],
                                                                    bill.participants,
                                                                    bill.currency,
                                                                )}
                                                            </p>
                                                        </div>

                                                        <p className="shrink-0 font-semibold tabular-nums">
                                                            {formatMoney(
                                                                item.lineTotalSen,
                                                                bill.currency,
                                                            )}
                                                        </p>
                                                    </div>

                                                    <div className="mt-1 flex flex-wrap items-start justify-end gap-1">
                                                        <AssignItemControl
                                                            key={`assign:${item.id}:${item.allocations
                                                                .map(
                                                                    (allocation) =>
                                                                        allocation.id,
                                                                )
                                                                .join(",")}`}
                                                            billId={bill.id}
                                                            itemId={item.id}
                                                            lineTotalSen={
                                                                item.lineTotalSen
                                                            }
                                                            currency={
                                                                bill.currency
                                                            }
                                                            participants={bill.participants.map(
                                                                (participant) => ({
                                                                    id: participant.id,
                                                                    displayName:
                                                                        participant.displayName,
                                                                }),
                                                            )}
                                                            allocations={
                                                                item.allocations
                                                            }
                                                        />

                                                        <EditItemControl
                                                            billId={
                                                                bill.id
                                                            }
                                                            itemId={
                                                                item.id
                                                            }
                                                            description={
                                                                item.description
                                                            }
                                                            quantity={
                                                                item.quantity
                                                            }
                                                            unitPriceSen={
                                                                item.unitPriceSen
                                                            }
                                                        />

                                                        <RemoveItemControl
                                                            billId={bill.id}
                                                            itemId={item.id}
                                                        />
                                                    </div>
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                )}

                                <div className="border-t pt-5">
                                    <AddItemForm billId={bill.id} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                <section
                    aria-labelledby="adjustments-heading"
                >
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                <h2 id="adjustments-heading">
                                    Adjustments
                                </h2>
                            </CardTitle>

                            <CardDescription>
                                Service charges, taxes, discounts,
                                and other receipt-level amounts.
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <div className="flex flex-col gap-5">
                                {bill.adjustments.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        No adjustments have been added.
                                    </p>
                                ) : (
                                    <ul className="flex flex-col divide-y">
                                        {bill.adjustments.map(
                                            (adjustment) => {
                                                const editableFixedType =
                                                    adjustment
                                                        .calculationMethod ===
                                                        "fixed" &&
                                                        adjustment.type !==
                                                        "rounding"
                                                        ? adjustment.type
                                                        : null;

                                                const editableRate =
                                                    adjustment
                                                        .calculationMethod ===
                                                        "rate" &&
                                                        adjustment.type !==
                                                        "rounding" &&
                                                        adjustment
                                                            .rateBasisPoints !==
                                                        null &&
                                                        adjustment.roundingMode ===
                                                        "half_up" &&
                                                        adjustment
                                                            .calculationBaseMode ===
                                                        "item_subtotal"
                                                        ? {
                                                            type:
                                                                adjustment.type,
                                                            rateBasisPoints:
                                                                adjustment
                                                                    .rateBasisPoints,
                                                        }
                                                        : null;

                                                const canEditRounding =
                                                    adjustment.type ===
                                                    "rounding" &&
                                                    adjustment
                                                        .calculationMethod ===
                                                    "fixed" &&
                                                    adjustment
                                                        .rateBasisPoints ===
                                                    null &&
                                                    adjustment.roundingMode ===
                                                    null &&
                                                    adjustment
                                                        .calculationBaseMode ===
                                                    null;

                                                return (
                                                    <li
                                                        key={
                                                            adjustment.id
                                                        }
                                                        className="py-3 first:pt-0 last:pb-0"
                                                    >
                                                        <div className="flex min-h-16 items-start justify-between gap-4">
                                                            <div className="min-w-0">
                                                                <p className="break-words font-medium">
                                                                    {
                                                                        adjustment.label
                                                                    }
                                                                </p>

                                                                <p className="mt-1 break-words text-sm text-muted-foreground">
                                                                    {formatAdjustmentDescription(
                                                                        adjustment,
                                                                    )}
                                                                </p>
                                                            </div>

                                                            <p className="shrink-0 font-semibold tabular-nums">
                                                                {formatSignedMoney(
                                                                    adjustment
                                                                        .amountSen,
                                                                    bill.currency,
                                                                )}
                                                            </p>
                                                        </div>

                                                        <div className="mt-1 flex flex-wrap items-start justify-end gap-1">
                                                            {editableFixedType !== null ? (
                                                                <EditFixedAdjustmentControl
                                                                    billId={bill.id}
                                                                    adjustmentId={
                                                                        adjustment.id
                                                                    }
                                                                    adjustmentType={
                                                                        editableFixedType
                                                                    }
                                                                    adjustmentLabel={
                                                                        adjustment.label
                                                                    }
                                                                    amountSen={
                                                                        adjustment.amountSen
                                                                    }
                                                                />
                                                            ) : null}

                                                            {editableRate !== null ? (
                                                                <EditRateAdjustmentControl
                                                                    billId={bill.id}
                                                                    adjustmentId={
                                                                        adjustment.id
                                                                    }
                                                                    adjustmentType={
                                                                        editableRate.type
                                                                    }
                                                                    adjustmentLabel={
                                                                        adjustment.label
                                                                    }
                                                                    rateBasisPoints={
                                                                        editableRate
                                                                            .rateBasisPoints
                                                                    }
                                                                    appliesToAllItems={
                                                                        adjustment
                                                                            .appliesToAllItems
                                                                    }
                                                                    applicableItemIds={
                                                                        adjustment
                                                                            .applicableItemIds
                                                                    }
                                                                    currency={
                                                                        bill.currency
                                                                    }
                                                                    items={
                                                                        adjustmentScopeItems
                                                                    }
                                                                />
                                                            ) : null}

                                                            {canEditRounding ? (
                                                                <EditRoundingAdjustmentControl
                                                                    billId={bill.id}
                                                                    adjustmentId={
                                                                        adjustment.id
                                                                    }
                                                                    amountSen={
                                                                        adjustment.amountSen
                                                                    }
                                                                />
                                                            ) : null}

                                                            <RemoveAdjustmentControl
                                                                billId={
                                                                    bill.id
                                                                }
                                                                adjustmentId={
                                                                    adjustment.id
                                                                }
                                                                adjustmentLabel={
                                                                    adjustment.label
                                                                }
                                                            />
                                                        </div>
                                                    </li>
                                                );
                                            },
                                        )}
                                    </ul>
                                )}

                                <div className="border-t pt-5">
                                    <AddAdjustmentForm
                                        billId={bill.id}
                                        hasItems={
                                            bill.items.length > 0
                                        }
                                        currency={bill.currency}
                                        items={bill.items.map(
                                            (item) => ({
                                                id: item.id,
                                                description:
                                                    item.description,
                                                lineTotalSen:
                                                    item.lineTotalSen,
                                            }),
                                        )}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                <section aria-labelledby="reconciliation-heading">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                <h2 id="reconciliation-heading">
                                    Reconciliation
                                </h2>
                            </CardTitle>

                            <CardDescription>
                                Calculated total compared with the
                                printed receipt total.
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <div className="flex flex-col gap-5">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="rounded-lg border bg-muted/30 p-4">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Item subtotal
                                        </p>

                                        <p className="mt-1 text-xl font-semibold tabular-nums">
                                            {formatMoney(
                                                reconciliation.itemSubtotalSen,
                                                bill.currency,
                                            )}
                                        </p>
                                    </div>

                                    <div className="rounded-lg border bg-muted/30 p-4">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Adjustments
                                        </p>

                                        <p className="mt-1 text-xl font-semibold tabular-nums">
                                            {formatSignedMoney(
                                                reconciliation.adjustmentTotalSen,
                                                bill.currency,
                                            )}
                                        </p>
                                    </div>

                                    <div className="rounded-lg border bg-muted/30 p-4">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Calculated total
                                        </p>

                                        <p className="mt-1 text-xl font-semibold tabular-nums">
                                            {formatMoney(
                                                reconciliation
                                                    .calculatedTotalSen,
                                                bill.currency,
                                            )}
                                        </p>
                                    </div>

                                    <div className="rounded-lg border bg-muted/30 p-4">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Difference
                                        </p>

                                        <p className="mt-1 text-xl font-semibold tabular-nums">
                                            {formatSignedMoney(
                                                reconciliation.differenceSen,
                                                bill.currency,
                                            )}
                                        </p>
                                    </div>

                                    <div className="rounded-lg border bg-muted/30 p-4">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Assigned
                                        </p>

                                        <p className="mt-1 text-xl font-semibold tabular-nums">
                                            {formatMoney(
                                                billSummary.financialState.itemAllocatedSen,
                                                bill.currency,
                                            )}
                                        </p>
                                    </div>

                                    <div className="rounded-lg border bg-muted/30 p-4">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Unassigned
                                        </p>

                                        <p className="mt-1 text-xl font-semibold tabular-nums">
                                            {formatMoney(
                                                billSummary.financialState.itemUnassignedSen,
                                                bill.currency,
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <div
                                    className="rounded-lg border bg-muted/20 p-4"
                                >
                                    {!hasItems ? (
                                        <div className="flex flex-col gap-1">
                                            <p className="font-medium">
                                                Add receipt items
                                            </p>

                                            <p className="text-sm leading-5 text-muted-foreground">
                                                Reconciliation begins after
                                                the first item is added.
                                            </p>
                                        </div>
                                    ) : reconciliation.isReconciled ? (
                                        <div className="flex flex-col gap-1">
                                            <p className="font-medium">
                                                Receipt reconciled
                                            </p>

                                            <p className="text-sm leading-5 text-muted-foreground">
                                                The calculated and printed
                                                totals match exactly.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-1">
                                            <p className="font-medium">
                                                Needs review
                                            </p>

                                            <p className="text-sm leading-5 text-muted-foreground">
                                                {getReconciliationMessage(
                                                    reconciliation.differenceSen,
                                                    bill.currency,
                                                )}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <p className="text-sm leading-5 text-muted-foreground">
                                    Difference equals calculated total
                                    minus printed total.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                <section aria-labelledby="summary-heading">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                <h2 id="summary-heading">Summary</h2>
                            </CardTitle>

                            <CardDescription>
                                What each person owes from the current
                                assignments.
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <div className="flex flex-col gap-5">
                                <ul className="flex flex-col divide-y">
                                    {bill.participants.map((participant) => {
                                        const participantSummary =
                                            participantSummariesById.get(
                                                participant.id,
                                            );

                                        if (!participantSummary) {
                                            return null;
                                        }

                                        const participantItems =
                                            bill.items.flatMap((item) =>
                                                item.allocations
                                                    .filter(
                                                        (allocation) =>
                                                            allocation.participantId ===
                                                            participant.id,
                                                    )
                                                    .map((allocation) => ({
                                                        key: allocation.id,
                                                        description:
                                                            item.description,
                                                        amountSen:
                                                            allocation.amountSen,
                                                        shared:
                                                            item.allocations.length >
                                                            1,
                                                    })),
                                            );

                                        const adjustmentRows =
                                            participantAdjustmentRows(
                                                participantSummary,
                                            );

                                        return (
                                            <li
                                                key={participant.id}
                                                className="py-4 first:pt-0 last:pb-0"
                                            >
                                                <div className="flex items-baseline justify-between gap-4">
                                                    <p className="min-w-0 break-words font-medium">
                                                        {
                                                            participant.displayName
                                                        }
                                                        {participant.isOwner ? (
                                                            <span className="text-sm font-normal text-muted-foreground">
                                                                {" "}
                                                                (Owner)
                                                            </span>
                                                        ) : null}
                                                    </p>

                                                    <p className="shrink-0 font-semibold tabular-nums">
                                                        {formatMoney(
                                                            participantSummary.finalAmountSen,
                                                            bill.currency,
                                                        )}
                                                    </p>
                                                </div>

                                                {participantItems.length > 0 ? (
                                                    <ul className="mt-2 flex flex-col gap-1">
                                                        {participantItems.map(
                                                            (participantItem) => (
                                                                <li
                                                                    key={participantItem.key}
                                                                    className="flex items-baseline justify-between gap-4 text-sm text-muted-foreground"
                                                                >
                                                                    <span className="min-w-0 break-words">
                                                                        {participantItem.description}
                                                                        {participantItem.shared
                                                                            ? " (shared)"
                                                                            : ""}
                                                                    </span>

                                                                    <span className="shrink-0 tabular-nums">
                                                                        {formatMoney(
                                                                            participantItem.amountSen,
                                                                            bill.currency,
                                                                        )}
                                                                    </span>
                                                                </li>
                                                            ),
                                                        )}
                                                    </ul>
                                                ) : (
                                                    <p className="mt-2 text-sm text-muted-foreground">
                                                        No items assigned yet.
                                                    </p>
                                                )}

                                                {adjustmentRows.length > 0 ? (
                                                    <ul className="mt-2 flex flex-col gap-1">
                                                        {adjustmentRows.map(
                                                            (row) => (
                                                                <li
                                                                    key={row.label}
                                                                    className="flex items-baseline justify-between gap-4 text-sm text-muted-foreground"
                                                                >
                                                                    <span>
                                                                        {row.label}
                                                                    </span>

                                                                    <span className="shrink-0 tabular-nums">
                                                                        {formatSignedMoney(
                                                                            row.amountSen,
                                                                            bill.currency,
                                                                        )}
                                                                    </span>
                                                                </li>
                                                            ),
                                                        )}
                                                    </ul>
                                                ) : null}
                                            </li>
                                        );
                                    })}
                                </ul>

                                <div className="border-t pt-5">
                                    {billSummary.financialState.canFinalise ? (
                                        <p className="text-sm font-medium">
                                            Ready to finalise — everyone’s
                                            shares add up to the receipt
                                            total.
                                        </p>
                                    ) : (
                                        <div>
                                            <p className="text-sm font-medium">
                                                Before this bill can be
                                                finalised:
                                            </p>

                                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-5 text-muted-foreground">
                                                {billSummary.financialState.blockingReasons.map(
                                                    (reason) => (
                                                        <li key={reason}>
                                                            {describeFinalisationBlocker(
                                                                reason,
                                                            )}
                                                        </li>
                                                    ),
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                <Link
                    href="/"
                    className="inline-flex min-h-11 w-fit touch-manipulation items-center font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    Return home
                </Link>
            </div>
        </main>
    );
}

function formatMoney(
    amountSen: number,
    currency: string,
): string {
    return new Intl.NumberFormat("en-MY", {
        style: "currency",
        currency,
        currencyDisplay: "symbol",
    }).format(amountSen / 100);
}

function describeItemAssignment(
    item: OwnerBillItem,
    summary: ItemAllocationSummary,
    participants: OwnerBillParticipant[],
    currency: string,
): string {
    if (summary.state === "unassigned") {
        return "Unassigned";
    }

    const names = item.allocations.map(
        (allocation) => {
            const participant = participants.find(
                (candidate) =>
                    candidate.id ===
                    allocation.participantId,
            );

            return (
                participant?.displayName ??
                "Unknown person"
            );
        },
    );

    const nameList = names.join(", ");

    if (summary.state === "partially_assigned") {
        return `Partially assigned to ${nameList} · ${formatMoney(
            summary.remainingSen,
            currency,
        )} left`;
    }

    return `Assigned to ${nameList}`;
}

function participantAdjustmentRows(
    summary: ParticipantFinancialSummary,
): Array<{ label: string; amountSen: number }> {
    return [
        {
            label: "Items subtotal",
            amountSen: summary.itemSubtotalSen,
        },
        {
            label: "Service charge",
            amountSen: summary.adjustments.serviceChargeSen,
        },
        {
            label: "Tax / SST",
            amountSen: summary.adjustments.taxSen,
        },
        {
            label: "Discount",
            amountSen: summary.adjustments.discountSen,
        },
        {
            label: "Rounding",
            amountSen: summary.adjustments.roundingSen,
        },
        {
            label: "Other",
            amountSen: summary.adjustments.otherSen,
        },
    ].filter((row) => row.amountSen !== 0);
}

function describeFinalisationBlocker(
    reason: BillFinalisationBlocker,
): string {
    switch (reason) {
        case "no_items":
            return "Add at least one item.";
        case "receipt_not_reconciled":
            return "Reconcile the printed and calculated totals.";
        case "source_totals_mismatch":
            return "Item and charge totals don't match the receipt calculation.";
        case "items_not_fully_assigned":
            return "Fully assign every item.";
        case "adjustments_not_fully_assigned":
            return "Fully allocate every charge and discount — assign items first so they can be split proportionally.";
        case "participant_totals_mismatch":
            return "Participant totals don't match the assigned amounts.";
        case "assignment_total_mismatch":
            return "Participant shares don't add up to the receipt total.";
        case "negative_participant_total":
            return "A participant's total is below zero.";
    }
}

function formatSignedMoney(
    amountSen: number,
    currency: string,
): string {
    if (amountSen === 0) {
        return formatMoney(0, currency);
    }

    const sign =
        amountSen > 0 ? "+" : "−";

    return `${sign}${formatMoney(
        Math.abs(amountSen),
        currency,
    )}`;
}

function getReconciliationMessage(
    differenceSen: number,
    currency: string,
): string {
    const absoluteDifference =
        formatMoney(
            Math.abs(differenceSen),
            currency,
        );

    if (differenceSen > 0) {
        return `The calculated total is ${absoluteDifference} higher than the printed total.`;
    }

    return `The calculated total is ${absoluteDifference} lower than the printed total.`;
}

function formatQuantity(
    quantity: number,
): string {
    return new Intl.NumberFormat(
        "en-MY",
    ).format(quantity);
}

function getBillStatusLabel(
    status: string,
): string {
    const labels: Record<string, string> = {
        draft: "Draft bill",
        open: "Open bill",
        finalised: "Finalised bill",
        settled: "Settled bill",
        archived: "Archived bill",
    };

    return labels[status] ?? "Bill";
}