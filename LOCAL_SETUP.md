# Local setup — what each step does

This file explains the local test flow so you know what you’re doing at each step.

---

## Make sign up and sign in work (quick checklist)

1. **`.env` in project root**  
   - `DATABASE_URL` — Postgres connection (e.g. `postgresql://postgres:postgres@localhost:5432/colorizer`).  
   - `JWT_SECRET` — any long random string (e.g. `my-dev-secret-key-at-least-32-chars`).  
   - `APP_BASE_URL` — `http://localhost:5173` (so the verification link points to your app).

2. **Database**  
   - Postgres running (Docker or local).  
   - Migrations applied: `npm run migrate` (or run `server/schema.sql` and `server/migrations/002_resume_builder.sql`).

3. **Backend and frontend**  
   - **Terminal 1:** `npm run server` (API on http://localhost:3001).  
   - **Terminal 2:** `npm run dev` (app on http://localhost:5173).

4. **Flow**  
   - Open **http://localhost:5173** → **Get started free** → enter email + password (8+ chars) → **Register**.  
   - **Locally:** Sign in right away—in development, email verification is skipped so you can log in without opening a link.  
   - **With verification (e.g. staging):** Set `NODE_ENV=production`; then use the verification link printed in the API terminal (`[Email] Verification link (copy this): ...`) before signing in.

If the API isn't running or `DATABASE_URL` is wrong, register/login will fail; check the API terminal and the browser Network tab for errors.

**Troubleshooting:** If you see "Cannot reach the API" → start the API with `npm run server` in a separate terminal. If you see "Database not configured" → set `DATABASE_URL` in `.env` and restart the API. If sign-in says "Invalid email or password" → use the exact same email and password you used to register.

---

## Easiest: one command (requires Docker Desktop)

1. **Install Docker Desktop** (if you don’t have it): https://www.docker.com/products/docker-desktop/
2. **Start Docker Desktop** and wait until it’s running (whale icon in the system tray).
3. From the project root run:
   ```bash
   npm run local:up
   ```
   This will:
   - Start a Postgres database in Docker (no need to install Postgres yourself).
   - Wait for it to be ready and run the database migrations (create `users` and `usage_logs` tables).
   - Start the API server (port 3001) and the frontend (port 5173) in the background.
4. Open **http://localhost:5173** in your browser → Register → verify email (link in the terminal where you ran `local:up`) → Sign in → go to **/dashboard/workspace**.

If Docker isn’t installed or won’t start, use the manual steps below (you’ll need Postgres installed and running).

---

## 1. The `.env` file (already created)

**What it is:** A single file in the **project root** named `.env`. It holds environment variables (secrets and config) that both the backend and the frontend use. It is not committed to git (in `.gitignore`).

**What you do:** Open `.env` and replace the placeholder values with your real ones:

| Variable | What it’s for | Example / what to put |
|----------|----------------|------------------------|
| `DATABASE_URL` | Postgres connection string so the API can read/write users and usage. | `postgresql://postgres:yourpassword@localhost:5432/colorizer` (use your DB name and password) |
| `JWT_SECRET` | Secret used to sign login tokens. Can be any long random string. | e.g. `my-dev-secret-key-12345` (use something longer in production) |
| `REPLICATE_API_TOKEN` | **Image Colorize / Restore** on the workspace (Replicate). Create a token at [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens). | Paste the token; without it, `/api/ai/process` returns 503. Optional: `REPLICATE_COLORIZE_MODEL` / `REPLICATE_RESTORE_MODEL` to override default models. |
| `APP_BASE_URL` | Base URL of the app; used in emails (e.g. verify link). For local dev this is the Vite URL. | `http://localhost:5173` (already set) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional. For “Continue with Google” on login/register. Create OAuth 2.0 credentials in Google Cloud Console and set the redirect URI to `http://localhost:3001/api/auth/google/callback` (or your API base + `/api/auth/google/callback`). | Leave empty to hide Google sign-in. |
| `VITE_SITE_URL` | **Production SEO:** canonical URLs, Open Graph, and JSON-LD use this as your public site origin (no trailing slash). | e.g. `https://colorizer.app`. If unset, the browser’s `window.location.origin` is used (fine locally). Also update `public/sitemap.xml` and `public/robots.txt` Sitemap line to match your domain. |

**Why one file:** The Express server loads `.env` via `dotenv`; Vite loads the same file and exposes `VITE_*` vars to the browser. So one `.env` at the project root is enough for local dev.

---

## 2. Database and migrations (you run these once)

**What they do:**

- **`server/schema.sql`** — Creates the `users` table (email, password hash, verification, Stripe customer id, etc.).
- **`server/migrations/002_resume_builder.sql`** — Adds `is_pro` and `suspended_at` on `users`, and creates the `usage_logs` table for AI usage tracking.
- **`server/migrations/005_google_auth.sql`** — Adds `google_id` and allows password-less users for Google sign-in.

**What you do:** From the project root, with Postgres running and a database created, run `node scripts/run-migrations.js` (or run the SQL files above in order with psql).

Use the same database name as in `DATABASE_URL` in `.env`. If you don’t have a DB yet, create it first, e.g. `createdb colorizer`, then use that name in the connection string.

---

## 3. Two terminals — backend and frontend

**Why two processes:**

- **Backend (Express):** Serves the API (`/api/auth/*`, `/api/ai/*`, `/api/resume/*`). It must run so the frontend can log in, process images, and export PDF.
- **Frontend (Vite):** Serves the React app with hot reload so you can edit the UI and see changes immediately.

They run on different ports: API on **3001**, frontend on **5173**. The frontend is configured (when `VITE_API_URL` is unset) to call `http://localhost:3001` for API requests.

**What you do:**

1. **Terminal 1 (API):**
   ```bash
   npm run server
   ```
   You should see: `Auth API running at http://localhost:3001`

2. **Terminal 2 (frontend):**
   ```bash
   npm run dev
   ```
   You should see: `Local: http://localhost:5173`

3. Open **http://localhost:5173** in the browser.

---

## 4. Test the flow

1. **Register** — Creates a user; the server will log the verification link (or send email if you’ve wired it).
2. **Verify email** — Open the link from the server log (or the email); that marks the user as verified.
3. **Sign in** — Uses the same `.env` credentials (DB, JWT) to issue a token.
4. **Dashboard → Workspace** — Go to **/dashboard/workspace** to upload an image and run **Colorize** or **Restore** (needs `REPLICATE_API_TOKEN`). Projects and settings work without it; PDF/DOCX export uses `/api/resume/*` if you call it from a client that sends document text.

If the API isn’t running or `.env` is wrong, login and workspace features will fail; the frontend will show errors in the UI or in the browser dev tools (Network tab).

---

## Summary

| Step | What you did | Why it matters |
|------|----------------|-----------------|
| `.env` created | You edit it with real `DATABASE_URL`, `JWT_SECRET`, `REPLICATE_API_TOKEN` (for image AI). | Backend and frontend read config from this one file. |
| Run migrations | You ran `schema.sql` and `002_resume_builder.sql` on your DB. | Creates `users` and `usage_logs` so the app can store data. |
| Terminal 1: `npm run server` | Started the Express API. | Serves auth, image API, projects, billing. |
| Terminal 2: `npm run dev` | Started the Vite dev server. | Serves the React app and hot reload. |
| Open http://localhost:5173 | Use the app in the browser. | Frontend talks to API at localhost:3001. |
