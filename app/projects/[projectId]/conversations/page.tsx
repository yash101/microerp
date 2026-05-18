import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getProject, listConversationCustomers, listConversationTimeline } from "@/lib/data";
import { ConversationTimeline } from "@/components/conversations";
import { ButtonLink, EmptyState, PageShell, SubmitButton, inputClass } from "@/components/ui";

function formatFirstContact(value: Date | string | null) {
  if (!value) return "No contact yet";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "No contact yet";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export default async function ProjectConversationsPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireSession();
  const { projectId } = await params;
  const { q = "" } = await searchParams;
  const [project, customers, messages] = await Promise.all([
    getProject(user.id, projectId),
    listConversationCustomers(user.id, projectId, q),
    listConversationTimeline(user.id, projectId, q)
  ]);

  if (!project) notFound();

  return (
    <PageShell>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-moss">Conversations</p>
          <h1 className="mt-1 text-3xl font-bold">{project.name} customer history</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/projects/${project.id}/conversations/customers/new`}>New customer</ButtonLink>
          <ButtonLink href={`/projects/${project.id}`} tone="secondary">
            Project
          </ButtonLink>
        </div>
      </header>

      <form action={`/projects/${project.id}/conversations`} className="mb-5 grid gap-2 rounded-lg border border-ink/10 bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto]">
        <input
          className={inputClass}
          name="q"
          type="search"
          placeholder="Search customers and messages"
          defaultValue={q}
        />
        <SubmitButton>Search</SubmitButton>
      </form>

      <section className="grid gap-5 lg:grid-cols-[20rem_1fr]">
        <aside className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Customers</h2>
            <span className="rounded-full bg-paper px-2 py-1 text-xs font-semibold text-ink/60">
              {customers.length} / 50
            </span>
          </div>
          {customers.length === 0 ? (
            <p className="text-sm text-ink/60">No customers match this search.</p>
          ) : (
            <nav className="grid gap-2">
              {customers.map((customer) => (
                <Link
                  key={customer.id}
                  href={`/projects/${project.id}/conversations/customers/${customer.id}`}
                  className="rounded-md border border-ink/10 bg-paper px-3 py-2 hover:border-ink/25"
                >
                  <span className="block font-semibold">{customer.name}</span>
                  <span className="mt-1 block text-xs text-ink/55">{formatFirstContact(customer.firstContactAt)}</span>
                </Link>
              ))}
            </nav>
          )}
        </aside>

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Timeline</h2>
              <p className="mt-1 text-sm text-ink/60">Showing up to 50 matching messages.</p>
            </div>
          </div>
          <ConversationTimeline
            projectId={project.id}
            messages={messages}
            emptyState={
              <EmptyState
                title="No conversations yet"
                body="Create a customer, then add messages to build a searchable customer history for this project."
                action={<ButtonLink href={`/projects/${project.id}/conversations/customers/new`}>Create customer</ButtonLink>}
              />
            }
          />
        </section>
      </section>
    </PageShell>
  );
}
