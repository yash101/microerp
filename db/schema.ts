import {
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const taskStatusEnum = pgEnum("task_status", ["candidate", "included", "complete", "cut", "later"]);
export const expenseStatusEnum = pgEnum("expense_status", ["draft", "submitted", "approved", "reimbursed", "rejected"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: text("username").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    passwordSalt: text("password_salt").notNull(),
    passwordIterations: integer("password_iterations").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    usernameIdx: index("users_username_idx").on(table.username)
  })
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userIdIdx: index("sessions_user_id_idx").on(table.userId),
    tokenHashIdx: index("sessions_token_hash_idx").on(table.tokenHash),
    expiresAtIdx: index("sessions_expires_at_idx").on(table.expiresAt)
  })
);

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const components = pgTable("components", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  descriptionMarkdown: text("description_markdown").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  descriptionMarkdown: text("description_markdown").notNull().default(""),
  estimatedMinutes: integer("estimated_minutes").notNull().default(0),
  startAt: timestamp("start_at", { withTimezone: true }),
  endAt: timestamp("end_at", { withTimezone: true }),
  complexity: integer("complexity").notNull(),
  risk: integer("risk").notNull(),
  impact: integer("impact").notNull(),
  differentiation: integer("differentiation").notNull(),
  priorityOffset: numeric("priority_offset", { precision: 8, scale: 2 }).notNull().default("0"),
  status: taskStatusEnum("status").notNull().default("candidate"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const taskComponents = pgTable(
  "task_components",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    componentId: uuid("component_id")
      .notNull()
      .references(() => components.id, { onDelete: "cascade" })
  },
  (table) => ({
    pk: primaryKey({ columns: [table.taskId, table.componentId] })
  })
);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    vendor: text("vendor").notNull(),
    recipient: text("recipient").notNull().default(""),
    category: text("category").notNull().default("General"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    spentAt: timestamp("spent_at", { withTimezone: true }).notNull(),
    status: expenseStatusEnum("status").notNull().default("draft"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    projectIdIdx: index("expenses_project_id_idx").on(table.projectId),
    statusIdx: index("expenses_status_idx").on(table.status),
    spentAtIdx: index("expenses_spent_at_idx").on(table.spentAt)
  })
);

export const expenseArtifacts = pgTable(
  "expense_artifacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    expenseId: uuid("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    dataBase64: text("data_base64").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    expenseIdIdx: index("expense_artifacts_expense_id_idx").on(table.expenseId)
  })
);

export const projectRelations = relations(projects, ({ many }) => ({
  components: many(components),
  tasks: many(tasks),
  expenses: many(expenses)
}));

export const userRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  projects: many(projects)
}));

export const sessionRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  })
}));

export const componentRelations = relations(components, ({ one, many }) => ({
  project: one(projects, {
    fields: [components.projectId],
    references: [projects.id]
  }),
  taskComponents: many(taskComponents)
}));

export const taskRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id]
  }),
  taskComponents: many(taskComponents)
}));

export const taskComponentRelations = relations(taskComponents, ({ one }) => ({
  task: one(tasks, {
    fields: [taskComponents.taskId],
    references: [tasks.id]
  }),
  component: one(components, {
    fields: [taskComponents.componentId],
    references: [components.id]
  })
}));

export const expenseRelations = relations(expenses, ({ one, many }) => ({
  project: one(projects, {
    fields: [expenses.projectId],
    references: [projects.id]
  }),
  artifacts: many(expenseArtifacts)
}));

export const expenseArtifactRelations = relations(expenseArtifacts, ({ one }) => ({
  expense: one(expenses, {
    fields: [expenseArtifacts.expenseId],
    references: [expenses.id]
  })
}));

export type Project = typeof projects.$inferSelect;
export type Component = typeof components.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type ExpenseArtifact = typeof expenseArtifacts.$inferSelect;
export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type TaskStatus = (typeof taskStatusEnum.enumValues)[number];
export type ExpenseStatus = (typeof expenseStatusEnum.enumValues)[number];
