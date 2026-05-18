import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getConversationAttachment } from "@/lib/data";

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function contentDisposition(fileName: string, contentType: string) {
  const fallback = fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "attachment";
  const encoded = encodeURIComponent(fileName);
  const disposition = contentType.startsWith("image/") ? "inline" : "attachment";
  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export async function GET(
  _request: Request,
  {
    params
  }: {
    params: Promise<{ projectId: string; attachmentId: string }>;
  }
) {
  const user = await requireSession();
  const { projectId, attachmentId } = await params;
  const attachment = await getConversationAttachment(user.id, projectId, attachmentId);

  if (!attachment) notFound();

  if (attachment.kind === "link") {
    if (!attachment.url) notFound();
    redirect(attachment.url);
  }

  if (!attachment.dataBase64 || !attachment.fileName || !attachment.contentType || attachment.byteSize === null) {
    notFound();
  }

  return new Response(base64ToBytes(attachment.dataBase64), {
    headers: {
      "Content-Disposition": contentDisposition(attachment.fileName, attachment.contentType),
      "Content-Length": attachment.byteSize.toString(),
      "Content-Type": attachment.contentType
    }
  });
}
