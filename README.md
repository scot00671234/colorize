# Colorize

A minimal SaaS app for **AI photo colorize and restore**: landing page, auth (email/password, email verification), Stripe billing (Free / Pro / Team), and a dashboard where users upload photos to colorize or restore. Built on React + Express + PostgreSQL; AI via Replicate (DDColor, optional CodeFormer/GFPGAN).

## Tech stack

- **Frontend:** Vite, React 18, TypeScript, React Router
- **Styling:** Plain CSS with CSS variables; dark mode (`data-theme="dark"`)
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL via **pg** driver (no Prisma)
- **Auth:** JWT (email/password, email verification)
- **Billing:** Stripe (Checkout, Customer Portal, webhooks)

## Commands

```bash
npm install   # install dependencies
npm run dev   # start dev server
npm run build # production build
npm run preview # preview production build
```

## Design

- **Background:** Light gray-to-off-white gradient
- **Blobs:** SVG organic shapes with teal/blue-gray gradients and soft drop shadows
- **UI:** Glassmorphism cards and nav (backdrop blur, light borders, soft shadows)
- **Typography:** Outfit (clean sans-serif)
- **Texture:** Subtle noise overlay

---

## Auth (login, register, email confirmation)

The app includes a full auth flow that you can hook up to your API and PostgreSQL.

### Backend (Node + Express + PostgreSQL)

- **API:** `server/` — Express app with JWT auth and email verification.
- **Endpoints:**  
  `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/verify-email?token=...` · `POST /api/auth/resend-verification` · `GET /api/auth/me` (protected)
- **Database:** Run `server/schema.sql` and migrations against your Postgres DB to create `users` and related tables.
- **Config:** Copy `.env.example` to `.env` and set `DATABASE_URL`, `JWT_SECRET`, and optionally `APP_BASE_URL`, `PORT`, etc.

```bash
# Create DB and run schema (example)
npm run migrate
# or manually: psql -U postgres -d your_db -f server/schema.sql then run server/migrations/*.sql

# Run the auth API (from project root)
npm run server
# or with auto-reload: npm run dev:server
```

- **Email:** By default the server logs verification emails to the console. To send real email, configure Resend (or another provider) in `server/services/email.ts` and set `RESEND_*` in `.env`.

### Frontend

- **Routes:** `/` (landing), `/login`, `/register`, `/verify-email`, `/dashboard` (protected).
- **API base URL:** Set `VITE_API_URL` in `.env` (default `http://localhost:3001`).
- **Token:** Stored in `localStorage` and sent as `Authorization: Bearer <token>`.

### Flow

1. User registers → account created, verification email sent (or logged).
2. User clicks link in email → `GET /verify-email?token=...` → email marked verified.
3. User signs in at `/login` → receives JWT → can access `/dashboard` and other protected endpoints.

---

## Product (Colorize & restore)

Photo colorize and restore features are in development. See **[docs/COLORIZE_CC_ANALYSIS_AND_PLAN.md](docs/COLORIZE_CC_ANALYSIS_AND_PLAN.md)** for the product plan and implementation roadmap.

- **Dashboard:** After signing in, go to **/dashboard** for account overview and (when built) colorize/restore tools.
- **Migrations:** Run `server/schema.sql` and `server/migrations/002_resume_builder.sql`, `003_*`, `004_*` (or `npm run migrate`) for `users`, `usage_logs`, and `projects`.

### Setup (full app)

```bash
npm install
cp .env.example .env   # set DATABASE_URL, JWT_SECRET, Stripe vars, etc.
npm run migrate       # or run schema + migrations manually
npm run dev           # Vite (frontend)
npm run server        # Express (API)
```

### Local test (step-by-step)

**Where env vars go:** One file only — **`.env`** in the **project root** (same folder as `package.json`). Both the backend and the Vite frontend read from it.

1. **Create `.env`** (in project root): `cp .env.example .env` (Windows: `copy .env.example .env`)
2. **Edit `.env`** and set at least: `DATABASE_URL`, `JWT_SECRET`, `APP_BASE_URL=http://localhost:5173`
3. **Run migrations:** `npm run migrate` (or run `server/schema.sql` and `server/migrations/*.sql` against your DB)
4. **Start backend and frontend** (two terminals): `npm run server` then `npm run dev`
5. **Test:** Open http://localhost:5173 → Register → verify (link in API terminal in dev) → Sign in → **/dashboard**

**Production-like test:** `npm run build` then `NODE_ENV=production npm start` → serves app + API on one port.

---

## Deploy (Nixpacks / VPS)

The repo includes **`nixpacks.toml`**. Nixpacks runs `npm install`, `npm run build`, then `npm start`. One process serves both the API and the built frontend.

**Required env:** `NODE_ENV=production`, `PORT`, `DATABASE_URL`, `JWT_SECRET`, `APP_BASE_URL` (your app URL).

**Optional:** Stripe vars (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, etc.), `RESEND_*` for email.

**Before first deploy:** Run `server/schema.sql` and all migrations in `server/migrations/` against your production Postgres.

**Stripe webhook:** Set the webhook URL to `https://your-app.example.com/api/auth/stripe-webhook` and add `STRIPE_WEBHOOK_SECRET` to env. See **docs/STRIPE_WEBHOOK.md** for details.
