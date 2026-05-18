import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  attachments,
  components,
  conversationAttachments,
  conversationMessagePeople,
  conversationMessages,
  conversationPeople,
  customers,
  expenseArtifacts,
  expenses,
  projects,
  taskComponents,
  tasks,
  type AttachmentKind,
  type ExpenseStatus,
  type TaskStatus,
  type TaxTreatment
} from "@/db/schema";
import { createTar, gzipBytes, gunzipBytes, readTar, type TarEntry } from "@/lib/tar";

type BackupAttachment = {
  oldId: string;
  kind: AttachmentKind;
  label: string;
  url: string | null;
  fileName: string | null;
  contentType: string | null;
  byteSize: number | null;
  path: string | null;
  createdAt: string;
};

type ProjectBackup = {
  format: "jankdrive.project.v1";
  exportedAt: string;
  project: {
    oldId: string;
    name: string;
    description: string;
    createdAt: string;
    updatedAt: string;
  };
  components: Array<{
    oldId: string;
    name: string;
    descriptionMarkdown: string;
    createdAt: string;
    updatedAt: string;
  }>;
  tasks: Array<{
    oldId: string;
    name: string;
    descriptionMarkdown: string;
    estimatedMinutes: number;
    startAt: string | null;
    endAt: string | null;
    complexity: number;
    risk: number;
    impact: number;
    differentiation: number;
    priorityOffset: string;
    status: TaskStatus;
    createdAt: string;
    updatedAt: string;
  }>;
  taskComponents: Array<{ taskId: string; componentId: string }>;
  expenses: Array<{
    oldId: string;
    vendor: string;
    recipient: string;
    category: string;
    amount: string;
    businessUsePercentage: string;
    salesTaxPaid: string;
    taxTreatment: TaxTreatment;
    taxTreatmentOther: string;
    spentAt: string;
    status: ExpenseStatus;
    notes: string;
    createdAt: string;
    updatedAt: string;
  }>;
  expenseArtifacts: Array<{
    oldId: string;
    expenseId: string;
    attachmentId: string;
    createdAt: string;
  }>;
  customers: Array<{
    oldId: string;
    name: string;
    descriptionMarkdown: string;
    createdAt: string;
    updatedAt: string;
  }>;
  conversationPeople: Array<{
    oldId: string;
    name: string;
    normalizedName: string;
    createdAt: string;
    updatedAt: string;
  }>;
  conversationMessages: Array<{
    oldId: string;
    customerId: string;
    title: string;
    shortDescription: string;
    bodyMarkdown: string;
    createdAt: string;
    updatedAt: string;
  }>;
  conversationMessagePeople: Array<{ messageId: string; personId: string }>;
  conversationAttachments: Array<{
    oldId: string;
    messageId: string;
    attachmentId: string;
    createdAt: string;
  }>;
  attachments: BackupAttachment[];
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function iso(value: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function date(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function requiredDate(value: string) {
  return date(value) ?? new Date();
}

function safeName(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "project"
  );
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function contentDisposition(fileName: string) {
  const fallback = fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "jankdrive-backup.tar.gz";
  const encoded = encodeURIComponent(fileName);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

async function selectAttachments(attachmentIds: string[]) {
  if (attachmentIds.length === 0) return [];
  return db.select().from(attachments).where(inArray(attachments.id, unique(attachmentIds))).orderBy(asc(attachments.createdAt));
}

async function buildProjectBackup(userId: string, projectId: string, folderName: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.id, projectId)))
    .limit(1);

  if (!project) {
    throw new Error("Project not found.");
  }

  const [
    componentRows,
    taskRows,
    taskComponentRows,
    expenseRows,
    expenseArtifactRows,
    customerRows,
    personRows,
    messageRows,
    messagePeopleRows,
    conversationAttachmentRows
  ] = await Promise.all([
    db.select().from(components).where(eq(components.projectId, projectId)).orderBy(asc(components.createdAt)),
    db.select().from(tasks).where(eq(tasks.projectId, projectId)).orderBy(asc(tasks.createdAt)),
    db
      .select({ taskId: taskComponents.taskId, componentId: taskComponents.componentId })
      .from(taskComponents)
      .innerJoin(tasks, eq(taskComponents.taskId, tasks.id))
      .where(eq(tasks.projectId, projectId)),
    db.select().from(expenses).where(eq(expenses.projectId, projectId)).orderBy(asc(expenses.createdAt)),
    db
      .select({
        oldId: expenseArtifacts.id,
        expenseId: expenseArtifacts.expenseId,
        attachmentId: expenseArtifacts.attachmentId,
        createdAt: expenseArtifacts.createdAt
      })
      .from(expenseArtifacts)
      .innerJoin(expenses, eq(expenseArtifacts.expenseId, expenses.id))
      .where(eq(expenses.projectId, projectId)),
    db.select().from(customers).where(eq(customers.projectId, projectId)).orderBy(asc(customers.createdAt)),
    db.select().from(conversationPeople).where(eq(conversationPeople.projectId, projectId)).orderBy(asc(conversationPeople.createdAt)),
    db
      .select({
        oldId: conversationMessages.id,
        customerId: conversationMessages.customerId,
        title: conversationMessages.title,
        shortDescription: conversationMessages.shortDescription,
        bodyMarkdown: conversationMessages.bodyMarkdown,
        createdAt: conversationMessages.createdAt,
        updatedAt: conversationMessages.updatedAt
      })
      .from(conversationMessages)
      .innerJoin(customers, eq(conversationMessages.customerId, customers.id))
      .where(eq(customers.projectId, projectId))
      .orderBy(asc(conversationMessages.createdAt)),
    db
      .select({ messageId: conversationMessagePeople.messageId, personId: conversationMessagePeople.personId })
      .from(conversationMessagePeople)
      .innerJoin(conversationMessages, eq(conversationMessagePeople.messageId, conversationMessages.id))
      .innerJoin(customers, eq(conversationMessages.customerId, customers.id))
      .where(eq(customers.projectId, projectId)),
    db
      .select({
        oldId: conversationAttachments.id,
        messageId: conversationAttachments.messageId,
        attachmentId: conversationAttachments.attachmentId,
        createdAt: conversationAttachments.createdAt
      })
      .from(conversationAttachments)
      .innerJoin(conversationMessages, eq(conversationAttachments.messageId, conversationMessages.id))
      .innerJoin(customers, eq(conversationMessages.customerId, customers.id))
      .where(eq(customers.projectId, projectId))
  ]);

  const attachmentRows = await selectAttachments([
    ...expenseArtifactRows.map((row) => row.attachmentId),
    ...conversationAttachmentRows.map((row) => row.attachmentId)
  ]);

  const entries: TarEntry[] = [];
  const backup: ProjectBackup = {
    format: "jankdrive.project.v1",
    exportedAt: new Date().toISOString(),
    project: {
      oldId: project.id,
      name: project.name,
      description: project.description,
      createdAt: iso(project.createdAt) ?? new Date().toISOString(),
      updatedAt: iso(project.updatedAt) ?? new Date().toISOString()
    },
    components: componentRows.map((component) => ({
      oldId: component.id,
      name: component.name,
      descriptionMarkdown: component.descriptionMarkdown,
      createdAt: iso(component.createdAt) ?? new Date().toISOString(),
      updatedAt: iso(component.updatedAt) ?? new Date().toISOString()
    })),
    tasks: taskRows.map((task) => ({
      oldId: task.id,
      name: task.name,
      descriptionMarkdown: task.descriptionMarkdown,
      estimatedMinutes: task.estimatedMinutes,
      startAt: iso(task.startAt),
      endAt: iso(task.endAt),
      complexity: task.complexity,
      risk: task.risk,
      impact: task.impact,
      differentiation: task.differentiation,
      priorityOffset: task.priorityOffset,
      status: task.status,
      createdAt: iso(task.createdAt) ?? new Date().toISOString(),
      updatedAt: iso(task.updatedAt) ?? new Date().toISOString()
    })),
    taskComponents: taskComponentRows,
    expenses: expenseRows.map((expense) => ({
      oldId: expense.id,
      vendor: expense.vendor,
      recipient: expense.recipient,
      category: expense.category,
      amount: expense.amount,
      businessUsePercentage: expense.businessUsePercentage,
      salesTaxPaid: expense.salesTaxPaid,
      taxTreatment: expense.taxTreatment,
      taxTreatmentOther: expense.taxTreatmentOther,
      spentAt: iso(expense.spentAt) ?? new Date().toISOString(),
      status: expense.status,
      notes: expense.notes,
      createdAt: iso(expense.createdAt) ?? new Date().toISOString(),
      updatedAt: iso(expense.updatedAt) ?? new Date().toISOString()
    })),
    expenseArtifacts: expenseArtifactRows.map((artifact) => ({
      ...artifact,
      createdAt: iso(artifact.createdAt) ?? new Date().toISOString()
    })),
    customers: customerRows.map((customer) => ({
      oldId: customer.id,
      name: customer.name,
      descriptionMarkdown: customer.descriptionMarkdown,
      createdAt: iso(customer.createdAt) ?? new Date().toISOString(),
      updatedAt: iso(customer.updatedAt) ?? new Date().toISOString()
    })),
    conversationPeople: personRows.map((person) => ({
      oldId: person.id,
      name: person.name,
      normalizedName: person.normalizedName,
      createdAt: iso(person.createdAt) ?? new Date().toISOString(),
      updatedAt: iso(person.updatedAt) ?? new Date().toISOString()
    })),
    conversationMessages: messageRows.map((message) => ({
      ...message,
      createdAt: iso(message.createdAt) ?? new Date().toISOString(),
      updatedAt: iso(message.updatedAt) ?? new Date().toISOString()
    })),
    conversationMessagePeople: messagePeopleRows,
    conversationAttachments: conversationAttachmentRows.map((attachment) => ({
      ...attachment,
      createdAt: iso(attachment.createdAt) ?? new Date().toISOString()
    })),
    attachments: attachmentRows.map((attachment) => {
      const fileName = attachment.fileName ?? `${attachment.id}.bin`;
      const path = attachment.kind === "upload" ? `${folderName}/attachments/${attachment.id}-${safeName(fileName)}` : null;
      if (path && attachment.dataBase64) {
        entries.push({ path, data: base64ToBytes(attachment.dataBase64) });
      }

      return {
        oldId: attachment.id,
        kind: attachment.kind,
        label: attachment.label,
        url: attachment.url,
        fileName: attachment.fileName,
        contentType: attachment.contentType,
        byteSize: attachment.byteSize,
        path,
        createdAt: iso(attachment.createdAt) ?? new Date().toISOString()
      };
    })
  };

  entries.unshift({ path: `${folderName}/project.json`, data: encoder.encode(JSON.stringify(backup, null, 2)) });
  return entries;
}

export async function createProjectExportArchive(userId: string, projectId: string) {
  const [project] = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.id, projectId)))
    .limit(1);

  if (!project) {
    throw new Error("Project not found.");
  }

  const folderName = safeName(project.name);
  const tar = createTar(await buildProjectBackup(userId, project.id, folderName));
  const bytes = await gzipBytes(tar);
  return {
    bytes,
    fileName: `${folderName}.tar.gz`,
    contentDisposition: contentDisposition(`${folderName}.tar.gz`)
  };
}

