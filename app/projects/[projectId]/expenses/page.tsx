import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getProject, listExpenses } from "@/lib/data";
import { deleteExpenseAction, updateExpenseStatusFromFormAction } from "@/lib/actions";
import type { ExpenseStatus } from "@/db/schema";
import { ExpenseForm } from "@/components/forms";
import { ButtonLink, EmptyState, PageShell, SubmitButton } from "@/components/ui";

const statusLabels: Record<ExpenseStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  reimbursed: "Reimbursed",
  rejected: "Rejected"
};

const actionLabels: Record<ExpenseStatus, string> = {
  draft: "Convert to Draft",
  submitted: "Submit",
  approved: "Approve",
  reimbursed: "Reimburse",
  rejected: "Reject"
};

const statuses = Object.keys(statusLabels) as ExpenseStatus[];

const nextStatuses: Record<ExpenseStatus, ExpenseStatus[]> = {
  draft: ["submitted"],
  submitted: ["draft", "approved", "rejected"],
  approved: ["draft", "reimbursed"],
  reimbursed: [],
  rejected: ["draft", "reimbursed"]
};

function amountValue(amount: string) {
  return Number.parseFloat(amount);
}

function formatCurrency(amount: string | number) {
  const value = typeof amount === "number" ? amount : amountValue(amount);
  return new Intl.NumberFormat("en", { style: "currency", currency: "USD" }).format(value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(value);
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function statusButtonClass(status: ExpenseStatus, currentStatus: ExpenseStatus) {
  if (status === currentStatus) {
    return "inline-flex h-10 items-center justify-center rounded-md bg-ink px-3 text-sm font-semibold text-white";
  }
  if (status === "rejected") {
    return "inline-flex h-10 items-center justify-center rounded-md bg-red-700 px-3 text-sm font-semibold text-white transition hover:bg-red-800";
  }
  return "inline-flex h-10 items-center justify-center rounded-md border border-ink/15 bg-white px-3 text-sm font-semibold text-ink transition hover:border-ink/30";
}

export default async function ExpensesPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireSession();
  const { projectId } = await params;
  const [project, expenses] = await Promise.all([
    getProject(user.id, projectId),
    listExpenses(user.id, projectId)
  ]);

  if (!project) notFound();

  const total = expenses.reduce((sum, expense) => sum + amountValue(expense.amount), 0);
  const reimbursed = expenses
    .filter((expense) => expense.status === "reimbursed")
    .reduce((sum, expense) => sum + amountValue(expense.amount), 0);
  const open = total - reimbursed;

  return (
    <PageShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-moss">Expenses</p>
          <h1 className="mt-1 text-3xl font-bold">{project.name}</h1>
        </div>
        <ButtonLink href={`/projects/${project.id}`} tone="secondary">
          Back
        </ButtonLink>
      </div>

      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Total tracked" value={formatCurrency(total)} />
        <Metric label="Open balance" value={formatCurrency(open)} />
        <Metric label="Receipts" value={expenses.reduce((sum, expense) => sum + expense.artifacts.length, 0).toString()} />
      </section>

      <section className="mb-5 rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="font-semibold">Add expense</h2>
          <p className="mt-1 text-sm text-ink/60">Track spend, reimbursement state, and receipt artifacts for this project.</p>
        </div>
        <ExpenseForm projectId={project.id} />
      </section>

      {expenses.length === 0 ? (
        <EmptyState
          title="No expenses yet"
          body="Add expenses as they happen and attach receipts so the project record stays complete."
        />
      ) : (
        <section className="rounded-lg border border-ink/10 bg-white shadow-sm">
          <div className="grid gap-3 border-b border-ink/10 p-4 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="font-semibold">Expense register</h2>
              <p className="mt-1 text-sm text-ink/60">Submitted, approved, reimbursed, and rejected project expenses.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-ink/65">
              {statuses.map((status) => (
                <span key={status} className="rounded-full bg-paper px-2 py-1">
                  {statusLabels[status]} {expenses.filter((expense) => expense.status === status).length}
                </span>
              ))}
            </div>
          </div>

          <div className="divide-y divide-ink/10">
            {expenses.map((expense) => (
              <article key={expense.id} className="grid gap-4 p-4 xl:grid-cols-[1fr_18rem]">
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      {expense.status === "draft" ? (
                        <Link
                          href={`/projects/${project.id}/expenses/${expense.id}/edit`}
                          className="inline-flex items-center gap-2 text-lg font-semibold underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
                        >
                          <span aria-hidden="true">✎</span>
                          {expense.vendor}
                        </Link>
                      ) : (
                        <h3 className="text-lg font-semibold">{expense.vendor}</h3>
                      )}
                      <p className="mt-1 text-sm text-ink/60">
                        {expense.recipient} / {expense.category} / {formatDate(expense.spentAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">{formatCurrency(expense.amount)}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink/50">
                        {statusLabels[expense.status]}
                      </p>
                    </div>
                  </div>

                  {expense.notes ? <p className="mt-3 whitespace-pre-wrap text-sm text-ink/70">{expense.notes}</p> : null}

                  <div className="mt-4">
                    <h4 className="text-sm font-semibold">Artifacts</h4>
                    {expense.artifacts.length === 0 ? (
                      <p className="mt-2 text-sm text-ink/55">No receipts attached.</p>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {expense.artifacts.map((artifact) => (
                          <Link
                            key={artifact.id}
                            href={`/projects/${project.id}/expenses/artifacts/${artifact.id}`}
                            className="rounded-md border border-ink/15 bg-paper px-3 py-2 text-sm font-medium hover:border-ink/30"
                          >
                            {artifact.fileName} / {formatBytes(artifact.byteSize)}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {expense.status === "reimbursed" ? null : (
                  <div className="grid content-start gap-3">
                    <form action={updateExpenseStatusFromFormAction.bind(null, project.id, expense.id)}>
                      <div className="grid grid-cols-2 gap-2">
                        {/* <span className={statusButtonClass(expense.status, expense.status)}>
                          {statusLabels[expense.status]}
                        </span> */}
                        {nextStatuses[expense.status].map((status) => (
                          <button
                            key={status}
                            className={statusButtonClass(status, expense.status)}
                            name="status"
                            value={status}
                          >
                            {actionLabels[status]}
                          </button>
                        ))}
                        <form action={deleteExpenseAction.bind(null, project.id, expense.id)}>
                          <SubmitButton tone="danger" className="w-full">
                            Delete expense
                          </SubmitButton>
                        </form>
                      </div>
                    </form>
                    <div>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white px-4 py-3 shadow-sm ring-1 ring-ink/10">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/50">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
