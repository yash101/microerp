import "server-only";

import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  conversationAttachments,
  conversationMessagePeople,
  conversationMessages,
  conversationPeople,
  components,
  customers,
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

function searchPattern(query: string) {
  const trimmed = query.trim();
  return trimmed ? `%${trimmed}%` : "";
}

function dateOrNull(value: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function timestampMs(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

export async function listConversationCustomers(userId: string, projectId: string, query = "") {
  const pattern = searchPattern(query);
  const where = pattern
    ? and(
        eq(projects.userId, userId),
        eq(customers.projectId, projectId),
        or(ilike(customers.name, pattern), ilike(customers.descriptionMarkdown, pattern))
      )
    : and(eq(projects.userId, userId), eq(customers.projectId, projectId));

  const rows = await db
    .select({
      id: customers.id,
      projectId: customers.projectId,
      name: customers.name,
      descriptionMarkdown: customers.descriptionMarkdown,
      createdAt: customers.createdAt,
      updatedAt: customers.updatedAt,
      firstContactAt: sql<Date | null>`min(${conversationMessages.createdAt})`
    })
    .from(customers)
    .innerJoin(projects, eq(customers.projectId, projects.id))
    .leftJoin(conversationMessages, eq(conversationMessages.customerId, customers.id))
    .where(where)
    .groupBy(
      customers.id,
      customers.projectId,
      customers.name,
      customers.descriptionMarkdown,
      customers.createdAt,
      customers.updatedAt
    )
    .orderBy(asc(customers.name))
    .limit(50);

  return rows.map((customer) => ({
    ...customer,
    firstContactAt: dateOrNull(customer.firstContactAt)
  }));
}

async function hydrateConversationMessages<
  T extends {
    id: string;
    customerId: string;
  }
>(messages: T[]) {
  if (messages.length === 0) return [];

  const messageIds = messages.map((message) => message.id);
  const participantRows = await db
    .select({
      messageId: conversationMessagePeople.messageId,
      id: conversationPeople.id,
      name: conversationPeople.name
    })
    .from(conversationMessagePeople)
    .innerJoin(conversationPeople, eq(conversationMessagePeople.personId, conversationPeople.id))
    .where(inArray(conversationMessagePeople.messageId, messageIds))
    .orderBy(asc(conversationPeople.name));

  const attachmentRows = await db
    .select({
      id: conversationAttachments.id,
      messageId: conversationAttachments.messageId,
      kind: conversationAttachments.kind,
      label: conversationAttachments.label,
      url: conversationAttachments.url,
      fileName: conversationAttachments.fileName,
      contentType: conversationAttachments.contentType,
      byteSize: conversationAttachments.byteSize,
      createdAt: conversationAttachments.createdAt
    })
    .from(conversationAttachments)
    .where(inArray(conversationAttachments.messageId, messageIds))
    .orderBy(asc(conversationAttachments.label));

  return messages.map((message) => ({
    ...message,
    people: participantRows
      .filter((person) => person.messageId === message.id)
      .map((person) => ({ id: person.id, name: person.name })),
    attachments: attachmentRows.filter((attachment) => attachment.messageId === message.id)
  }));
}

export async function listConversationTimeline(userId: string, projectId: string, query = "") {
  const pattern = searchPattern(query);
  const where = pattern
    ? and(
        eq(projects.userId, userId),
        eq(customers.projectId, projectId),
        or(
          ilike(customers.name, pattern),
          ilike(conversationMessages.title, pattern),
          ilike(conversationMessages.shortDescription, pattern),
          ilike(conversationMessages.bodyMarkdown, pattern)
        )
      )
    : and(eq(projects.userId, userId), eq(customers.projectId, projectId));

  const rows = await db
    .select({
      id: conversationMessages.id,
      customerId: conversationMessages.customerId,
      title: conversationMessages.title,
      shortDescription: conversationMessages.shortDescription,
      bodyMarkdown: conversationMessages.bodyMarkdown,
      createdAt: conversationMessages.createdAt,
      updatedAt: conversationMessages.updatedAt,
      customer: {
        id: customers.id,
        name: customers.name
      }
    })
    .from(conversationMessages)
    .innerJoin(customers, eq(conversationMessages.customerId, customers.id))
    .innerJoin(projects, eq(customers.projectId, projects.id))
    .where(where)
    .orderBy(desc(conversationMessages.createdAt))
    .limit(50);

  return (await hydrateConversationMessages(rows)).sort((left, right) => timestampMs(left.createdAt) - timestampMs(right.createdAt));
}

export async function getCustomerWithConversations(userId: string, projectId: string, customerId: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .innerJoin(projects, eq(customers.projectId, projects.id))
    .where(and(eq(projects.userId, userId), eq(customers.projectId, projectId), eq(customers.id, customerId)))
    .limit(1);

  if (!customer) return null;

  const rows = await db
    .select({
      id: conversationMessages.id,
      customerId: conversationMessages.customerId,
      title: conversationMessages.title,
      shortDescription: conversationMessages.shortDescription,
      bodyMarkdown: conversationMessages.bodyMarkdown,
      createdAt: conversationMessages.createdAt,
      updatedAt: conversationMessages.updatedAt,
      customer: {
        id: customers.id,
        name: customers.name
      }
    })
    .from(conversationMessages)
    .innerJoin(customers, eq(conversationMessages.customerId, customers.id))
    .innerJoin(projects, eq(customers.projectId, projects.id))
    .where(and(eq(projects.userId, userId), eq(customers.projectId, projectId), eq(conversationMessages.customerId, customerId)))
    .orderBy(asc(conversationMessages.createdAt));

  const messages = await hydrateConversationMessages(rows);

  return {
    ...customer.customers,
    firstContactAt: messages[0]?.createdAt ?? null,
    messages
  };
}

export async function getConversationMessage(userId: string, projectId: string, customerId: string, messageId: string) {
  const [message] = await db
    .select({
      id: conversationMessages.id,
      customerId: conversationMessages.customerId,
      title: conversationMessages.title,
      shortDescription: conversationMessages.shortDescription,
      bodyMarkdown: conversationMessages.bodyMarkdown,
      createdAt: conversationMessages.createdAt,
      updatedAt: conversationMessages.updatedAt,
      customer: {
        id: customers.id,
        name: customers.name
      }
    })
    .from(conversationMessages)
    .innerJoin(customers, eq(conversationMessages.customerId, customers.id))
    .innerJoin(projects, eq(customers.projectId, projects.id))
    .where(
      and(
        eq(projects.userId, userId),
        eq(customers.projectId, projectId),
        eq(conversationMessages.customerId, customerId),
        eq(conversationMessages.id, messageId)
      )
    )
    .limit(1);

  if (!message) return null;

  const [hydrated] = await hydrateConversationMessages([message]);
  return hydrated ?? null;
}

export async function getConversationAttachment(userId: string, projectId: string, attachmentId: string) {
  const [attachment] = await db
    .select({
      id: conversationAttachments.id,
      kind: conversationAttachments.kind,
      label: conversationAttachments.label,
      url: conversationAttachments.url,
      fileName: conversationAttachments.fileName,
      contentType: conversationAttachments.contentType,
      byteSize: conversationAttachments.byteSize,
      dataBase64: conversationAttachments.dataBase64
    })
    .from(conversationAttachments)
    .innerJoin(conversationMessages, eq(conversationAttachments.messageId, conversationMessages.id))
    .innerJoin(customers, eq(conversationMessages.customerId, customers.id))
    .innerJoin(projects, eq(customers.projectId, projects.id))
    .where(and(eq(projects.userId, userId), eq(customers.projectId, projectId), eq(conversationAttachments.id, attachmentId)))
    .limit(1);

  return attachment ?? null;
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
