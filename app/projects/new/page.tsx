import { requireSession } from "@/lib/auth";
import { ProjectForm } from "@/components/forms";
import { ButtonLink, PageShell } from "@/components/ui";

export default async function NewProjectPage() {
  await requireSession();

  return (
    <PageShell>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-moss">Project</p>
          <h1 className="mt-1 text-3xl font-bold">Create project</h1>
        </div>
        <ButtonLink href="/" tone="secondary">
          Back
        </ButtonLink>
      </div>
      <section className="max-w-2xl rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
        <ProjectForm />
      </section>
    </PageShell>
  );
}
