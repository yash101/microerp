import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getCustomerWithConversations } from "@/lib/data";
import { ConversationMessageForm } from "@/components/forms";
import { ButtonLink, PageShell } from "@/components/ui";

export default async function NewConversationMessagePage({
  params
}: {
  params: Promise<{ customerId: string }>;
}) {
  const user = await requireSession();
  const { customerId } = await params;
  const customer = await getCustomerWithConversations(user.id, customerId);

  if (!customer) notFound();

  return (
    <PageShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-moss">Conversation</p>
          <h1 className="mt-1 text-3xl font-bold">New message for {customer.name}</h1>
        </div>
        <ButtonLink href={`/conversations/customers/${customer.id}`} tone="secondary">
          Back
        </ButtonLink>
      </div>
      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
        <ConversationMessageForm customerId={customer.id} />
      </section>
    </PageShell>
  );
}
