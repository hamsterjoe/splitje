"use client";

import { useActionState, useState } from "react";

import { createBillAction } from "@/app/create-bill-action";
import { initialCreateBillActionState } from "@/app/create-bill-action-state";
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
    state.fieldErrors?.ownerDisplayName;

  const ownerLocalError =
    ownerNameTouched && ownerDisplayName.trim().length === 0
      ? "Enter your name."
      : undefined;

  const ownerError = ownerNameTouched
    ? ownerLocalError
    : ownerServerError;

  const merchantError =
    state.fieldErrors?.merchantName;

  return (
    <Card className="w-full gap-0 rounded-2xl border-border bg-card py-0 shadow-card">
      <CardHeader className="space-y-1.5 px-5 pt-5 pb-0 sm:px-6 sm:pt-6">
        <CardTitle className="text-xl font-semibold tracking-[-0.02em]">
          Create a bill
        </CardTitle>

        <CardDescription className="text-sm leading-5">
          You can add people and items next.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-5 pt-6 pb-5 sm:px-6 sm:pb-6">
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
                setOwnerNameTouched(true);
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
                className="text-sm leading-5 text-destructive"
              >
                {ownerError}
              </p>
            ) : (
              <p
                id="ownerDisplayName-help"
                className="text-sm leading-5 text-muted-foreground"
              >
                Shown to everyone on this bill.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="merchantName">
              Restaurant name
              <span className="ms-1 font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>

            <Input
              id="merchantName"
              name="merchantName"
              type="text"
              autoComplete="off"
              placeholder="e.g. Nasi House"
              maxLength={200}
              aria-invalid={Boolean(merchantError)}
              aria-describedby={
                merchantError
                  ? "merchantName-error"
                  : undefined
              }
              className="
                h-11 bg-card
                aria-invalid:border-destructive
                aria-invalid:ring-destructive/20
              "
            />

            {merchantError ? (
              <p
                id="merchantName-error"
                role="alert"
                className="text-sm leading-5 text-destructive"
              >
                {merchantError}
              </p>
            ) : null}
          </div>

          <div
            aria-live="polite"
            aria-atomic="true"
          >
            {state.message ? (
              <p
                role="alert"
                className="text-sm leading-5 text-destructive"
              >
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