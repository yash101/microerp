import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getProject, getTask, listComponents } from "@/lib/data";
import { TaskForm } from "@/components/forms";
import { ButtonLink, PageShell } from "@/components/ui";

export default async function EditTaskPage({
  params
}: {
  params: Promise<{ projectId: string; taskId: string }>;
}) {
  await requireSession();
  const { projectId, taskId } = await params;
  const [project, task, componentRows] = await Promise.all([
    getProject(projectId),
    getTask(projectId, taskId),
    listComponents(projectId)
  ]);

  if (!project || !task) notFound();

  return (
    <PageShell>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-moss">Task</p>
          <h1 className="mt-1 text-3xl font-bold">Edit {task.name}</h1>
        </div>
        <ButtonLink href={`/projects/${project.id}/tasks/${task.id}`} tone="secondary">
          Back
        </ButtonLink>
      </div>
      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
        <TaskForm
          projectId={project.id}
          task={task}
          components={componentRows}
          selectedComponentIds={task.components.map((component) => component.id)}
        />
      </section>
    </PageShell>
  );
}
