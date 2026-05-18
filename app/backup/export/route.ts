import { requireSession } from "@/lib/auth";
import { createUserExportArchive } from "@/lib/backup";

export async function GET() {
  const user = await requireSession();
  const archive = await createUserExportArchive(user.id);

  return new Response(archive.bytes, {
    headers: {
      "Content-Disposition": archive.contentDisposition,
      "Content-Length": archive.bytes.byteLength.toString(),
      "Content-Type": "application/gzip"
    }
  });
}
