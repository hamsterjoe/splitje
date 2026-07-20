"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function AddAdjustmentSubmitButton() {
    const { pending } = useFormStatus();

    return (
        <Button
            type="submit"
            disabled={pending}
            aria-disabled={pending}
            aria-busy={pending}
            className="min-h-11 touch-manipulation"
        >
            {pending
                ? "Adding adjustment…"
                : "Add adjustment"}
        </Button>
    );
}