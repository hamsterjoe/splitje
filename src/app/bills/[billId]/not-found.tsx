import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function BillNotFound() {
  return (
    <main
      id="main-content"
      className="min-h-dvh bg-muted/30"
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-lg items-center px-5 py-8 sm:px-6">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>
              <h1>Bill not found</h1>
            </CardTitle>

            <CardDescription>
              This bill does not exist or is not
              available from this browser.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Link
              href="/"
              className="inline-flex min-h-11 touch-manipulation items-center font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Return home
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}