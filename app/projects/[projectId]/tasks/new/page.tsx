import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getProject, listComponents } from "@/lib/data";
import { TaskForm } from "@/components/forms";
import { ButtonLink, PageShell } from "@/components/ui";

export default async function NewTaskPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  await requireSession();
  const { projectId } = await params;
  const [project, componentRows] = await Promise.all([getProject(projectId), listComponents(projectId)]);

  if (!project) notFound();

  return (
    <PageShell>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-moss">Task</p>
          <h1 className="mt-1 text-3xl font-bold">Create task</h1>
        </div>
        <ButtonLink href={`/projects/${project.id}`} tone="secondary">
          Back
        </ButtonLink>
      </div>
      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
        <TaskForm projectId={project.id} components={componentRows} />
      </section>
    </PageShell>
  );
}
