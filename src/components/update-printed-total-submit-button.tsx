"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function UpdatePrintedTotalSubmitButton() {
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
                ? "Saving total…"
                : "Save total"}
        </Button>
    );
}