# Colorizer — AI photo colorize & restore

Full-stack SaaS: landing, auth (email/password + optional Google), **Stripe** subscriptions (Pro / Elite), **Replicate**-powered image **colorize** and **restore**, saved **projects**, and PDF/DOCX export utilities.

## Stack

| Layer | Tech |
|--------|------|
| Frontend | Vite, React 18, React Router, CSS variables + dark mode |
| Backend | Node 20, Express, TypeScript (`tsx`) |
| Database | PostgreSQL (`pg` pool, migrations in `server/migrations/`) |
| AI | [Replicate](https://replicate.com) (defaults: DDColor + Microsoft “bringing old photos back to life”) |
| Billing | Stripe Checkout, Customer Portal, webhooks |

## Commands

```bash
npm install
npm run dev          # Vite → http://localhost:5173
npm run server       # API → http://localhost:3001
npm run build        # Production client bundle → dist/
npm start            # migrate DB then start API + static (after build)
npm run start:prod   # API + static only — run migrations separately (`npm run migrate`)
npm run migrate      # Apply server/schema.sql + migrations (uses DATABASE_URL)
```

## Configuration

Copy [`.env.example`](.env.example) to `.env`. Minimum for local dev: `DATABASE_URL`, `JWT_SECRET`, `APP_BASE_URL`, and **`REPLICATE_API_TOKEN`** for `/dashboard/workspace` image processing.

Detailed variable reference: **`.env.example`** · local walkthrough: **[LOCAL_SETUP.md](LOCAL_SETUP.md)** · Stripe webhooks: **[docs/STRIPE_WEBHOOK.md](docs/STRIPE_WEBHOOK.md)** · production / VPS: **[docs/DEPLOY.md](docs/DEPLOY.md)**.

## API surface (summary)

| Prefix | Purpose |
|--------|---------|
| `/api/auth/*` | Register, login, JWT, Google OAuth, verify email, password reset, **`/me`**, account delete |
| `/api/auth/*` (billing) | Stripe Checkout, portal, **`stripe-webhook`** |
| `/api/ai/process` | Multipart image + `mode=colorize\|restore` (auth, Replicate) |
| `/api/projects/*` | CRUD projects |
| `/api/resume/export-pdf` · `export-docx` | Document export (auth) |
| `/api/health` | Liveness + DB ping |

Unknown paths under `/api/*` return **JSON** `404` (never HTML).

## Production build

```bash
npm run build
NODE_ENV=production npm start
```

Serves the Vite app and API from one process (see `server/index.ts`). Set `APP_BASE_URL`, `DATABASE_URL`, `JWT_SECRET`, `REPLICATE_API_TOKEN`, and Stripe/Replicate vars on the host.

## Git

This project uses a **local repository only** (no remote configured by default). Add your own origin when ready:

```bash
git remote add origin https://github.com/your-org/colorizer.git
git add -A && git commit -m "Initial commit"
git push -u origin main
```

## License

Private / your deployment.
