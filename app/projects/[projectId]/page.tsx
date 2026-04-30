import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { groupTasksByStatus, getProject, listComponents, listProjects, listTasks } from "@/lib/data";
import { deleteProjectAction, updateTaskStatusFromFormAction } from "@/lib/actions";
import type { TaskStatus } from "@/db/schema";
import { ButtonLink, EmptyState, PageShell, SubmitButton } from "@/components/ui";

const statusLabels: Record<TaskStatus, string> = {
  candidate: "Candidate",
  included: "Included",
  cut: "Cut",
  later: "Later"
};

const statuses = Object.keys(statusLabels) as TaskStatus[];

export default async function ProjectPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  await requireSession();
  const { projectId } = await params;
  const [project, projects, taskRows, componentRows] = await Promise.all([
    getProject(projectId),
    listProjects(),
    listTasks(projectId),
    listComponents(projectId)
  ]);

  if (!project) notFound();

  const grouped = groupTasksByStatus(taskRows);

  return (
    <PageShell>
      <header className="mb-6 grid gap-4 lg:grid-cols-[18rem_1fr]">
        <aside className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-moss">Projects</p>
            <ButtonLink href="/projects/new" tone="secondary">
              New
            </ButtonLink>
          </div>
          <nav className="mt-4 grid gap-1">
            {projects.map((item) => (
              <Link
                key={item.id}
                href={`/projects/${item.id}`}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  item.id === project.id ? "bg-moss text-white" : "hover:bg-ink/5"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </aside>

        <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-moss">Planning dashboard</p>
              <h1 className="mt-1 text-3xl font-bold">{project.name}</h1>
              {project.description ? <p className="mt-2 max-w-3xl text-sm text-ink/65">{project.description}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href={`/projects/${project.id}/tasks/new`}>New task</ButtonLink>
              <ButtonLink href={`/projects/${project.id}/components`} tone="secondary">
                Components
              </ButtonLink>
              <ButtonLink href={`/projects/${project.id}/edit`} tone="secondary">
                Edit
              </ButtonLink>
              <a className="inline-flex h-10 items-center px-2 text-sm font-medium text-ink/60 hover:text-ink" href="/logout">
                Logout
              </a>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Metric label="Tasks" value={taskRows.length} />
            <Metric label="Components" value={componentRows.length} />
            <Metric
              label="Included effort"
              value={taskRows
                .filter((task) => task.status === "included")
                .reduce((sum, task) => sum + task.estimatedMinutes, 0)}
              suffix="min"
            />
          </div>
        </section>
      </header>

      {taskRows.length === 0 ? (
        <EmptyState
          title="No tasks in this project"
          body="Add candidate work, score it, and the dashboard will sort it by priority."
          action={<ButtonLink href={`/projects/${project.id}/tasks/new`}>Create task</ButtonLink>}
        />
      ) : (
        <section className="grid gap-4 xl:grid-cols-4">
          {statuses.map((status) => (
            <div key={status} className="rounded-lg border border-ink/10 bg-white p-3 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-semibold">{statusLabels[status]}</h2>
                <span className="rounded-full bg-ink/5 px-2 py-1 text-xs font-semibold">{grouped[status].length}</span>
              </div>
              <div className="grid gap-3">
                {grouped[status].map((task) => (
                  <article key={task.id} className="rounded-md border border-ink/10 bg-paper p-3">
                    <div className="flex items-start justify-between gap-3">
                      <Link className="font-semibold hover:underline" href={`/projects/${project.id}/tasks/${task.id}`}>
                        {task.name}
                      </Link>
                      <span className="rounded-md bg-white px-2 py-1 text-xs font-bold">
                        {task.priority.priority.toFixed(2)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-ink/60">
                      Value {task.priority.value} / Cost {task.priority.cost} / {task.estimatedMinutes} min
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {task.components.map((component) => (
                        <span key={component.id} className="rounded bg-white px-2 py-1 text-xs text-ink/70">
                          {component.name}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-ink/65">
                      <span>Impact {task.impact}</span>
                      <span>Diff {task.differentiation}</span>
                      <span>Complexity {task.complexity}</span>
                      <span>Risk {task.risk}</span>
                    </div>
                    <form className="mt-3" action={updateTaskStatusFromFormAction.bind(null, project.id, task.id)}>
                      <div className="grid grid-cols-2 gap-2">
                        {statuses
                          .filter((candidate) => candidate !== task.status)
                          .slice(0, 2)
                          .map((candidate) => (
                            <SubmitButton
                              key={candidate}
                              name="status"
                              value={candidate}
                              tone="secondary"
                            >
                              {statusLabels[candidate]}
                            </SubmitButton>
                          ))}
                      </div>
                    </form>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      <form action={deleteProjectAction.bind(null, project.id)} className="mt-8">
        <SubmitButton tone="danger">Delete project</SubmitButton>
      </form>
    </PageShell>
  );
}

function Metric({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-md bg-paper px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/50">{label}</p>
      <p className="mt-1 text-2xl font-bold">
        {value}
        {suffix ? <span className="ml-1 text-sm font-semibold text-ink/50">{suffix}</span> : null}
      </p>
    </div>
  );
}
