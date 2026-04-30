import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { clsx } from "clsx";

export function PageShell({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>;
}

export function ButtonLink({
  href,
  children,
  tone = "primary"
}: {
  href: string;
  children: ReactNode;
  tone?: "primary" | "secondary" | "danger";
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex h-10 items-center justify-center rounded-md px-3 text-sm font-semibold transition",
        tone === "primary" && "bg-ink text-white hover:bg-black",
        tone === "secondary" && "border border-ink/15 bg-white text-ink hover:border-ink/30",
        tone === "danger" && "bg-red-700 text-white hover:bg-red-800"
      )}
    >
      {children}
    </Link>
  );
}

export function SubmitButton({
  children,
  tone = "primary",
  ...props
}: ComponentPropsWithoutRef<"button"> & { tone?: "primary" | "secondary" | "danger" }) {
  return (
    <button
      {...props}
      className={clsx(
        "inline-flex h-10 items-center justify-center rounded-md px-3 text-sm font-semibold transition disabled:opacity-60",
        tone === "primary" && "bg-ink text-white hover:bg-black",
        tone === "secondary" && "border border-ink/15 bg-white text-ink hover:border-ink/30",
        tone === "danger" && "bg-red-700 text-white hover:bg-red-800",
        props.className
      )}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  hint
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-ink">
      <span>{label}</span>
      {children}
      {hint ? <span className="text-xs font-normal text-ink/55">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "min-h-10 w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/20";

export const textareaClass =
  "min-h-32 w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/20";

export function EmptyState({
  title,
  body,
  action
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-ink/20 bg-white/70 p-8 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-ink/65">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
