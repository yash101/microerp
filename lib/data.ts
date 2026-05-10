import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  components,
  expenseArtifacts,
  expenses,
  projects,
  taskComponents,
  tasks,
  type TaskStatus
} from "@/db/schema";
import { calculateTaskPriority } from "@/lib/priority";

export async function listProjects(userId: string) {
  return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(asc(projects.name));
}

export async function getProject(userId: string, projectId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.id, projectId)))
    .limit(1);
  return project ?? null;
}

export async function listComponents(userId: string, projectId: string) {
  const rows = await db
    .select()
    .from(components)
    .innerJoin(projects, eq(components.projectId, projects.id))
    .where(and(eq(projects.userId, userId), eq(components.projectId, projectId)))
    .orderBy(asc(components.name));

  return rows.map((row) => row.components);
}

export async function getComponent(userId: string, projectId: string, componentId: string) {
  const [component] = await db
    .select()
    .from(components)
    .innerJoin(projects, eq(components.projectId, projects.id))
    .where(and(eq(projects.userId, userId), eq(components.projectId, projectId), eq(components.id, componentId)))
    .limit(1);
  return component?.components ?? null;
}

export async function listTasks(userId: string, projectId: string) {
  const taskRows = await db
    .select()
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(eq(projects.userId, userId), eq(tasks.projectId, projectId)))
    .orderBy(desc(tasks.updatedAt));

  const componentRows = await db
    .select({
      taskId: taskComponents.taskId,
      componentId: components.id,
      componentName: components.name
    })
    .from(taskComponents)
    .innerJoin(components, eq(taskComponents.componentId, components.id))
    .innerJoin(projects, eq(components.projectId, projects.id))
    .where(and(eq(projects.userId, userId), eq(components.projectId, projectId)));

  return taskRows.map(({ tasks: task }) => {
    const priority = calculateTaskPriority(task);
    return {
      ...task,
      priority,
      components: componentRows
        .filter((component) => component.taskId === task.id)
        .map((component) => ({ id: component.componentId, name: component.componentName }))
    };
  });
}

export async function getTask(userId: string, projectId: string, taskId: string) {
  const [task] = await db
    .select()
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(eq(projects.userId, userId), eq(tasks.projectId, projectId), eq(tasks.id, taskId)))
    .limit(1);

  if (!task) return null;

  const assignedComponents = await db
    .select({
      id: components.id,
      name: components.name
    })
    .from(taskComponents)
    .innerJoin(components, eq(taskComponents.componentId, components.id))
    .innerJoin(projects, eq(components.projectId, projects.id))
    .where(and(eq(projects.userId, userId), eq(taskComponents.taskId, taskId), eq(components.projectId, projectId)))
    .orderBy(asc(components.name));

  return {
    ...task.tasks,
    priority: calculateTaskPriority(task.tasks),
    components: assignedComponents
  };
}

export async function listExpenses(userId: string, projectId: string) {
  const expenseRows = await db
    .select()
    .from(expenses)
    .innerJoin(projects, eq(expenses.projectId, projects.id))
    .where(and(eq(projects.userId, userId), eq(expenses.projectId, projectId)))
    .orderBy(desc(expenses.spentAt), desc(expenses.createdAt));

  const artifactRows = await db
    .select({
      id: expenseArtifacts.id,
      expenseId: expenseArtifacts.expenseId,
      fileName: expenseArtifacts.fileName,
      contentType: expenseArtifacts.contentType,
      byteSize: expenseArtifacts.byteSize,
      createdAt: expenseArtifacts.createdAt
    })
    .from(expenseArtifacts)
    .innerJoin(expenses, eq(expenseArtifacts.expenseId, expenses.id))
    .innerJoin(projects, eq(expenses.projectId, projects.id))
    .where(and(eq(projects.userId, userId), eq(expenses.projectId, projectId)))
    .orderBy(asc(expenseArtifacts.fileName));

  return expenseRows.map(({ expenses: expense }) => ({
    ...expense,
    artifacts: artifactRows.filter((artifact) => artifact.expenseId === expense.id)
  }));
}

export async function getExpense(userId: string, projectId: string, expenseId: string) {
  const [expense] = await db
    .select()
    .from(expenses)
    .innerJoin(projects, eq(expenses.projectId, projects.id))
    .where(and(eq(projects.userId, userId), eq(expenses.projectId, projectId), eq(expenses.id, expenseId)))
    .limit(1);

  if (!expense) return null;

  const artifacts = await db
    .select({
      id: expenseArtifacts.id,
      expenseId: expenseArtifacts.expenseId,
      fileName: expenseArtifacts.fileName,
      contentType: expenseArtifacts.contentType,
      byteSize: expenseArtifacts.byteSize,
      createdAt: expenseArtifacts.createdAt
    })
    .from(expenseArtifacts)
    .where(eq(expenseArtifacts.expenseId, expenseId))
    .orderBy(asc(expenseArtifacts.fileName));

  return {
    ...expense.expenses,
    artifacts
  };
}

export async function getExpenseArtifact(userId: string, projectId: string, artifactId: string) {
  const [artifact] = await db
    .select({
      id: expenseArtifacts.id,
      fileName: expenseArtifacts.fileName,
      contentType: expenseArtifacts.contentType,
      byteSize: expenseArtifacts.byteSize,
      dataBase64: expenseArtifacts.dataBase64
    })
    .from(expenseArtifacts)
    .innerJoin(expenses, eq(expenseArtifacts.expenseId, expenses.id))
    .innerJoin(projects, eq(expenses.projectId, projects.id))
    .where(and(eq(projects.userId, userId), eq(expenses.projectId, projectId), eq(expenseArtifacts.id, artifactId)))
    .limit(1);

  return artifact ?? null;
}

export function groupTasksByStatus<T extends { status: TaskStatus; priority: { priority: number } }>(
  taskRows: T[]
) {
  const grouped: Record<TaskStatus, T[]> = {
    candidate: [],
    included: [],
    complete: [],
    cut: [],
    later: []
  };

  for (const task of taskRows) {
    grouped[task.status].push(task);
  }

  for (const status of Object.keys(grouped) as TaskStatus[]) {
    grouped[status].sort((left, right) => right.priority.priority - left.priority.priority);
  }

  return grouped;
}
