import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface BillPageProps {
  params: Promise<{
    billId: string;
  }>;
}

export default async function BillPage({
  params,
}: BillPageProps) {
  const { billId } = await params;

  return (
    <main
      id="main-content"
      className="min-h-dvh bg-muted/30"
    >
      <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-6 sm:py-12">
        <Card>
          <CardHeader>
            <CardTitle>
              Draft Bill Created
            </CardTitle>

            <CardDescription>
              The manual bill workspace will be added
              next.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="min-w-0 rounded-lg border bg-muted/40 p-4">
              <p className="text-sm font-medium">
                Bill Reference
              </p>

              <p className="mt-1 break-all font-mono text-sm text-muted-foreground">
                {billId}
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex min-h-11 touch-manipulation items-center font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Return Home
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}