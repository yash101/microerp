import Link from "next/link";
import ReactMarkdown from "react-markdown";
import type { ReactNode } from "react";
import type { ConversationAttachment } from "@/db/schema";

export type TimelineMessage = {
  id: string;
  customerId: string;
  title: string;
  shortDescription: string;
  bodyMarkdown: string;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    id: string;
    name: string;
  };
  people: {
    id: string;
    name: string;
  }[];
  attachments: Pick<
    ConversationAttachment,
    "id" | "messageId" | "kind" | "label" | "url" | "fileName" | "contentType" | "byteSize" | "createdAt"
  >[];
};

function formatDateTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function formatBytes(value: number | null) {
  if (!value) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function attachmentHref(projectId: string, attachment: Pick<ConversationAttachment, "id" | "kind" | "url">) {
  return attachment.kind === "link" ? attachment.url ?? "#" : `/projects/${projectId}/conversations/attachments/${attachment.id}`;
}

export function ConversationTimeline({
  projectId,
  messages,
  emptyState,
  showCustomer = true
}: {
  projectId: string;
  messages: TimelineMessage[];
  emptyState: ReactNode;
  showCustomer?: boolean;
}) {
  if (messages.length === 0) return <>{emptyState}</>;

  return (
    <div className="relative grid gap-4 before:absolute before:bottom-0 before:left-4 before:top-0 before:w-px before:bg-ink/10">
      {messages.map((message) => (
        <article key={message.id} className="relative grid gap-3 pl-10">
          <span className="absolute left-[0.55rem] top-3 h-4 w-4 rounded-full border-4 border-white bg-moss shadow-sm ring-1 ring-moss/30" />
          <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/50">
                  {formatDateTime(message.createdAt)}
                </p>
                <h3 className="mt-1 text-lg font-semibold">
                  <Link
                    className="underline decoration-ink/20 underline-offset-4 hover:decoration-ink"
                    href={`/projects/${projectId}/conversations/customers/${message.customerId}/messages/${message.id}/edit`}
                  >
                    {message.title}
                  </Link>
                </h3>
                {showCustomer ? (
                  <Link
                    className="mt-1 inline-flex text-sm font-medium text-moss hover:underline"
                    href={`/projects/${projectId}/conversations/customers/${message.customer.id}`}
                  >
                    {message.customer.name}
                  </Link>
                ) : null}
              </div>
              <div className="text-left text-xs text-ink/55 sm:text-right">
                <p>Updated {formatDateTime(message.updatedAt)}</p>
              </div>
            </div>

            {message.shortDescription ? (
              <p className="mt-3 text-sm leading-6 text-ink/70">{message.shortDescription}</p>
            ) : null}

            {message.people.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {message.people.map((person) => (
                  <span key={person.id} className="rounded-full bg-paper px-2.5 py-1 text-xs font-semibold text-ink/70">
                    {person.name}
                  </span>
                ))}
              </div>
            ) : null}

            {message.attachments.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {message.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachmentHref(projectId, attachment)}
                    className="rounded-md border border-ink/15 bg-paper px-3 py-2 text-sm font-medium hover:border-ink/30"
                    target={attachment.kind === "link" ? "_blank" : undefined}
                    rel={attachment.kind === "link" ? "noreferrer" : undefined}
                  >
                    {attachment.label}
                    {attachment.kind === "upload" && attachment.byteSize ? (
                      <span className="ml-1 text-xs text-ink/50">{formatBytes(attachment.byteSize)}</span>
                    ) : null}
                  </a>
                ))}
              </div>
            ) : null}

            {message.bodyMarkdown ? (
              <div className="markdown mt-4 border-t border-ink/10 pt-4 text-sm text-ink/75">
                <ReactMarkdown>{message.bodyMarkdown}</ReactMarkdown>
              </div>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
