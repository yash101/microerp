"use server";

import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { components, projects, taskComponents, taskStatusEnum, tasks, type TaskStatus } from "@/db/schema";
import {
  createSession,
  createUser,
  destroySession,
  requireSession,
  validateCredentials,
  validateSignupCode
} from "@/lib/auth";
import { authSchema, componentSchema, formString, parseTaskForm, projectSchema } from "@/lib/validation";

function dateOrNull(value: Date | null) {
  return value && !Number.isNaN(value.getTime()) ? value : null;
}

async function allowedComponentIds(userId: string, projectId: string, componentIds: string[]) {
  if (componentIds.length === 0) return [];

  const rows = await db
    .select({ id: components.id })
    .from(components)
    .innerJoin(projects, eq(components.projectId, projects.id))
    .where(
      and(
        eq(projects.userId, userId),
        eq(components.projectId, projectId),
        inArray(components.id, componentIds)
      )
    );

  return rows.map((row) => row.id);
}

async function assertProjectForUser(userId: string, projectId: string) {
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.id, projectId)))
    .limit(1);

  if (!project) {
    throw new Error("Project not found.");
  }
}

async function assertTaskInProject(userId: string, projectId: string, taskId: string) {
  const [task] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(eq(projects.userId, userId), eq(tasks.projectId, projectId), eq(tasks.id, taskId)))
    .limit(1);

  if (!task) {
    throw new Error("Task not found in project.");
  }
}

export async function loginAction(formData: FormData) {
  const input = authSchema.pick({ username: true, password: true }).parse({
    username: formString(formData, "username"),
    password: formString(formData, "password")
  });

  const user = await validateCredentials(input.username, input.password);
  if (!user) {
    redirect("/login?error=1");
  }

  await createSession(user.id);
  redirect("/");
}

export async function signupAction(formData: FormData) {
  const input = authSchema.parse({
    username: formString(formData, "username"),
    password: formString(formData, "password"),
    signupCode: formString(formData, "signupCode")
  });

  if (!input.signupCode || !validateSignupCode(input.signupCode)) {
    redirect("/signup?error=code");
  }

  try {
    const user = await createUser(input.username, input.password);
    await createSession(user.id);
  } catch {
    redirect("/signup?error=user");
  }

  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function createProjectAction(formData: FormData) {
  const user = await requireSession();
  const input = projectSchema.parse({
    name: formString(formData, "name"),
    description: formString(formData, "description")
  });
  const [project] = await db.insert(projects).values({ ...input, userId: user.id }).returning({ id: projects.id });
  revalidatePath("/");
  redirect(`/projects/${project.id}`);
}

export async function updateProjectAction(projectId: string, formData: FormData) {
  const user = await requireSession();
  await assertProjectForUser(user.id, projectId);
  const input = projectSchema.parse({
    name: formString(formData, "name"),
    description: formString(formData, "description")
  });
  await db
    .update(projects)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(projects.userId, user.id), eq(projects.id, projectId)));
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export async function deleteProjectAction(projectId: string) {
  const user = await requireSession();
  await assertProjectForUser(user.id, projectId);
  await db.delete(projects).where(and(eq(projects.userId, user.id), eq(projects.id, projectId)));
  revalidatePath("/");
  redirect("/");
}

export async function createComponentAction(projectId: string, formData: FormData) {
  const user = await requireSession();
  await assertProjectForUser(user.id, projectId);
  const input = componentSchema.parse({
    name: formString(formData, "name"),
    descriptionMarkdown: formString(formData, "descriptionMarkdown")
  });
  await db.insert(components).values({ ...input, projectId });
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}/components`);
}

export async function updateComponentAction(projectId: string, componentId: string, formData: FormData) {
  const user = await requireSession();
  await assertProjectForUser(user.id, projectId);
  const input = componentSchema.parse({
    name: formString(formData, "name"),
    descriptionMarkdown: formString(formData, "descriptionMarkdown")
  });
  await db
    .update(components)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(components.projectId, projectId), eq(components.id, componentId)));
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}/components`);
}

export async function deleteComponentAction(projectId: string, componentId: string) {
  const user = await requireSession();
  await assertProjectForUser(user.id, projectId);
  await db.delete(components).where(and(eq(components.projectId, projectId), eq(components.id, componentId)));
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}/components`);
}

export async function createTaskAction(projectId: string, formData: FormData) {
  const user = await requireSession();
  await assertProjectForUser(user.id, projectId);
  const input = parseTaskForm(formData);
  const componentIds = await allowedComponentIds(user.id, projectId, input.componentIds);
  const [task] = await db
    .insert(tasks)
    .values({
      projectId,
      name: input.name,
      descriptionMarkdown: input.descriptionMarkdown,
      estimatedMinutes: input.estimatedMinutes,
      startAt: dateOrNull(input.startAt),
      endAt: dateOrNull(input.endAt),
      complexity: input.complexity,
      risk: input.risk,
      impact: input.impact,
      differentiation: input.differentiation,
      priorityOffset: input.priorityOffset.toFixed(2),
      status: input.status
    })
    .returning({ id: tasks.id });

  if (componentIds.length > 0) {
    await db
      .insert(taskComponents)
      .values(componentIds.map((componentId) => ({ taskId: task.id, componentId })));
  }

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}/tasks/${task.id}`);
}

export async function updateTaskAction(projectId: string, taskId: string, formData: FormData) {
  const user = await requireSession();
  await assertTaskInProject(user.id, projectId, taskId);
  const input = parseTaskForm(formData);
  const componentIds = await allowedComponentIds(user.id, projectId, input.componentIds);
  await db
    .update(tasks)
    .set({
      name: input.name,
      descriptionMarkdown: input.descriptionMarkdown,
      estimatedMinutes: input.estimatedMinutes,
      startAt: dateOrNull(input.startAt),
      endAt: dateOrNull(input.endAt),
      complexity: input.complexity,
      risk: input.risk,
      impact: input.impact,
      differentiation: input.differentiation,
      priorityOffset: input.priorityOffset.toFixed(2),
      status: input.status,
      updatedAt: new Date()
    })
    .where(and(eq(tasks.projectId, projectId), eq(tasks.id, taskId)));

  await db.delete(taskComponents).where(eq(taskComponents.taskId, taskId));
  if (componentIds.length > 0) {
    await db
      .insert(taskComponents)
      .values(componentIds.map((componentId) => ({ taskId, componentId })));
  }

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}/tasks/${taskId}`);
}

export async function updateTaskStatusAction(projectId: string, taskId: string, status: TaskStatus) {
  const user = await requireSession();
  await assertTaskInProject(user.id, projectId, taskId);
  await db
    .update(tasks)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(tasks.projectId, projectId), eq(tasks.id, taskId)));
  revalidatePath(`/projects/${projectId}`);
}

export async function updateTaskStatusFromFormAction(projectId: string, taskId: string, formData: FormData) {
  const status = formString(formData, "status") as TaskStatus;
  if (!taskStatusEnum.enumValues.includes(status)) {
    throw new Error("Invalid task status.");
  }
  await updateTaskStatusAction(projectId, taskId, status);
}

export async function deleteTaskAction(projectId: string, taskId: string) {
  const user = await requireSession();
  await assertTaskInProject(user.id, projectId, taskId);
  await db.delete(tasks).where(and(eq(tasks.projectId, projectId), eq(tasks.id, taskId)));
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}
