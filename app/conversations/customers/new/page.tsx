import { CustomerForm } from "@/components/forms";
import { ButtonLink, PageShell } from "@/components/ui";

export default function NewCustomerPage() {
  return (
    <PageShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-moss">Customer</p>
          <h1 className="mt-1 text-3xl font-bold">New customer</h1>
        </div>
        <ButtonLink href="/conversations" tone="secondary">
          Back
        </ButtonLink>
      </div>
      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
        <CustomerForm />
      </section>
    </PageShell>
  );
}
