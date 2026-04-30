import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { components, projects, taskComponents, tasks, type TaskStatus } from "@/db/schema";
import { calculateTaskPriority } from "@/lib/priority";

export async function listProjects() {
  return db.select().from(projects).orderBy(asc(projects.name));
}

export async function getProject(projectId: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  return project ?? null;
}

export async function listComponents(projectId: string) {
  return db
    .select()
    .from(components)
    .where(eq(components.projectId, projectId))
    .orderBy(asc(components.name));
}

export async function getComponent(projectId: string, componentId: string) {
  const [component] = await db
    .select()
    .from(components)
    .where(and(eq(components.projectId, projectId), eq(components.id, componentId)))
    .limit(1);
  return component ?? null;
}

export async function listTasks(projectId: string) {
  const taskRows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .orderBy(desc(tasks.updatedAt));

  const componentRows = await db
    .select({
      taskId: taskComponents.taskId,
      componentId: components.id,
      componentName: components.name
    })
    .from(taskComponents)
    .innerJoin(components, eq(taskComponents.componentId, components.id))
    .where(eq(components.projectId, projectId));

  return taskRows.map((task) => {
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

export async function getTask(projectId: string, taskId: string) {
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.id, taskId)))
    .limit(1);

  if (!task) return null;

  const assignedComponents = await db
    .select({
      id: components.id,
      name: components.name
    })
    .from(taskComponents)
    .innerJoin(components, eq(taskComponents.componentId, components.id))
    .where(and(eq(taskComponents.taskId, taskId), eq(components.projectId, projectId)))
    .orderBy(asc(components.name));

  return {
    ...task,
    priority: calculateTaskPriority(task),
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
