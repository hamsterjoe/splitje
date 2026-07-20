"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function AddItemSubmitButton() {
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
                ? "Adding item…"
                : "Add item"}
        </Button>
    );
}