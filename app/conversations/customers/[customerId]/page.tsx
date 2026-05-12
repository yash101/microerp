import ReactMarkdown from "react-markdown";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getCustomerWithConversations } from "@/lib/data";
import { deleteCustomerAction } from "@/lib/actions";
import { ConversationTimeline } from "@/components/conversations";
import { ButtonLink, EmptyState, PageShell, SubmitButton } from "@/components/ui";

function formatDateTime(value: Date | string | null) {
  if (!value) return "No contact yet";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "No contact yet";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export default async function CustomerPage({
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
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-moss">Customer</p>
          <h1 className="mt-1 text-3xl font-bold">{customer.name}</h1>
          <p className="mt-2 text-sm text-ink/60">First contact: {formatDateTime(customer.firstContactAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/conversations/customers/${customer.id}/messages/new`}>New message</ButtonLink>
          <ButtonLink href={`/conversations/customers/${customer.id}/edit`} tone="secondary">
            Edit
          </ButtonLink>
          <ButtonLink href="/conversations" tone="secondary">
            Back
          </ButtonLink>
        </div>
      </header>

      <section className="mb-5 rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Details</h2>
        {customer.descriptionMarkdown ? (
          <div className="markdown mt-3 text-sm text-ink/75">
            <ReactMarkdown>{customer.descriptionMarkdown}</ReactMarkdown>
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink/55">No description yet.</p>
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Conversation timeline</h2>
            <p className="mt-1 text-sm text-ink/60">{customer.messages.length} messages tracked.</p>
          </div>
        </div>
        <ConversationTimeline
          messages={customer.messages}
          showCustomer={false}
          emptyState={
            <EmptyState
              title="No messages yet"
              body="Add the first note, meeting summary, call log, or follow-up for this customer."
              action={<ButtonLink href={`/conversations/customers/${customer.id}/messages/new`}>Add message</ButtonLink>}
            />
          }
        />
      </section>

      <form action={deleteCustomerAction.bind(null, customer.id)} className="mt-8">
        <SubmitButton tone="danger">Delete customer</SubmitButton>
      </form>
    </PageShell>
  );
}
