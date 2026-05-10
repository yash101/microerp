import Link from "next/link";
import { redirect } from "next/navigation";
import { signupAction } from "@/lib/actions";
import { hasSession } from "@/lib/auth";
import { Field, inputClass, SubmitButton } from "@/components/ui";

export default async function SignupPage({
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
          <h1 className="mt-2 text-2xl font-bold">Create account</h1>
          <p className="mt-2 text-sm text-ink/60">Signup requires the configured access code.</p>
        </div>
        {params.error ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {params.error === "code"
              ? "The signup code did not match."
              : "That username is already in use or the form was invalid."}
          </p>
        ) : null}
        <form action={signupAction} className="mt-6 grid gap-4">
          <Field label="Username">
            <input className={inputClass} name="username" required autoComplete="username" />
          </Field>
          <Field label="Password" hint="Use at least 12 characters.">
            <input
              className={inputClass}
              name="password"
              type="password"
              minLength={12}
              required
              autoComplete="new-password"
            />
          </Field>
          <Field label="Signup code">
            <input className={inputClass} name="signupCode" type="password" required autoComplete="off" />
          </Field>
          <SubmitButton>Create account</SubmitButton>
        </form>
        <p className="mt-5 text-center text-sm text-ink/60">
          Already have an account?{" "}
          <Link className="font-semibold text-ink hover:underline" href="/login">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
