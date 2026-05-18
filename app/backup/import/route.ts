import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { restoreProjectsFromArchive } from "@/lib/backup";

export async function POST(request: Request) {
  const user = await requireSession();
  const formData = await request.formData();
  const file = formData.get("backup");
  const projectName = formData.get("projectName");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.redirect(new URL("/backup?error=missing-file", request.url), 303);
  }

  try {
    const restoredProjects = await restoreProjectsFromArchive(
      user.id,
      new Uint8Array(await file.arrayBuffer()),
      typeof projectName === "string" ? projectName : null
    );
    const firstProject = restoredProjects[0];

    return NextResponse.redirect(new URL(firstProject ? `/projects/${firstProject.id}` : "/backup", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/backup?error=restore", request.url), 303);
  }
}
