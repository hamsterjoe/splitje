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
import { AddItemForm } from "@/components/add-item-form";
import { UpdatePrintedTotalForm } from "@/components/update-printed-total-form";
import { calculateOwnerBillReconciliation } from "@/application/billing/calculate-owner-bill-reconciliation";

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

    const hasItems = bill.items.length > 0;

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
                                        billId={bill.id}
                                        rowVersion={bill.rowVersion}
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
                                                    className="flex min-h-14 items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                                                >
                                                    <span className="min-w-0 break-words font-medium">
                                                        {participant.displayName}
                                                    </span>

                                                    {participant.isOwner ? (
                                                        <span className="shrink-0 text-sm text-muted-foreground">
                                                            Owner
                                                        </span>
                                                    ) : null}
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
                                        {bill.items.map((item) => (
                                            <li
                                                key={item.id}
                                                className="flex min-h-16 items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                                            >
                                                <div className="min-w-0">
                                                    <p className="break-words font-medium">
                                                        {item.description}
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
                                                </div>

                                                <p className="shrink-0 font-semibold tabular-nums">
                                                    {formatMoney(
                                                        item.lineTotalSen,
                                                        bill.currency,
                                                    )}
                                                </p>
                                            </li>
                                        ))}
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
                                            (adjustment) => (
                                                <li
                                                    key={adjustment.id}
                                                    className="flex min-h-16 items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="break-words font-medium">
                                                            {adjustment.label}
                                                        </p>

                                                        <p className="mt-1 text-sm text-muted-foreground">
                                                            {getAdjustmentTypeLabel(
                                                                adjustment.type,
                                                            )}
                                                        </p>
                                                    </div>

                                                    <p className="shrink-0 font-semibold tabular-nums">
                                                        {formatSignedMoney(
                                                            adjustment.amountSen,
                                                            bill.currency,
                                                        )}
                                                    </p>
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                )}

                                <div className="border-t pt-5">
                                    <AddAdjustmentForm
                                        billId={bill.id}
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

function getAdjustmentTypeLabel(
    type:
        | "discount"
        | "service_charge"
        | "tax"
        | "rounding"
        | "other",
): string {
    const labels = {
        discount: "Discount",
        service_charge: "Service charge",
        tax: "Tax / SST",
        rounding: "Rounding",
        other: "Other fee",
    };

    return labels[type];
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