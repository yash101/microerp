import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { groupTasksByStatus, getProject, listComponents, listExpenses, listProjects, listTasks } from "@/lib/data";
import { deleteProjectAction, updateTaskStatusFromFormAction } from "@/lib/actions";
import type { TaskStatus } from "@/db/schema";
import { ButtonLink, EmptyState, PageShell, SubmitButton } from "@/components/ui";

const statusLabels: Record<TaskStatus, string> = {
  candidate: "Candidate",
  included: "Included",
  complete: "Complete",
  cut: "Cut",
  later: "Later"
};

const statuses = Object.keys(statusLabels) as TaskStatus[];
const ganttStatuses: TaskStatus[] = ["complete", "included", "later"];

const ganttColors: Record<TaskStatus, string> = {
  candidate: "bg-stone-100 border-stone-200",
  included: "bg-sky-100 border-sky-200",
  complete: "bg-green-100 border-green-200",
  cut: "bg-red-100 border-red-200",
  later: "bg-yellow-100 border-yellow-200"
};

const dayMs = 24 * 60 * 60 * 1000;

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(value);
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function daysBetween(start: Date, end: Date) {
  return Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / dayMs);
}

function buildDateCells(rangeStart: Date | null, rangeEnd: Date | null) {
  if (!rangeStart || !rangeEnd) return [];

  const firstDay = startOfDay(rangeStart);
  const dayCount = daysBetween(firstDay, rangeEnd) + 1;

  return Array.from({ length: dayCount }, (_, index) => new Date(firstDay.getTime() + index * dayMs));
}

function buildGanttTasks<T extends { startAt: Date | null; endAt: Date | null; status: TaskStatus }>(taskRows: T[]) {
  const datedTasks = taskRows
    .filter((task) => ganttStatuses.includes(task.status) && task.startAt && task.endAt)
    .map((task) => ({
      ...task,
      startAt: task.startAt as Date,
      endAt: task.endAt as Date
    }))
    .filter((task) => task.endAt.getTime() >= task.startAt.getTime())
    .sort((left, right) => left.startAt.getTime() - right.startAt.getTime());

  if (datedTasks.length === 0) {
    return { datedTasks, rangeStart: null, rangeEnd: null };
  }

  const rangeStart = new Date(Math.min(...datedTasks.map((task) => task.startAt.getTime())));
  const rangeEnd = new Date(Math.max(...datedTasks.map((task) => task.endAt.getTime())));

  return { datedTasks, rangeStart, rangeEnd };
}

function amountValue(amount: string) {
  return Number.parseFloat(amount);
}

function expensingAmount(expense: { amount: string; businessUsePercentage: string }) {
  return amountValue(expense.amount) * (Number.parseFloat(expense.businessUsePercentage) / 100);
}

export default async function ProjectPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireSession();
  const { projectId } = await params;
  const [project, projects, taskRows, componentRows, expenseRows] = await Promise.all([
    getProject(user.id, projectId),
    listProjects(user.id),
    listTasks(user.id, projectId),
    listComponents(user.id, projectId),
    listExpenses(user.id, projectId)
  ]);

  if (!project) notFound();

  const grouped = groupTasksByStatus(taskRows);
  const { datedTasks, rangeStart, rangeEnd } = buildGanttTasks(taskRows);
  const dateCells = buildDateCells(rangeStart, rangeEnd);
  const dayGridStyle = { gridTemplateColumns: `repeat(${dateCells.length}, minmax(3.5rem, 1fr))` };

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

            <div className="flex flex-wrap gap-2">
              <ButtonLink href={`/projects/${project.id}/tasks/new`}>New task</ButtonLink>
              <ButtonLink href={`/projects/${project.id}/expenses`} tone="secondary">
                Expenses
              </ButtonLink>
              <ButtonLink href={`/projects/${project.id}/conversations`} tone="secondary">
                Conversations
              </ButtonLink>
              <ButtonLink href={`/projects/${project.id}/components`} tone="secondary">
                Components
              </ButtonLink>
              <ButtonLink href="/backup" tone="secondary">
                Backup
              </ButtonLink>
              <ButtonLink href={`/projects/${project.id}/edit`} tone="secondary">
                Edit
              </ButtonLink>
              <a className="inline-flex h-10 items-center px-2 text-sm font-medium text-ink/60 hover:text-ink" href="/logout">
                Logout
              </a>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-moss">Planning dashboard</p>
              <h1 className="mt-1 text-3xl font-bold">{project.name}</h1>
              {project.description ? <p className="mt-2 max-w-3xl text-sm text-ink/65">{project.description}</p> : null}
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Tasks" value={taskRows.length} />
            <Metric label="Components" value={componentRows.length} />
            <Metric label="Expenses" value={expenseRows.length} />
            <Metric
              label="Expensing"
              value={Math.round(expenseRows.reduce((sum, expense) => sum + expensingAmount(expense), 0))}
              suffix="USD"
            />
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
        <>
          <section className="mb-4 rounded-lg border border-ink/10 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Task flow</h2>
                <p className="mt-1 text-sm text-ink/60">Included, complete, and later tasks with start and end dates.</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold text-ink/65">
                <span className="rounded-full border border-green-200 bg-green-100 px-2 py-1">Completed</span>
                <span className="rounded-full border border-sky-200 bg-sky-100 px-2 py-1">Included</span>
                <span className="rounded-full border border-yellow-200 bg-yellow-100 px-2 py-1">Later</span>
              </div>
            </div>
            {datedTasks.length === 0 || !rangeStart || !rangeEnd ? (
              <p className="rounded-md bg-paper px-4 py-3 text-sm text-ink/60">
                Add start and end dates to included, complete, or later tasks to show them here.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[44rem]">
                  <div className="grid grid-cols-[12rem_1fr] gap-3 border-b border-ink/10 pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink/50">
                    <span>Task</span>
                    <div className="grid" style={dayGridStyle}>
                      {dateCells.map((day) => (
                        <span key={day.toISOString()} className="border-l border-ink/10 px-2 first:border-l-0">
                          {formatDate(day)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3">
                    {datedTasks.map((task) => {
                      const startDay = daysBetween(rangeStart, task.startAt);
                      const durationDays = daysBetween(task.startAt, task.endAt) + 1;
                      const gridColumn = `${startDay + 1} / span ${durationDays}`;

                      return (
                        <div key={task.id} className="grid grid-cols-[12rem_1fr] items-center gap-3">
                          <Link
                            href={`/projects/${project.id}/tasks/${task.id}`}
                            className="truncate text-sm font-medium hover:underline"
                          >
                            {task.name}
                          </Link>
                          <div className="grid h-9 rounded-md bg-paper" style={dayGridStyle}>
                            {dateCells.map((day) => (
                              <span key={day.toISOString()} className="row-start-1 border-l border-ink/10 first:border-l-0" />
                            ))}
                            <div
                              className={`z-10 row-start-1 my-2 rounded border ${ganttColors[task.status]}`}
                              style={{ gridColumn }}
                              title={`${task.name}: ${formatDate(task.startAt)} - ${formatDate(task.endAt)}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="grid gap-4 xl:grid-cols-5">
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
        </>
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
