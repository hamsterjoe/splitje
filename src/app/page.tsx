import { CreateBillForm } from "@/components/create-bill-form";

export default function HomePage() {
  return (
    <main
      id="main-content"
      className="min-h-dvh bg-background"
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10 sm:px-6">
        <header className="mb-8 space-y-4">
          <p className="text-sm font-medium text-primary">
            SplitJe
          </p>

          <h1 className="text-pretty text-4xl font-semibold tracking-tight">
            Split the Bill, Not the Mood.
          </h1>

          <p className="text-pretty text-base leading-7 text-muted-foreground">
            Create a bill, add the people at the table,
            and divide by order.
          </p>
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