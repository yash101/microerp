# Micro ERP

## Enterprise Resource Planning

Just a tiny simple app for planning and prioritzation.

## Running locally

This is a Next.js, Drizzle, and Postgres app. Postgres is managed by Docker
Compose and is bound to `127.0.0.1` only so it is not exposed on a public
interface.

```sh
npm install
docker compose up -d postgres
npm run db:migrate
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Copy `.env.example` to `.env` and set strong values for:

- `DATABASE_URL`
- `APP_USERNAME`
- `APP_PASSWORD`
- `AUTH_SECRET`

On this dev target, `.env` has been generated locally and is ignored by git.
The app should stay bound to localhost unless it is placed behind a properly
secured tunnel or reverse proxy.

## Scripts

- `npm run dev` starts the Next.js dev server.
- `npm run build` creates a production build.
- `npm run lint` runs ESLint.
- `npm run test` runs Vitest.
- `npm run db:migrate` applies Drizzle migrations.

## Design

Users can have projects (no sharing for now, KISS).
Projects can have tasks.
Tasks have information:
  * Name
  * Description, markdown
  * Estimated time requirement
  * Start date/time
  * End date/time
  * Complexity (1-5)
  * Risk (1-5)
  * Impact (1-5)
  * Compute:
    value = Impact*2 + Differentiation*2
    cost = Complexity + Risk
    priority = value / cost
  * Also add a priority offset
Tasks can reference 0+ components
Components have information:
  * Name
  * Description, markdown

## Entities

### Project
- id
- name
- description
- createdAt
- updatedAt

### Component
- id
- projectId
- name
- descriptionMarkdown
- createdAt
- updatedAt

### Task
- id
- projectId
- name
- descriptionMarkdown
- estimatedMinutes
- startAt
- endAt
- complexity: 1-5
- risk: 1-5
- impact: 1-5
- differentiation: 1-5
- priorityOffset: number
- status: "candidate" | "included" | "cut" | "later"
- createdAt
- updatedAt

Computed:
- value = impact * 2 + differentiation * 2
- cost = complexity + risk
- priority = value / cost + priorityOffset

### TaskComponent
- taskId
- componentId

## Authn/Authz
- Single-user login with credentials from `APP_USERNAME` and `APP_PASSWORD`.
- Sessions use a signed, HTTP-only cookie with `AUTH_SECRET`.

## Database
- Postgres
- Use Docker Compose to run it locally.
