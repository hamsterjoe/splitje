"use client";

import { useActionState } from "react";

import {
  initialCreateBillActionState,
} from "@/app/create-bill-action-state";
import { createBillAction } from "@/app/create-bill-action";
import { CreateBillSubmitButton } from "@/components/create-bill-submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateBillForm() {
  const [state, formAction] = useActionState(
    createBillAction,
    initialCreateBillActionState,
  );

  const ownerError =
    state.fieldErrors.ownerDisplayName;

  const merchantError =
    state.fieldErrors.merchantName;

  return (
    <Card className="w-full border-border/80 shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl">
          Start a New Bill
        </CardTitle>

        <CardDescription className="text-pretty">
          No account required. Your draft will be
          saved to this browser.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          action={formAction}
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="ownerDisplayName">
              Your Name
            </Label>

            <Input
              id="ownerDisplayName"
              name="ownerDisplayName"
              type="text"
              autoComplete="name"
              placeholder="For example, Jeff…"
              maxLength={100}
              required
              aria-invalid={Boolean(ownerError)}
              aria-describedby={
                ownerError
                  ? "ownerDisplayName-error"
                  : "ownerDisplayName-help"
              }
            />

            {ownerError ? (
              <p
                id="ownerDisplayName-error"
                className="text-sm text-destructive"
              >
                {ownerError}
              </p>
            ) : (
              <p
                id="ownerDisplayName-help"
                className="text-sm text-muted-foreground"
              >
                This name appears in the bill split.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="merchantName">
              Restaurant or Merchant
              <span className="ms-1 text-muted-foreground">
                (Optional)
              </span>
            </Label>

            <Input
              id="merchantName"
              name="merchantName"
              type="text"
              autoComplete="off"
              placeholder="For example, Nasi House…"
              maxLength={200}
              aria-invalid={Boolean(merchantError)}
              aria-describedby={
                merchantError
                  ? "merchantName-error"
                  : undefined
              }
            />

            {merchantError ? (
              <p
                id="merchantName-error"
                className="text-sm text-destructive"
              >
                {merchantError}
              </p>
            ) : null}
          </div>

          <div
            aria-live="polite"
            aria-atomic="true"
            className="min-h-5"
          >
            {state.message ? (
              <p className="text-sm text-destructive">
                {state.message}
              </p>
            ) : null}
          </div>

          <CreateBillSubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}