import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getProject } from "@/lib/data";
import { CustomerForm } from "@/components/forms";
import { ButtonLink, PageShell } from "@/components/ui";

export default async function NewCustomerPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireSession();
  const { projectId } = await params;
  const project = await getProject(user.id, projectId);

  if (!project) notFound();

  return (
    <PageShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-moss">Customer</p>
          <h1 className="mt-1 text-3xl font-bold">New customer</h1>
          <p className="mt-2 text-sm text-ink/60">{project.name}</p>
        </div>
        <ButtonLink href={`/projects/${project.id}/conversations`} tone="secondary">
          Back
        </ButtonLink>
      </div>
      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
        <CustomerForm projectId={project.id} />
      </section>
    </PageShell>
  );
}
