import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getExpenseArtifact } from "@/lib/data";

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function contentDisposition(fileName: string) {
  const fallback = fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "receipt";
  const encoded = encodeURIComponent(fileName);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export async function GET(
  _request: Request,
  {
    params
  }: {
    params: Promise<{ projectId: string; artifactId: string }>;
  }
) {
  const user = await requireSession();
  const { projectId, artifactId } = await params;
  const artifact = await getExpenseArtifact(user.id, projectId, artifactId);

  if (!artifact) notFound();
  if (!artifact.dataBase64 || !artifact.fileName || !artifact.contentType || artifact.byteSize === null) {
    notFound();
  }

  return new Response(base64ToBytes(artifact.dataBase64), {
    headers: {
      "Content-Disposition": contentDisposition(artifact.fileName),
      "Content-Length": artifact.byteSize.toString(),
      "Content-Type": artifact.contentType
    }
  });
}
