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

                        <CardContent className="grid gap-4 sm:grid-cols-2">
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