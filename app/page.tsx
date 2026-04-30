import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { listProjects } from "@/lib/data";
import { ButtonLink, EmptyState, PageShell } from "@/components/ui";

export default async function HomePage() {
  await requireSession();
  const projects = await listProjects();

  if (projects[0]) {
    redirect(`/projects/${projects[0].id}`);
  }

  return (
    <PageShell>
      <Header />
      <EmptyState
        title="No projects yet"
        body="Create your first project to start planning tasks by value, cost, and priority."
        action={<ButtonLink href="/projects/new">Create project</ButtonLink>}
      />
    </PageShell>
  );
}

function Header() {
  return (
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-moss">Micro ERP</p>
        <h1 className="mt-1 text-3xl font-bold">Planning dashboard</h1>
      </div>
      <a className="text-sm font-medium text-ink/65 hover:text-ink" href="/logout">
        Logout
      </a>
    </header>
  );
}
