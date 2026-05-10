import ReactMarkdown from "react-markdown";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getProject, getTask } from "@/lib/data";
import { deleteTaskAction } from "@/lib/actions";
import { ButtonLink, PageShell, SubmitButton } from "@/components/ui";

export default async function TaskPage({
  params
}: {
  params: Promise<{ projectId: string; taskId: string }>;
}) {
  const user = await requireSession();
  const { projectId, taskId } = await params;
  const [project, task] = await Promise.all([
    getProject(user.id, projectId),
    getTask(user.id, projectId, taskId)
  ]);

  if (!project || !task) notFound();

  return (
    <PageShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-moss">Task</p>
          <h1 className="mt-1 text-3xl font-bold">{task.name}</h1>
        </div>
        <div className="flex gap-2">
          <ButtonLink href={`/projects/${project.id}/tasks/${task.id}/edit`}>Edit</ButtonLink>
          <ButtonLink href={`/projects/${project.id}`} tone="secondary">
            Back
          </ButtonLink>
        </div>
      </div>

      <section className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <article className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Priority" value={task.priority.priority.toFixed(2)} />
            <Metric label="Value" value={task.priority.value.toString()} />
            <Metric label="Cost" value={task.priority.cost.toString()} />
            <Metric label="Status" value={task.status} />
          </div>

          {task.descriptionMarkdown ? (
            <div className="markdown mt-6 border-t border-ink/10 pt-5 text-sm text-ink/75">
              <ReactMarkdown>{task.descriptionMarkdown}</ReactMarkdown>
            </div>
          ) : (
            <p className="mt-6 border-t border-ink/10 pt-5 text-sm text-ink/55">No description yet.</p>
          )}
        </article>

        <aside className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Details</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <Detail label="Estimated" value={`${task.estimatedMinutes} min`} />
            <Detail label="Impact" value={task.impact.toString()} />
            <Detail label="Differentiation" value={task.differentiation.toString()} />
            <Detail label="Complexity" value={task.complexity.toString()} />
            <Detail label="Risk" value={task.risk.toString()} />
            <Detail label="Offset" value={task.priorityOffset.toString()} />
          </dl>
          <h3 className="mt-6 font-semibold">Components</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {task.components.length > 0 ? (
              task.components.map((component) => (
                <span key={component.id} className="rounded bg-paper px-2 py-1 text-xs font-medium">
                  {component.name}
                </span>
              ))
            ) : (
              <p className="text-sm text-ink/55">None</p>
            )}
          </div>
          <form action={deleteTaskAction.bind(null, project.id, task.id)} className="mt-6">
            <SubmitButton tone="danger">Delete task</SubmitButton>
          </form>
        </aside>
      </section>
    </PageShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-paper px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/50">{label}</p>
      <p className="mt-1 text-xl font-bold capitalize">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-ink/10 pb-2">
      <dt className="text-ink/55">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
