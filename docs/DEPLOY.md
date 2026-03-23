# Deployment (Dokploy + Nixpacks)

## Node version

- The app is pinned to **Node 20** (`.nvmrc`, `package.json` engines, `nixpacks.toml`).
- Nixpacks is explicitly configured to use `nodejs_20` so it never pulls the nodejs_22 nixpkgs archive (which can fail with "writing a blob" / "pack entry" on constrained build servers).

## If the build still shows `nodejs_22` or fails on Nix

1. **Clear the build cache** in Dokploy (or run `docker builder prune -af` on the host) so the plan is re-generated from the repo and old nodejs_22 layers are dropped.
2. **Ensure no env override:** In Dokploy, do not set `NIXPACKS_NODE_VERSION=22` (or set it to `20` if you need to override).

## ENOSPC: "no space left on device" during `npm install`

This means the **Docker build environment has run out of disk**. The app cannot fix this from code; the host must have enough free space.

1. **Free disk on the build server** – Remove old images/containers:  
   `docker system prune -af` and/or `docker builder prune -af`.
2. **Increase build disk** – In Dokploy (or your host), give the build more disk or use a larger volume.
3. **Disable or clear the npm cache mount** – If the builder mounts `/root/.npm`, that plus `node_modules` can exceed available space. Clearing the Docker build cache (step 1) often frees enough for one successful build.
4. **`.dockerignore`** – The repo includes a `.dockerignore` so the build context omits `node_modules`, `.git`, `docs`, and tests to keep the image smaller.

---

## VPS production checklist (systemd / Docker / bare Node)

### Build and process model

1. **Node 20** — match `package.json` `engines` and CI.
2. **Build once:** `npm ci && npm run build` (produces `dist/`).
3. **Start:** Either `npm start` (runs migrations then server) or run `npm run migrate` in CI/deploy then `npm run start:prod` so migrations are not tied to every process restart.
4. **`tsx` is a runtime dependency** — the server runs TypeScript via `tsx` so production images work with `npm ci --omit=dev` (no separate compile step).

### Environment (production)

| Variable | Notes |
|----------|--------|
| `NODE_ENV` | `production` |
| `PORT` | Port the app listens on (e.g. `3001`); reverse proxy forwards here. |
| `APP_BASE_URL` | Public HTTPS origin of the **browser app**, no trailing slash (e.g. `https://colorizer.cc`). Used for email links, Stripe `success_url` / `cancel_url`, and default CORS. |
| `CORS_ORIGINS` | Optional comma-separated list if the SPA is reachable on multiple origins (e.g. `https://colorizer.cc,https://www.colorizer.cc`). |
| `DATABASE_URL` | Postgres URL; add `?sslmode=require` or set `DATABASE_SSL=true` for typical managed DBs. |
| `JWT_SECRET` | Long random string (32+ characters). |
| `REPLICATE_API_TOKEN` | Required for image processing. |
| `STRIPE_*` | See [STRIPE_WEBHOOK.md](./STRIPE_WEBHOOK.md); webhook path is **`/api/auth/stripe-webhook`**. |
| `RESEND_*` | Real `RESEND_FROM` on a verified domain for production email. |

### Reverse proxy (nginx example)

- Terminate TLS on nginx/Caddy; forward `https://yourdomain` → `http://127.0.0.1:3001`.
- Set `X-Forwarded-Proto`, `X-Forwarded-For`, `Host` — the app uses `trust proxy` (first hop) for rate limiting.
- **Do not** cache `POST` /api routes.

### Startup validation (`NODE_ENV=production`)

The process **exits immediately** if:

- **`DATABASE_URL`** is missing, or  
- **`JWT_SECRET`** is missing, shorter than 32 characters, or still the placeholder `change-me-in-production`.

Set these before binding the port so bad deploys fail fast.

### Health checks

- **`GET /api/health`** — Returns JSON: `ok`, `env`, `database` (`connected` | `not_configured` | `error`), `replicate` (`configured` | `not_configured` — whether `REPLICATE_API_TOKEN` is set). Returns **503** if Postgres is configured but unreachable (suitable for orchestrator readiness). `replicate: not_configured` is **not** an error: the rest of the app (auth, billing) can run; only image processing returns 503 until you add the token.

### Security

- Security headers: `server/middleware/securityHeaders.ts` (HSTS when `APP_BASE_URL` is `https://`).
- JWT required for protected routes; Stripe webhook uses raw body + signature (see `billing.ts`).
- Image uploads: size/type limits in `server/routes/ai.ts` (multer).

### Database

- All schema changes live under `server/migrations/` and are applied in order by `scripts/run-migrations.js`.
- Table **`usage_logs`**: `action_type` includes `export`, `image_process` (free-form text — no DB enum).
- **`projects.job_description`**: legacy column name; optional text context for the project.

### Pricing (Stripe)

- **Free / Pro / Elite** tiers are enforced in application code (`project` limits in `projects.ts`; extend for monthly image caps when you add billing rules).
- Configure **Price IDs** in Stripe Dashboard and set `STRIPE_PRICE_PRO` / `STRIPE_PRICE_ELITE` in env.

### Frontend routing

- SPA: React Router **client-side** routes; the server must serve `index.html` for non-file paths (handled in `server/index.ts` for production only).
- Set `VITE_SITE_URL` for canonical SEO if it differs from browser origin (optional).

### Graceful shutdown

- **SIGTERM** / **SIGINT** close the HTTP server and Postgres pool (clean deploys / Docker stop).

---

## Pre-launch verification (production-ready)

Run through this once after deploy:

| Check | How |
|--------|-----|
| **Build** | `npm ci && npm run build` succeeds on the server or CI. |
| **App** | Open `https://yourdomain` — landing loads; logo/favicon show the four-color mark. |
| **API** | `GET https://yourdomain/api/health` → `ok: true`, `database: connected`; `replicate` reflects whether image processing is configured. |
| **Auth** | Register → email or console link → verify → login → `/dashboard` loads. |
| **Images** | `/dashboard/workspace` with `REPLICATE_API_TOKEN` set → colorize/restore returns a result URL. |
| **Stripe** | Test checkout (test mode) → success redirect to `/dashboard/settings`; webhook delivers (see `docs/STRIPE_WEBHOOK.md`). |
| **CORS** | If using `www` + apex, set `CORS_ORIGINS` and confirm login from both. |
| **Contact** | Support email shown in Contact / Privacy / Terms / Settings is **`bioqz-customer@outlook.com`** (update if you change branding). |

