import { CreateBillForm } from "@/components/create-bill-form";

export default function HomePage() {
  return (
    <main className="min-h-svh bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-md flex-col gap-8">
        <header className="space-y-5">
          <p className="text-sm font-semibold tracking-[-0.01em] text-[var(--brand)]">
            SplitJe
          </p>

          <div className="space-y-3">
            <h1 className="font-heading text-[2.75rem] font-bold leading-[0.98] tracking-[-0.035em] text-foreground sm:text-5xl">
              Split the bill,
              <br />
              not the mood.
            </h1>

            <p className="max-w-sm text-base leading-6 text-muted-foreground">
              Create a shared bill in seconds.
            </p>
          </div>
        </header>

        <CreateBillForm />
      </div>
    </main>
  );
}

{/* import Image from "next/image"; -- to replace with svg logo later

  <Image
    src="/brand/logo.png"
    alt="SplitJe"
    width={132}
    height={40}
    priority
    className="h-9 w-auto"
  />
  */}