export async function createUserExportArchive(userId: string) {
  const projectRows = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(asc(projects.name));
  const entries: TarEntry[] = [];

  for (const project of projectRows) {
    entries.push(...(await buildProjectBackup(userId, project.id, `${safeName(project.name)}-${project.id.slice(0, 8)}`)));
  }

  const fileName = `jankdrive-backup-${new Date().toISOString().slice(0, 10)}.tar.gz`;
  return {
    bytes: await gzipBytes(createTar(entries)),
    fileName,
    contentDisposition: contentDisposition(fileName)
  };
}

function projectJsonEntries(entries: TarEntry[]) {
  return entries.filter((entry) => entry.path.endsWith("/project.json") || entry.path === "project.json");
}

function asBackup(value: unknown): ProjectBackup {
  const backup = value as ProjectBackup;
  if (!backup || backup.format !== "jankdrive.project.v1" || !backup.project?.name) {
    throw new Error("This does not look like a Jankdrive project backup.");
  }
  return backup;
}

function maybeSingleName(requestedName: string | null, backupCount: number, fallback: string) {
  if (backupCount === 1 && requestedName?.trim()) return requestedName.trim();
  return `${fallback} (restored ${new Date().toISOString().slice(0, 10)})`;
}

export async function restoreProjectsFromArchive(userId: string, archiveBytes: Uint8Array, requestedName: string | null) {
  const entries = readTar(await gunzipBytes(archiveBytes));
  const entryByPath = new Map(entries.map((entry) => [entry.path, entry]));
  const backups = projectJsonEntries(entries).map((entry) => asBackup(JSON.parse(decoder.decode(entry.data))));

  if (backups.length === 0) {
    throw new Error("No project.json files found in backup.");
  }

  return db.transaction(async (tx) => {
    const restoredProjects: Array<{ id: string; name: string }> = [];

    for (const backup of backups) {
      const [project] = await tx
        .insert(projects)
        .values({
          userId,
          name: maybeSingleName(requestedName, backups.length, backup.project.name),
          description: backup.project.description,
          createdAt: requiredDate(backup.project.createdAt),
          updatedAt: requiredDate(backup.project.updatedAt)
        })
        .returning({ id: projects.id, name: projects.name });

      restoredProjects.push(project);
      const componentIds = new Map<string, string>();
      const taskIds = new Map<string, string>();
      const expenseIds = new Map<string, string>();
      const customerIds = new Map<string, string>();
      const personIds = new Map<string, string>();
      const messageIds = new Map<string, string>();
      const attachmentIds = new Map<string, string>();

      for (const component of backup.components) {
        const [created] = await tx
          .insert(components)
          .values({
            projectId: project.id,
            name: component.name,
            descriptionMarkdown: component.descriptionMarkdown,
            createdAt: requiredDate(component.createdAt),
            updatedAt: requiredDate(component.updatedAt)
          })
          .returning({ id: components.id });
        componentIds.set(component.oldId, created.id);
      }

      for (const task of backup.tasks) {
        const [created] = await tx
          .insert(tasks)
          .values({
            projectId: project.id,
            name: task.name,
            descriptionMarkdown: task.descriptionMarkdown,
            estimatedMinutes: task.estimatedMinutes,
            startAt: date(task.startAt),
            endAt: date(task.endAt),
            complexity: task.complexity,
            risk: task.risk,
            impact: task.impact,
            differentiation: task.differentiation,
            priorityOffset: task.priorityOffset,
            status: task.status,
            createdAt: requiredDate(task.createdAt),
            updatedAt: requiredDate(task.updatedAt)
          })
          .returning({ id: tasks.id });
        taskIds.set(task.oldId, created.id);
      }

      const taskComponentValues = backup.taskComponents
        .map((row) => ({ taskId: taskIds.get(row.taskId), componentId: componentIds.get(row.componentId) }))
        .filter((row): row is { taskId: string; componentId: string } => Boolean(row.taskId && row.componentId));
      if (taskComponentValues.length > 0) {
        await tx.insert(taskComponents).values(taskComponentValues);
      }

      for (const expense of backup.expenses) {
        const [created] = await tx
          .insert(expenses)
          .values({
            projectId: project.id,
            vendor: expense.vendor,
            recipient: expense.recipient,
            category: expense.category,
            amount: expense.amount,
            businessUsePercentage: expense.businessUsePercentage,
            salesTaxPaid: expense.salesTaxPaid,
            taxTreatment: expense.taxTreatment,
            taxTreatmentOther: expense.taxTreatmentOther,
            spentAt: requiredDate(expense.spentAt),
            status: expense.status,
            notes: expense.notes,
            createdAt: requiredDate(expense.createdAt),
            updatedAt: requiredDate(expense.updatedAt)
          })
          .returning({ id: expenses.id });
        expenseIds.set(expense.oldId, created.id);
      }

      for (const attachment of backup.attachments) {
        const fileEntry = attachment.path ? entryByPath.get(attachment.path) : null;
        const [created] = await tx
          .insert(attachments)
          .values({
            kind: attachment.kind,
            label: attachment.label,
            url: attachment.url,
            fileName: attachment.fileName,
            contentType: attachment.contentType,
            byteSize: attachment.byteSize,
            dataBase64: fileEntry ? bytesToBase64(fileEntry.data) : null,
            createdAt: requiredDate(attachment.createdAt)
          })
          .returning({ id: attachments.id });
        attachmentIds.set(attachment.oldId, created.id);
      }

      const expenseArtifactValues = backup.expenseArtifacts
        .map((artifact) => ({
          expenseId: expenseIds.get(artifact.expenseId),
          attachmentId: attachmentIds.get(artifact.attachmentId),
          createdAt: requiredDate(artifact.createdAt)
        }))
        .filter((artifact): artifact is { expenseId: string; attachmentId: string; createdAt: Date } =>
          Boolean(artifact.expenseId && artifact.attachmentId)
        );
      if (expenseArtifactValues.length > 0) {
        await tx.insert(expenseArtifacts).values(expenseArtifactValues);
      }

      for (const customer of backup.customers) {
        const [created] = await tx
          .insert(customers)
          .values({
            projectId: project.id,
            name: customer.name,
            descriptionMarkdown: customer.descriptionMarkdown,
            createdAt: requiredDate(customer.createdAt),
            updatedAt: requiredDate(customer.updatedAt)
          })
          .returning({ id: customers.id });
        customerIds.set(customer.oldId, created.id);
      }

      for (const person of backup.conversationPeople) {
        const [created] = await tx
          .insert(conversationPeople)
          .values({
            projectId: project.id,
            name: person.name,
            normalizedName: person.normalizedName,
            createdAt: requiredDate(person.createdAt),
            updatedAt: requiredDate(person.updatedAt)
          })
          .returning({ id: conversationPeople.id });
        personIds.set(person.oldId, created.id);
      }

      for (const message of backup.conversationMessages) {
        const customerId = customerIds.get(message.customerId);
        if (!customerId) continue;
        const [created] = await tx
          .insert(conversationMessages)
          .values({
            customerId,
            title: message.title,
            shortDescription: message.shortDescription,
            bodyMarkdown: message.bodyMarkdown,
            createdAt: requiredDate(message.createdAt),
            updatedAt: requiredDate(message.updatedAt)
          })
          .returning({ id: conversationMessages.id });
        messageIds.set(message.oldId, created.id);
      }

      const messagePeopleValues = backup.conversationMessagePeople
        .map((row) => ({ messageId: messageIds.get(row.messageId), personId: personIds.get(row.personId) }))
        .filter((row): row is { messageId: string; personId: string } => Boolean(row.messageId && row.personId));
      if (messagePeopleValues.length > 0) {
        await tx.insert(conversationMessagePeople).values(messagePeopleValues);
      }

      const conversationAttachmentValues = backup.conversationAttachments
        .map((attachment) => ({
          messageId: messageIds.get(attachment.messageId),
          attachmentId: attachmentIds.get(attachment.attachmentId),
          createdAt: requiredDate(attachment.createdAt)
        }))
        .filter((attachment): attachment is { messageId: string; attachmentId: string; createdAt: Date } =>
          Boolean(attachment.messageId && attachment.attachmentId)
        );
      if (conversationAttachmentValues.length > 0) {
        await tx.insert(conversationAttachments).values(conversationAttachmentValues);
      }
    }

    return restoredProjects;
  });
}
