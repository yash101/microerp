import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { listProjects } from "@/lib/data";

export default async function ConversationsRedirectPage() {
  const user = await requireSession();
  const [project] = await listProjects(user.id);
  redirect(project ? `/projects/${project.id}/conversations` : "/");
}
