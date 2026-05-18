# Architecture

## Purpose And Scope

- Micro ERP, branded in the UI/docs as Jankdrive, is a tiny founder/work tracker.
- It covers projects, tasks, components, rough prioritization, basic expense tracking, and project-scoped customer conversation notes.
- It is intentionally not a full ERP, accounting system, CRM, payroll system, or permission-heavy collaboration tool.
- The preferred implementation style is boring: server-rendered pages, server actions, Drizzle queries, and small schema changes.

## Stack

- Next.js App Router with React 19.
- Server actions in `lib/actions.ts` handle form mutations.
- Read/query helpers live in `lib/data.ts`.
- Validation uses Zod schemas in `lib/validation.ts`.
- Postgres is accessed through Drizzle ORM using `db/index.ts` and `db/schema.ts`.
- Migrations are generated into `drizzle/` with Drizzle Kit.
- Local Postgres runs through `docker-compose.yml`.
- Cloudflare Workers deployment uses OpenNext and optional Hyperdrive.
- Kubernetes deployment notes live in `docs/deploy-kubernetes.md`.

## Module Map

- `app/`: App Router pages and route handlers.
- `components/`: shared UI, forms, conversation widgets, and the decorative rocket.
- `db/schema.ts`: database tables, enums, relations, and inferred row types.
- `db/index.ts`: database client creation; prefers Cloudflare Hyperdrive when present, otherwise `DATABASE_URL`.
- `lib/actions.ts`: authenticated server actions for auth, projects, components, tasks, expenses, and conversations.
- `lib/data.ts`: authenticated read paths and small presentation helpers like task grouping.
- `lib/auth.ts`: signup code check, password auth, session cookies, and session lookup.
- `lib/auth-core.ts`: Web Crypto password/session token hashing helpers.
- `lib/priority.ts`: task priority heuristic.
- `lib/validation.ts`: form parsing and Zod validation.
- `deploy/prod.yaml`: single-server Kubernetes deployment manifest.

## Routing Structure

- `/`: signed-in project dashboard.
- `/login`, `/signup`, `/logout`: username/password auth with gated signup.
- `/projects/new`: create a project.
- `/projects/[projectId]`: project detail, tasks, and status buckets.
- `/projects/[projectId]/edit`: edit or delete a project.
- `/projects/[projectId]/components`: manage components for a project.
- `/projects/[projectId]/tasks/new`: create a task.
- `/projects/[projectId]/tasks/[taskId]`: task detail.
- `/projects/[projectId]/tasks/[taskId]/edit`: edit or delete a task.
- `/projects/[projectId]/expenses`: list and create basic expenses.
- `/projects/[projectId]/expenses/[expenseId]/edit`: edit draft expenses.
- `/projects/[projectId]/expenses/artifacts/[artifactId]`: download receipt artifacts.
- `/backup`: export all projects, export one project, or restore a tar.gz backup into new projects.
- `/backup/export`: download a tar.gz backup for every project owned by the current user.
- `/backup/import`: POST endpoint that restores uploaded tar.gz backups as new projects.
- `/projects/[projectId]/export`: download a tar.gz backup for one project.
- `/conversations`: compatibility redirect to the first project's conversations.
- `/projects/[projectId]/conversations`: project customer conversation timeline and customer list.
- `/projects/[projectId]/conversations/customers/new`: create a project customer record.
- `/projects/[projectId]/conversations/customers/[customerId]`: customer conversation history inside a project.
- `/projects/[projectId]/conversations/customers/[customerId]/edit`: edit or delete a project customer.
- `/projects/[projectId]/conversations/customers/[customerId]/messages/new`: add a conversation note.
- `/projects/[projectId]/conversations/customers/[customerId]/messages/[messageId]/edit`: edit a conversation note.
- `/projects/[projectId]/conversations/attachments/[attachmentId]`: download conversation upload attachments.

## Data Boundaries

- Users own projects.
- Projects own components, tasks, expenses, customers, and conversation people.
- Customers own conversation messages.
- Conversation people are project-scoped and can be reused across messages in the same project.
- There is no sharing model. If collaboration is needed, the current project stance is still "share the account creds."
- Most authorization checks happen by joining through `projects.userId`.

## Important Invariants

- Signup requires `SIGNUP_CODE`.
- Passwords are PBKDF2-SHA-256 hashes with per-user salts.
- Session cookies store only random session tokens; Postgres stores token hashes.
- Project-scoped writes should verify the project belongs to the signed-in user before mutating.
- Component IDs submitted with task forms are filtered to components in the same project.
- Expense and conversation uploads are stored as append-only `attachments` rows with base64 payloads in Postgres and capped at 5 MB by action code.
- Expense artifacts and conversation attachments are association rows that point to `attachments`; deleting or unchecking an attachment removes the association, not the attachment row.
- Next server actions have a 2 MB body limit in `next.config.mjs`; that can conflict with the 5 MB upload cap.
- Task priority is computed at read time, not stored.
- Expense expensing totals are `amount * businessUsePercentage / 100`.
- Tax treatment fields are stored as notes/metadata only; the app does not calculate taxes, depreciation, deductions, or filing positions.
- The old user-scoped conversation tables are intentionally orphaned as `orphaned_*` tables by migration `0006_project_scoped_conversations`.
- Backups are tar.gz archives. Each project folder contains `project.json` plus upload payloads under `attachments/`.
- Restores create fresh projects with new row IDs and remapped relationships. Existing projects are not overwritten or deleted.

## Non-Goals

- No double-entry accounting.
- No payroll.
- No bank feeds.
- No full audit log or event sourcing.
- No complex permissions or project sharing.
- No accounting automation.
- No tax computation or tax advice.
- No password reset, email, notifications, or dark theme.

## Last Updated

- 2026-05-18: Created agent-facing architecture notes from current code and agent configuration.
- 2026-05-18: Updated conversations to be project-scoped and documented orphaned legacy tables.
- 2026-05-18: Added shared append-only attachment storage for expense and conversation attachments.
- 2026-05-18: Added basic expense tax metadata and business-use expensing totals.
- 2026-05-18: Added tar.gz project backup/export and restore-as-new-project import.
