import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getExpense, getProject } from "@/lib/data";
import { ExpenseForm } from "@/components/forms";
import { ButtonLink, PageShell } from "@/components/ui";

function formatBytes(value: number | null) {
  if (value === null) return "unknown size";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export default async function EditExpensePage({
  params
}: {
  params: Promise<{ projectId: string; expenseId: string }>;
}) {
  const user = await requireSession();
  const { projectId, expenseId } = await params;
  const [project, expense] = await Promise.all([
    getProject(user.id, projectId),
    getExpense(user.id, projectId, expenseId)
  ]);

  if (!project || !expense || expense.status !== "draft") notFound();

  return (
    <PageShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-moss">Expense</p>
          <h1 className="mt-1 text-3xl font-bold">Edit {expense.vendor}</h1>
        </div>
        <ButtonLink href={`/projects/${project.id}/expenses`} tone="secondary">
          Back
        </ButtonLink>
      </div>

      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
        <ExpenseForm projectId={project.id} expense={expense} />
      </section>

      <section className="mt-5 rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Attached artifacts</h2>
        {expense.artifacts.length === 0 ? (
          <p className="mt-2 text-sm text-ink/55">No receipts attached yet.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {expense.artifacts.map((artifact) => (
              <Link
                key={artifact.id}
                href={`/projects/${project.id}/expenses/artifacts/${artifact.id}`}
                className="rounded-md border border-ink/15 bg-paper px-3 py-2 text-sm font-medium hover:border-ink/30"
              >
                {artifact.fileName ?? "receipt"} / {formatBytes(artifact.byteSize)}
              </Link>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
