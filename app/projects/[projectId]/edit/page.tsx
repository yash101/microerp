import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getProject } from "@/lib/data";
import { ProjectForm } from "@/components/forms";
import { ButtonLink, PageShell } from "@/components/ui";

export default async function EditProjectPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  await requireSession();
  const { projectId } = await params;
  const project = await getProject(projectId);

  if (!project) notFound();

  return (
    <PageShell>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-moss">Project</p>
          <h1 className="mt-1 text-3xl font-bold">Edit {project.name}</h1>
        </div>
        <ButtonLink href={`/projects/${project.id}`} tone="secondary">
          Back
        </ButtonLink>
      </div>
      <section className="max-w-2xl rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
        <ProjectForm project={project} />
      </section>
    </PageShell>
  );
}
