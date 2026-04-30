import { redirect } from "next/navigation";
import { loginAction } from "@/lib/actions";
import { hasSession } from "@/lib/auth";
import { Field, inputClass, SubmitButton } from "@/components/ui";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await hasSession()) {
    redirect("/");
  }

  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-sm rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-moss">Micro ERP</p>
          <h1 className="mt-2 text-2xl font-bold">Sign in</h1>
          <p className="mt-2 text-sm text-ink/60">Use the configured planning workspace credentials.</p>
        </div>
        {params.error ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            The username or password did not match the configured values.
          </p>
        ) : null}
        <form action={loginAction} className="mt-6 grid gap-4">
          <Field label="Username">
            <input className={inputClass} name="username" required autoComplete="username" />
          </Field>
          <Field label="Password">
            <input
              className={inputClass}
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </Field>
          <SubmitButton>Sign in</SubmitButton>
        </form>
      </section>
    </main>
  );
}
