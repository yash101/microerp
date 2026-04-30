import {
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

export const taskStatusEnum = pgEnum("task_status", ["candidate", "included", "cut", "later"]);

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
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

export const projectRelations = relations(projects, ({ many }) => ({
  components: many(components),
  tasks: many(tasks)
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

export type Project = typeof projects.$inferSelect;
export type Component = typeof components.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type TaskStatus = (typeof taskStatusEnum.enumValues)[number];
