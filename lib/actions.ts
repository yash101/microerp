"use server";

import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  components,
  expenseArtifacts,
  expenses,
  expenseStatusEnum,
  projects,
  taskComponents,
  taskStatusEnum,
  tasks,
  type ExpenseStatus,
  type TaskStatus
} from "@/db/schema";
import {
  createSession,
  createUser,
  destroySession,
  requireSession,
  validateCredentials,
  validateSignupCode
} from "@/lib/auth";
import {
  authSchema,
  componentSchema,
  formString,
  parseExpenseForm,
  parseTaskForm,
  projectSchema
} from "@/lib/validation";

const maxArtifactBytes = 5 * 1024 * 1024;

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

async function getExpenseInProject(userId: string, projectId: string, expenseId: string) {
  const [expense] = await db
    .select({ id: expenses.id, status: expenses.status })
    .from(expenses)
    .innerJoin(projects, eq(expenses.projectId, projects.id))
    .where(and(eq(projects.userId, userId), eq(expenses.projectId, projectId), eq(expenses.id, expenseId)))
    .limit(1);

  if (!expense) {
    throw new Error("Expense not found in project.");
  }

  return expense;
}

async function assertExpenseInProject(userId: string, projectId: string, expenseId: string) {
  await getExpenseInProject(userId, projectId, expenseId);
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function expenseFiles(formData: FormData) {
  return formData
    .getAll("artifacts")
    .filter((value): value is File => value instanceof File && value.size > 0);
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

export async function createExpenseAction(projectId: string, formData: FormData) {
  const user = await requireSession();
  await assertProjectForUser(user.id, projectId);
  const input = parseExpenseForm(formData);
  const files = expenseFiles(formData);

  if (files.some((file) => file.size > maxArtifactBytes)) {
    throw new Error("Receipt files must be 5 MB or smaller.");
  }

  const [expense] = await db
    .insert(expenses)
    .values({
      projectId,
      vendor: input.vendor,
      recipient: input.recipient,
      category: input.category,
      amount: input.amount.toFixed(2),
      spentAt: input.spentAt,
      status: input.status,
      notes: input.notes
    })
    .returning({ id: expenses.id });

  if (files.length > 0) {
    const artifacts = await Promise.all(
      files.map(async (file) => ({
        expenseId: expense.id,
        fileName: file.name || "receipt",
        contentType: file.type || "application/octet-stream",
        byteSize: file.size,
        dataBase64: bytesToBase64(new Uint8Array(await file.arrayBuffer()))
      }))
    );
    await db.insert(expenseArtifacts).values(artifacts);
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/expenses`);
  redirect(`/projects/${projectId}/expenses`);
}

export async function updateExpenseAction(projectId: string, expenseId: string, formData: FormData) {
  const user = await requireSession();
  const expense = await getExpenseInProject(user.id, projectId, expenseId);
  if (expense.status !== "draft") {
    throw new Error("Only draft expenses can be edited.");
  }

  const input = parseExpenseForm(formData);
  const files = expenseFiles(formData);

  if (files.some((file) => file.size > maxArtifactBytes)) {
    throw new Error("Receipt files must be 5 MB or smaller.");
  }

  await db
    .update(expenses)
    .set({
      vendor: input.vendor,
      recipient: input.recipient,
      category: input.category,
      amount: input.amount.toFixed(2),
      spentAt: input.spentAt,
      status: input.status,
      notes: input.notes,
      updatedAt: new Date()
    })
    .where(and(eq(expenses.projectId, projectId), eq(expenses.id, expenseId)));

  if (files.length > 0) {
    const artifacts = await Promise.all(
      files.map(async (file) => ({
        expenseId,
        fileName: file.name || "receipt",
        contentType: file.type || "application/octet-stream",
        byteSize: file.size,
        dataBase64: bytesToBase64(new Uint8Array(await file.arrayBuffer()))
      }))
    );
    await db.insert(expenseArtifacts).values(artifacts);
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/expenses`);
  redirect(`/projects/${projectId}/expenses`);
}

export async function updateExpenseStatusFromFormAction(projectId: string, expenseId: string, formData: FormData) {
  const user = await requireSession();
  const expense = await getExpenseInProject(user.id, projectId, expenseId);
  const status = formString(formData, "status") as ExpenseStatus;
  if (!expenseStatusEnum.enumValues.includes(status)) {
    throw new Error("Invalid expense status.");
  }
  const allowedStatuses: Record<ExpenseStatus, ExpenseStatus[]> = {
    draft: ["submitted"],
    submitted: ["draft", "approved", "rejected"],
    approved: ["draft", "reimbursed"],
    reimbursed: [],
    rejected: ["draft", "reimbursed"]
  };

  if (!allowedStatuses[expense.status].includes(status)) {
    throw new Error("Invalid expense status transition.");
  }

  if (status === "submitted") {
    const [completeExpense] = await db
      .select({
        vendor: expenses.vendor,
        recipient: expenses.recipient,
        category: expenses.category,
        amount: expenses.amount,
        spentAt: expenses.spentAt
      })
      .from(expenses)
      .where(and(eq(expenses.projectId, projectId), eq(expenses.id, expenseId)))
      .limit(1);

    if (
      !completeExpense ||
      !completeExpense.vendor.trim() ||
      !completeExpense.recipient.trim() ||
      !completeExpense.category.trim() ||
      Number.parseFloat(completeExpense.amount) <= 0 ||
      !completeExpense.spentAt
    ) {
      throw new Error("Fill out vendor, recipient, category, amount, and spent date before submitting.");
    }
  }

  await db
    .update(expenses)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(expenses.projectId, projectId), eq(expenses.id, expenseId)));
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/expenses`);
}

export async function deleteExpenseAction(projectId: string, expenseId: string) {
  const user = await requireSession();
  await assertExpenseInProject(user.id, projectId, expenseId);
  await db.delete(expenses).where(and(eq(expenses.projectId, projectId), eq(expenses.id, expenseId)));
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/expenses`);
  redirect(`/projects/${projectId}/expenses`);
}
