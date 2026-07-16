"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function CreateBillSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="
    h-12 w-full touch-manipulation rounded-xl
    bg-primary px-6
    text-base font-medium text-primary-foreground
    shadow-[0_4px_0_#9f2b1a]
    transition-[transform,box-shadow]
    duration-150 ease-out
    active:translate-y-[3px]
    active:shadow-[0_1px_0_#9f2b1a]
    focus-visible:ring-2
    focus-visible:ring-ring
    focus-visible:ring-offset-2
    focus-visible:ring-offset-background
    disabled:translate-y-0
    disabled:cursor-not-allowed
    disabled:opacity-60
    disabled:shadow-none
    motion-reduce:transform-none
    motion-reduce:transition-none
  "
    >
      {pending ? "Creating bill…" : "Create bill"}
    </Button>
  );
}