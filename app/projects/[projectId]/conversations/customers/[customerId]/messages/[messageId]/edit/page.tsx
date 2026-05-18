import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getConversationMessage, getCustomerWithConversations, getProject } from "@/lib/data";
import { deleteConversationMessageAction } from "@/lib/actions";
import { ConversationMessageForm } from "@/components/forms";
import { ButtonLink, PageShell, SubmitButton } from "@/components/ui";

export default async function EditConversationMessagePage({
  params
}: {
  params: Promise<{ projectId: string; customerId: string; messageId: string }>;
}) {
  const user = await requireSession();
  const { projectId, customerId, messageId } = await params;
  const [project, customer, message] = await Promise.all([
    getProject(user.id, projectId),
    getCustomerWithConversations(user.id, projectId, customerId),
    getConversationMessage(user.id, projectId, customerId, messageId)
  ]);

  if (!project || !customer || !message) notFound();

  return (
    <PageShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-moss">Conversation</p>
          <h1 className="mt-1 text-3xl font-bold">Edit message</h1>
          <p className="mt-2 text-sm text-ink/60">
            {project.name} / {customer.name}
          </p>
        </div>
        <ButtonLink href={`/projects/${project.id}/conversations/customers/${customer.id}`} tone="secondary">
          Back
        </ButtonLink>
      </div>
      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
        <ConversationMessageForm projectId={project.id} customerId={customer.id} message={message} />
      </section>
      <form action={deleteConversationMessageAction.bind(null, project.id, customer.id, message.id)} className="mt-5">
        <SubmitButton tone="danger">Delete message</SubmitButton>
      </form>
    </PageShell>
  );
}
