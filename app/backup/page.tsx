import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listProjects } from "@/lib/data";
import { ButtonLink, EmptyState, inputClass, PageShell, SubmitButton } from "@/components/ui";

export default async function BackupPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireSession();
  const { error } = await searchParams;
  const projects = await listProjects(user.id);

  return (
    <PageShell>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-moss">Backup / restore</p>
          <h1 className="mt-1 text-3xl font-bold">Jankdrive backups</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink/65">
            Export projects as tar.gz archives and restore them as brand-new projects. Existing projects are left alone.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/" tone="secondary">
            Dashboard
          </ButtonLink>
          <a className="inline-flex h-10 items-center px-2 text-sm font-medium text-ink/60 hover:text-ink" href="/logout">
            Logout
          </a>
        </div>
      </header>

      {error ? (
        <p className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error === "missing-file" ? "Choose a backup archive before restoring." : "Could not restore that backup archive."}
        </p>
      ) : null}

      <section className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Export</h2>
          <p className="mt-1 text-sm text-ink/60">
            The all-project archive is just each project export in its own folder.
          </p>
          <div className="mt-4">
            <ButtonLink href="/backup/export">Export all projects</ButtonLink>
          </div>
        </div>

        <form action="/backup/import" method="post" encType="multipart/form-data" className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Restore</h2>
          <p className="mt-1 text-sm text-ink/60">
            Restores every project in the archive. If the archive has one project, the optional name below is used.
          </p>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium text-ink">
              <span>Backup archive</span>
              <input className={inputClass} type="file" name="backup" accept=".tar.gz,.tgz,application/gzip" required />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-ink">
              <span>New project name</span>
              <input className={inputClass} name="projectName" placeholder="Optional for single-project restore" />
            </label>
            <SubmitButton>Restore backup</SubmitButton>
          </div>
        </form>
      </section>

      {projects.length === 0 ? (
        <EmptyState title="No projects to export" body="Restore a backup or create a project first." />
      ) : (
        <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Project exports</h2>
              <p className="mt-1 text-sm text-ink/60">Export one project when you only need a smaller backup.</p>
            </div>
          </div>
          <div className="grid gap-2">
            {projects.map((project) => (
              <div key={project.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-paper px-4 py-3">
                <Link href={`/projects/${project.id}`} className="font-medium hover:underline">
                  {project.name}
                </Link>
                <ButtonLink href={`/projects/${project.id}/export`} tone="secondary">
                  Export
                </ButtonLink>
              </div>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}
