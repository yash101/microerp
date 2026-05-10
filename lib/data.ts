import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { components, projects, taskComponents, tasks, type TaskStatus } from "@/db/schema";
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

export function groupTasksByStatus<T extends { status: TaskStatus; priority: { priority: number } }>(
  taskRows: T[]
) {
  const grouped: Record<TaskStatus, T[]> = {
    candidate: [],
    included: [],
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
