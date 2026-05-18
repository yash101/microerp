# Implementation Notes

## Current Decisions

- Keep the app small and direct. Prefer a field, note, flag, or simple status over a subsystem.
- Server actions in `lib/actions.ts` are the main write API.
- Read helpers in `lib/data.ts` should continue to enforce user ownership through project/customer joins.
- Forms submit plain `FormData`; validation and coercion happen in `lib/validation.ts`.
- Drizzle schema changes should be generated with `npm run db:generate` and applied with `npm run db:migrate`.
- Task priority is deliberately heuristic and recalculated on read.
- Expense tracking is reimbursement/status tracking, not accounting.
- Conversation tracking is project-scoped memory aid, not a CRM.

## Sharp Edges

- `projects.userId` is nullable in the database, but normal app creation always sets it. Queries only show projects matching the signed-in user.
- Expense and conversation upload action code allows files up to 5 MB, but `next.config.mjs` sets the server action body limit to 2 MB.
- File uploads are stored as base64 in Postgres. This is simple but not space-efficient.
- `wrangler.jsonc` includes an uncommented instructional line before the `hyperdrive` key; verify the file before relying on Wrangler parsing.
- Password reset does not exist. Losing credentials means losing access unless someone manually edits data.
- Sessions expire after 14 days and are not refreshed on read.
- Search is simple `ilike` matching over a few fields inside one project, not full-text search.
- The app has no shared projects, teams, roles, or invite flow.
- The `/conversations` route is only a redirect shim to the first project; real conversation routes are under `/projects/[projectId]/conversations`.

## Migration Notes

- Existing migration history:
  - `0000_initial`: projects, components, tasks, task/component join.
  - `0001_users_sessions`: users, sessions, and project ownership.
  - `0002_add_complete_task_status`: adds `complete` task status.
  - `0003_expense_management`: expenses and expense artifacts.
  - `0004_add_expense_recipient`: expense recipient.
  - `0005_customer_conversations`: customers, conversation people/messages/attachments.
  - `0006_project_scoped_conversations`: renames old user-scoped conversation tables to `orphaned_*` and creates fresh project-scoped conversation tables.
- Keep migrations boring and forward-only.
- If a future field is ambiguous, prefer `review_needed` or a notes field before adding workflow machinery.
- Update `docs/data-model.md` in the same change as schema or lifecycle changes.

## Places To Inspect First

- Auth/session behavior: `lib/auth.ts`, `lib/auth-core.ts`, `app/login/page.tsx`, `app/signup/page.tsx`.
- Database shape: `db/schema.ts`, current migration in `drizzle/`.
- Project/task/component flows: `lib/actions.ts`, `lib/data.ts`, `app/projects/**`, `components/forms.tsx`.
- Expenses: `app/projects/[projectId]/expenses/**`, `lib/actions.ts`, `lib/data.ts`.
- Conversations: `app/projects/[projectId]/conversations/**`, `components/conversations.tsx`, `lib/actions.ts`, `lib/data.ts`.
- Shared styling/components: `app/globals.css`, `components/ui.tsx`.
- Deployment: `README.md`, `docs/deploy-kubernetes.md`, `deploy/prod.yaml`, `wrangler.jsonc`.

## Future-Agent Rules

- Read `AGENTS.md` first, then `README.md`, this file, `docs/architecture.md`, and `docs/data-model.md`.
- Do not add double-entry accounting, payroll, bank feeds, audit/event sourcing, complex permissions, or accounting automation.
- Keep UI changes small unless the user explicitly asks for a redesign.
- Keep docs concise and update them whenever features or schema behavior changes.
- If docs and code disagree, assume code is current and fix docs.

## Last Updated

- 2026-05-18: Created implementation notes from current code and agent configuration.
- 2026-05-18: Documented project-scoped conversation routing and the orphaned-table migration.
