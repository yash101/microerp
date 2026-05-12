import { redirect } from "next/navigation";
import Link from "next/link";
import { loginAction } from "@/lib/actions";
import { hasSession } from "@/lib/auth";
import { Field, inputClass, SubmitButton } from "@/components/ui";
import Image from "next/image";

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
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <section className="w-full max-w-sm rounded-lg">
        <div className="">
          <Image src={"/images/jankdrive.png"} alt={"jankdrive"} width={400} height={400} />
        </div>
      </section>
      <section className="w-full max-w-sm rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-moss">jankdrive</p>
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
        <p className="mt-5 text-center text-sm text-ink/60">
          Need access?{" "}
          <Link className="font-semibold text-ink hover:underline" href="/signup">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}
