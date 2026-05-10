# Deploy Micro ERP on Kubernetes

This runbook deploys Micro ERP to a Kubernetes cluster on this server at:

`https://jankdrive.apps.dev.devya.sh`

It assumes:

- The server already has Kubernetes working.
- You can add DNS records for `dev.devya.sh`.
- You have an ingress controller, usually `ingress-nginx`.
- You use Let’s Encrypt through `cert-manager`.
- You want Postgres hosted inside this same cluster.

If your cluster uses Traefik instead of nginx, keep the app manifests but adjust
the `Ingress` class and annotations.

## 1. Point DNS at the Server

Create a DNS record for the app:

```text
jankdrive.apps.dev.devya.sh  A     <server-public-ip>
```

If the server has IPv6, also add:

```text
jankdrive.apps.dev.devya.sh  AAAA  <server-public-ipv6>
```

Verify DNS before asking Let’s Encrypt for a cert:

```sh
dig +short jankdrive.apps.dev.devya.sh
```

It should resolve to the same public IP that already serves
`box0.dev.devya.sh`.

## 2. Confirm Ingress and cert-manager

Check that your ingress controller has an external address:

```sh
kubectl get ingressclass
kubectl get svc -A | grep -E 'ingress|traefik|nginx'
```

Check cert-manager:

```sh
kubectl get pods -n cert-manager
kubectl get clusterissuer
```

If you do not already have a Let’s Encrypt issuer, create one:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    email: you@example.com
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
      - http01:
          ingress:
            class: nginx
```

Apply it:

```sh
kubectl apply -f clusterissuer.yaml
```

## 3. Build and Push the App Image

Build an image from this repository and push it to a registry your cluster can
pull from.

Example using GitHub Container Registry:

```sh
docker build -t ghcr.io/<your-user>/microerp:latest .
docker push ghcr.io/<your-user>/microerp:latest
```

If the repo does not have a Dockerfile yet, use this one:

```Dockerfile
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/db ./db
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/next.config.ts ./next.config.ts
EXPOSE 3000
CMD ["npm", "run", "start"]
```

## 4. Create the Kubernetes Manifests

This repo includes a ready-to-edit manifest at `deploy/prod.yaml` configured
for:

- `jankdrive:latest`
- `jankdrive.apps.dev.devya.sh`
- the `microerp` namespace
- a local in-cluster Postgres deployment
- `letsencrypt-prod` as the cert-manager `ClusterIssuer`
- `traefik` as the ingress class

Because the image is `jankdrive:latest` with `imagePullPolicy: Never`, the
image must exist in the Kubernetes node runtime. If your cluster is k3s or
containerd-backed, a plain `docker build -t jankdrive:latest .` may not be
visible to Kubernetes. In that case, either import the image into the node
runtime or push it to a registry and change `imagePullPolicy` to
`IfNotPresent`.

`deploy/prod.yaml` now bootstraps `microerp-secrets` inside Kubernetes. The
bootstrap job generates:

- `POSTGRES_PASSWORD`
- `AUTH_SECRET`
- `SIGNUP_CODE`

The job is idempotent: if `microerp-secrets` already exists, it leaves the
existing values untouched. This avoids putting the database password in git or
in shell history.

After the bootstrap job runs, read the generated signup code with:

```sh
kubectl -n microerp get secret microerp-secrets \
  -o jsonpath='{.data.SIGNUP_CODE}' | base64 -d; echo
```

Use `deploy/prod.yaml` as the source of truth for the Kubernetes resources.

## 5. Apply and Run Migrations

Apply everything:

```sh
kubectl apply -f deploy/prod.yaml
```

Watch the rollout:

```sh
kubectl -n microerp get pods
kubectl -n microerp rollout status deploy/microerp-postgres
kubectl -n microerp rollout status deploy/microerp-web
kubectl -n microerp logs job/microerp-migrate
```

If you update the app image later, create a new migration job name because
Kubernetes jobs are immutable:

```sh
kubectl -n microerp delete job microerp-migrate
kubectl apply -f deploy/prod.yaml
```

Or change the job name to something like `microerp-migrate-20260501`.

## 6. Check the Certificate

cert-manager should create a certificate automatically from the ingress.

```sh
kubectl -n microerp get certificate
kubectl -n microerp describe certificate jankdrive-apps-dev-devya-sh-tls
kubectl -n microerp get challenge,order
```

If issuance fails, check:

- DNS points to the server.
- Port 80 reaches the ingress controller.
- `ingressClassName` matches your ingress controller.
- The `ClusterIssuer` exists and is ready.

## 7. Smoke Test

Open:

```text
https://jankdrive.apps.dev.devya.sh/signup
```

Create the first account with the `SIGNUP_CODE` from the Kubernetes secret.

Then verify:

```sh
curl -I https://jankdrive.apps.dev.devya.sh/login
curl -I https://jankdrive.apps.dev.devya.sh/
```

Expected:

- `/login` returns `200`.
- `/` redirects unauthenticated users to `/login`.
- After signup/login, the app shows the empty planning dashboard.

## 8. Operations

View logs:

```sh
kubectl -n microerp logs deploy/microerp-web -f
kubectl -n microerp logs deploy/microerp-postgres -f
```

Restart the app:

```sh
kubectl -n microerp rollout restart deploy/microerp-web
```

Update secrets:

```sh
kubectl -n microerp edit secret microerp-secrets
kubectl -n microerp rollout restart deploy/microerp-web
```

Back up Postgres:

```sh
kubectl -n microerp exec deploy/microerp-postgres -- \
  pg_dump -U microerp -d microerp > microerp-backup.sql
```

Restore Postgres:

```sh
kubectl -n microerp exec -i deploy/microerp-postgres -- \
  psql -U microerp -d microerp < microerp-backup.sql
```

## Notes

- Keep `SIGNUP_CODE` private. Anyone with it can create an account.
- Rotate `SIGNUP_CODE` after creating accounts if this domain is public.
- Do not rotate `AUTH_SECRET` casually; existing sessions depend on it.
- For a single-server cluster, one web replica is enough.
- If you move Postgres outside the cluster later, only `DATABASE_URL` needs to
  change.
