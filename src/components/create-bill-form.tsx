"use client";

import { useActionState, useState } from "react";
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

  const [ownerDisplayName, setOwnerDisplayName] = useState("");
  const [ownerNameTouched, setOwnerNameTouched] = useState(false);

  const ownerServerError =
    state.fieldErrors?.ownerDisplayName?.[0];

  const ownerLocalError =
    ownerNameTouched && ownerDisplayName.trim().length === 0
      ? "Enter your name."
      : undefined;

  const ownerError = ownerLocalError ?? ownerServerError;

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
              Your name
            </Label>

            <Input
              id="ownerDisplayName"
              name="ownerDisplayName"
              type="text"
              autoComplete="name"
              placeholder="e.g. Jeff"
              maxLength={100}
              required
              value={ownerDisplayName}
              aria-invalid={Boolean(ownerError)}
              aria-describedby={
                ownerError
                  ? "ownerDisplayName-error"
                  : "ownerDisplayName-help"
              }
              className="
                h-11 bg-card
                aria-invalid:border-destructive
                aria-invalid:ring-destructive/20    
              "
              onChange={(event) => {
                setOwnerDisplayName(event.target.value);
              }}
              onBlur={() => {
                setOwnerNameTouched(true);
              }}
              onInvalid={(event) => {
                event.preventDefault();
                setOwnerNameTouched(true);
              }}
            />

            {ownerError ? (
              <p
                id="ownerDisplayName-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {ownerError}
              </p>
            ) : (
              <p
                id="ownerDisplayName-help"
                className="text-sm text-muted-foreground"
              >
                Shown to everyone on this bill.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="merchantName">
              Restaurant Name
              <span className="ms-1 text-muted-foreground">
                (Optional)
              </span>
            </Label>

            <Input
              id="merchantName"
              name="merchantName"
              type="text"
              autoComplete="off"
              placeholder="e.g. Nasi House…"
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