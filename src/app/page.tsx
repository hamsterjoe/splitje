import { CreateBillForm } from "@/components/create-bill-form";

export default function HomePage() {
  return (
    <main
      id="main-content"
      className="min-h-dvh bg-background"
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10 sm:px-6">
        <header className="mb-5 space-y-5">
          <div className="text-sm font-semibold tracking-tight text-primary">
            SplitJe
          </div>

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

          <div className="space-y-3">
            <h1 className="font-heading text-3xl font-bold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl">
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

        <p className="mt-6 text-pretty text-center text-sm leading-6 text-muted-foreground">
          Draft ownership is initially tied to this
          browser. Account recovery will remain
          optional.
        </p>
      </div>
    </main>
  );
}