import ReactMarkdown from "react-markdown";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getProject, listComponents } from "@/lib/data";
import { deleteComponentAction } from "@/lib/actions";
import { ComponentForm } from "@/components/forms";
import { ButtonLink, PageShell, SubmitButton } from "@/components/ui";

export default async function ComponentsPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const user = await requireSession();
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const [project, componentRows] = await Promise.all([
    getProject(user.id, projectId),
    listComponents(user.id, projectId)
  ]);

  if (!project) notFound();

  const editing = query.edit ? componentRows.find((component) => component.id === query.edit) : undefined;

  return (
    <PageShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-moss">Components</p>
          <h1 className="mt-1 text-3xl font-bold">{project.name}</h1>
        </div>
        <ButtonLink href={`/projects/${project.id}`} tone="secondary">
          Back to dashboard
        </ButtonLink>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="grid gap-3">
          {componentRows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-ink/20 bg-white p-6 text-sm text-ink/60">
              No components yet. Add one to tag work by surface area.
            </div>
          ) : (
            componentRows.map((component) => (
              <article key={component.id} className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{component.name}</h2>
                    {component.descriptionMarkdown ? (
                      <div className="markdown mt-2 text-sm text-ink/70">
                        <ReactMarkdown>{component.descriptionMarkdown}</ReactMarkdown>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <ButtonLink href={`/projects/${project.id}/components?edit=${component.id}`} tone="secondary">
                      Edit
                    </ButtonLink>
                    <form action={deleteComponentAction.bind(null, project.id, component.id)}>
                      <SubmitButton tone="danger">Delete</SubmitButton>
                    </form>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>

        <aside className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">{editing ? "Edit component" : "Add component"}</h2>
          <ComponentForm projectId={project.id} component={editing} />
        </aside>
      </div>
    </PageShell>
  );
}
