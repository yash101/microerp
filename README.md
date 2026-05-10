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
- `AUTH_SECRET`
- `SIGNUP_CODE`

On this dev target, `.env` has been generated locally and is ignored by git.
The app should stay bound to localhost unless it is placed behind a properly
secured tunnel or reverse proxy.

Accounts are created through `/signup`. Signup requires `SIGNUP_CODE`, which
keeps a public dev target from becoming an open registration endpoint.

## Scripts

- `npm run dev` starts the Next.js dev server.
- `npm run build` creates a production build.
- `npm run lint` runs ESLint.
- `npm run test` runs Vitest.
- `npm run db:migrate` applies Drizzle migrations.
- `npm run preview` builds and previews the app in Cloudflare's Workers runtime.
- `npm run deploy` builds and deploys the app to Cloudflare Workers.

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
- Username/password signup and login.
- Passwords are salted and hashed with PBKDF2-SHA-256.
- Sessions are stored in Postgres as hashed random tokens.
- Session cookies are HTTP-only, same-site, and secure in production.
- Projects are scoped to the signed-in user.

## Database
- Postgres
- Use Docker Compose to run it locally.

## Cloudflare deployment

This app is configured for Cloudflare Workers via the OpenNext Cloudflare
adapter. Pages is not the right target for this full-stack SSR app.

For production Postgres, create a Cloudflare Hyperdrive config for your
database and add its ID to `wrangler.jsonc` under the commented `hyperdrive`
binding. The app will use `HYPERDRIVE.connectionString` when that binding is
present, and `DATABASE_URL` otherwise.

Set production secrets before deploying:

```sh
npx wrangler secret put AUTH_SECRET
npx wrangler secret put SIGNUP_CODE
```

If not using Hyperdrive, also set:

```sh
npx wrangler secret put DATABASE_URL
```

Then deploy:

```sh
npm run deploy
```

## Kubernetes deployment

For the single-server Kubernetes deployment at
`jankdrive.apps.dev.devya.sh`, see
[`docs/deploy-kubernetes.md`](docs/deploy-kubernetes.md).
