"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function CreateBillSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="h-12 w-full touch-manipulation text-base"
      disabled={pending}
    >
      {pending ? "Creating bill…" : "Create Bill"}
    </Button>
  );
}