import { requireSession } from "@/lib/auth";
import { createProjectExportArchive } from "@/lib/backup";

export async function GET(
  _request: Request,
  {
    params
  }: {
    params: Promise<{ projectId: string }>;
  }
) {
  const user = await requireSession();
  const { projectId } = await params;
  const archive = await createProjectExportArchive(user.id, projectId);

  return new Response(archive.bytes, {
    headers: {
      "Content-Disposition": archive.contentDisposition,
      "Content-Length": archive.bytes.byteLength.toString(),
      "Content-Type": "application/gzip"
    }
  });
}
