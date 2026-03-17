# bioqz — Product Design

Full product design for the AI resume builder MVP, built on the existing SaaS boilerplate tech stack.

---

## Tech stack (boilerplate-aligned)

| Layer | Technology |
|-------|------------|
| **Frontend** | Vite, React 18, TypeScript, React Router |
| **Styling** | Plain CSS with CSS variables; dark mode via `data-theme="dark"` |
| **API client** | Fetch + Bearer JWT in `Authorization` header; token in `localStorage` |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | PostgreSQL, accessed via **pg** driver (no Prisma/ORM) |
| **Auth** | JWT (email/password); optional Google via Passport.js |
| **Billing** | Stripe (Checkout + Customer Portal + webhooks) |
| **AI** | DeepSeek API (model: `deepseek-chat`) |
| **PDF** | pdfmake (server-side export from editor state) |
| **Editor** | Tiptap (React), rich text, drag-drop sections |

No Next.js, no Prisma. All DB access uses `server/db.ts` and raw SQL (`pool.query()`).

---

## Product overview

- **Goal:** Let users upload or paste a resume, paste a job description, edit in a rich editor, get AI rewrites for selected bullets, see an ATS-style score, compare original vs current with keyword highlights, export to PDF, and switch between three layout templates.
- **Audience:** Job seekers who want fast, ATS-friendly resumes with minimal fluff.
- **Principles:** Clean UX, fast, abuse-protected (usage caps, rate limits, spam/lockout).

---

## User flows

1. **Sign up / Sign in** — Existing flow: register → verify email → login. Optional: Google OAuth.
2. **Resume entry** — User goes to Dashboard → Resume; uploads PDF or pastes text; content loads into editor.
3. **Job targeting** — User pastes job description into textarea; used for score and (optionally) AI context.
4. **Edit & rewrite** — User edits in Tiptap (bold, italic, lists, drag sections). Selects a bullet → “Rewrite with AI” → selection replaced with DeepSeek output; on error, show “Try again.”
5. **Score** — User clicks “Get score”; sees 0–100 and breakdown (keyword match, verb strength, length, ATS safety). Daily usage shown (e.g. “2/2 rewrites (Free)” or “12/500” for Pro).
6. **Preview** — Side-by-side: Original vs Current; keywords from job description highlighted (e.g. yellow) in Current.
7. **Export** — “Export PDF” → server generates PDF from editor state (pdfmake) → user downloads.
8. **Templates** — User switches among one-column, two-column (skills sidebar), creative; layout/styling updates for editor and PDF.

---

## Core features (detailed)

### 1. User auth

- **Email/password:** Existing: register, verify email, login, JWT, `GET /api/auth/me`.
- **Google (optional):** Passport.js Google OAuth; routes `GET /api/auth/google`, `GET /api/auth/google/callback`; store provider id in `users` or `accounts` table.
- **Pro status:** `users.is_pro` set by Stripe webhook (subscription active → true; cancelled → false). `/api/auth/me` returns `isPro: boolean` for UI limits and upsell.
- **Stripe webhook:** On `checkout.session.completed`, set `stripe_customer_id` (existing) and set `is_pro = true`. Also subscribe to subscription lifecycle: `customer.subscription.updated` / `customer.subscription.deleted` — when status is active set `is_pro = true`, when cancelled or ended set `is_pro = false` (look up user by `stripe_customer_id`). This keeps Pro in sync when the user cancels in the Customer Portal.

### 2. Dashboard: resume entry & job description

- **Upload:** PDF file input; backend endpoint returns extracted text (or client-side PDF lib) to seed editor. MVP: use client-side PDF parsing (e.g. pdfjs-dist) to extract text and seed the editor; no backend PDF endpoint required. Optional later: `POST /api/resume/parse-pdf`.
- **Paste:** Plain-text textarea or paste directly into editor to initialize content.
- **Job description:** Dedicated textarea; used for Rezi-style score and (if desired) AI context. Persist in component state or later in DB per session.

### 3. Tiptap editor

- **Features:** Bold, italic, lists (bullet/numbered), drag-drop sections, custom font (Inter), ATS-safe margins (e.g. 0.5–0.75 in).
- **State:** Editor content as JSON or HTML in React state; optionally POST to backend for persistence later.
- **No fluff:** Minimal toolbar; focus on content and structure.

### 4. AI rewrite

- **Trigger:** User selects text in editor → clicks “Rewrite with AI.”
- **Backend:** `POST /api/ai/rewrite` with `{ text: string }`. Apply rate limit first (1 req/s per user or IP), then requireAuth, then usage middleware (daily cap, burst, lockout) → DeepSeek service.
- **Prompt (DeepSeek):** “Rewrite this resume bullet like a top candidate: strong verbs, quantify wins, keep tone professional/human. Add metrics if missing.”
- **Response:** Replaced selection with rewritten text; store `tokens_used` in `usage_logs`. On API failure: 502, message “Something went wrong. Please try again.”

### 5. Rezi-style score (0–100)

- **Input:** Resume text + job description.
- **Backend:** `POST /api/ai/score` with `{ resumeText: string, jobDescription: string }`. requireAuth → usage middleware → score service (optionally cache by job-desc hash).
- **Formula:**
  - **Keyword match (≈40%):** Extract keywords from job description (tokenize, drop stopwords); % present in resume → 0–100.
  - **Verb strength (≈25%):** Strong verbs (e.g. led, delivered, improved, built); count in bullets; normalize to 0–100.
  - **Length (≈15%):** Heuristic for bullet/section length; 0–100.
  - **ATS safety (≈20%):** Regex checks for tables, complex headers, odd characters; deduct if detected.
- **Response:** `{ score: number, breakdown?: { keyword, verbStrength, length, atsSafety } }`. Optionally return keyword list for frontend highlighting.

### 6. Side-by-side preview

- **Panels:** “Original” (last saved or initial load) vs “Current” (live editor state).
- **Highlights:** Keywords from job description highlighted in Current view (e.g. yellow background). Keywords from score response or simple client-side extraction.

### 7. PDF export

- **Flow:** User clicks “Export PDF” → frontend sends editor state (JSON/HTML) to `POST /api/resume/export-pdf` → server uses pdfmake to generate PDF (one-click, pixel-perfect from editor state) → returns PDF blob → frontend triggers download.
- **Logging:** Insert `usage_logs` row with `action_type: 'export'` for abuse/analytics.

### 8. Templates

- **Presets:** (1) One-column, (2) Two-column (skills sidebar), (3) Creative.
- **Behavior:** Template switcher updates layout/styling for editor and for PDF (pdfmake layout). Same content, different presentation.

---

## Data model (PostgreSQL, TypeScript types)

- **users** (existing): Add `is_pro BOOLEAN NOT NULL DEFAULT false`. Optional: `suspended_at TIMESTAMPTZ` for auto-suspend; or use in-memory/Redis suspend flag.
- **usage_logs:**  
  `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`,  
  `user_id UUID NOT NULL REFERENCES users(id)`,  
  `timestamp TIMESTAMPTZ NOT NULL DEFAULT now()`,  
  `tokens_used INT`,  
  `action_type TEXT NOT NULL` (e.g. `'rewrite' | 'score' | 'export'`).  
  Index: `(user_id, timestamp)` for daily/count queries.

TypeScript types (e.g. in `server/types.ts` or next to db): mirror these columns for `User` and `UsageLog`.

### Migration 002 (DDL)

Run after `server/schema.sql`. Single source of truth for resume builder schema:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_pro BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS usage_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id),
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT now(),
  tokens_used  INT,
  action_type  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_timestamp ON usage_logs (user_id, timestamp);
```

---

## API design (Express, TypeScript)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/ai/rewrite | Bearer | Body: `{ text }`. Returns `{ rewritten: string, tokensUsed?: number }`. |
| POST | /api/ai/score | Bearer | Body: `{ resumeText, jobDescription }`. Returns `{ score, breakdown?, keywords? }`. |
| POST | /api/resume/export-pdf | Bearer | Body: editor state (JSON/HTML). Returns PDF binary (Content-Type: application/pdf). |
| GET | /api/auth/me | Bearer | Existing; add `isPro: boolean` to response. |

All AI and export routes: apply rate limit first (1 req/s per user or IP), then requireAuth, then usage middleware (caps, lockout, suspend), then handler.

---

## Abuse protection (critical)

- **usage_logs:** Every rewrite, score, and export inserts a row (`action_type`, `tokens_used` where applicable).
- **Daily rewrite cap:** Free: 2/day; Pro: 500/day. Count `usage_logs` where `action_type = 'rewrite'` and `timestamp > now() - interval '24 hours'`. If over cap → 429 “Daily rewrite limit reached.”
- **Same job desc (>10 in 24h):** Hash job description; track per user. If same hash >10 times in 24h → 30s cooldown (e.g. 429 with `Retry-After: 30`).
- **Burst (>20 rewrites in 60s):** 429 “Slow down—optimizing for quality” and 5-minute lockout (in-memory or Redis: `lockout:{userId}` TTL 300s). Check before each rewrite.
- **1000 credits/day:** 1 credit = 1 rewrite. If rewrites in last 24h ≥ 1000 → auto-suspend (e.g. set `users.suspended_at` or in-memory `suspended:{userId}`), 403 “Account paused—contact support,” optional email via existing email service.
- **Rate limit:** `express-rate-limit` on `/api/ai/*`: 1 req/s per IP; when authenticated, key by `user.id` so 1 req/s per user.
- **Job-desc cache:** In-memory (e.g. `node-cache`) or Redis. Key: hash(jobDescription). Value: extracted keywords or score result. Reduces duplicate work and optional AI calls.

---

## Frontend structure & UI

- **Route:** `/dashboard/resume` — new page under existing Dashboard layout (sidebar + nav).
- **Components:**
  - Resume dashboard page: layout for upload/paste, job desc textarea, editor, score block, preview, export, template switcher.
  - ResumeEditor: Tiptap wrapper (Inter, ATS margins, bold/italic/lists, drag-drop).
  - ResumePreview: side-by-side Original vs Current with keyword highlights (yellow).
- **API client:** Extend `src/api/client.ts` with `api.ai.rewrite(text)`, `api.ai.score(resumeText, jobDescription)`, `api.resume.exportPdf(editorState)` (blob).
- **UI:** Use existing CSS variables and dark mode; keep lean. Optional: add Tailwind + shadcn only for resume dashboard if desired.

---

## File map (key files)

| Area | Path |
|------|------|
| Migration | `server/migrations/002_resume_builder.sql` |
| Config | `server/config.ts` (DEEPSEEK_API_KEY; optional REDIS_URL) |
| Auth | `server/routes/auth.ts` (/me: isPro; webhook: is_pro on subscription) |
| Usage | `server/middleware/usage.ts` |
| Rate limit | `server/middleware/rateLimit.ts` |
| AI routes | `server/routes/ai.ts` (rewrite, score); mount at `/api/ai` |
| Resume routes | `server/routes/resume.ts` (export-pdf); mount at `/api/resume` |
| DeepSeek | `server/services/deepseek.ts` |
| Score | `server/services/score.ts` |
| Cache | `server/services/jobDescCache.ts` or inline in score (node-cache / Redis) |
| Frontend page | `src/pages/DashboardResume.tsx` |
| Editor | `src/components/ResumeEditor.tsx` |
| Preview | `src/components/ResumePreview.tsx` |
| App | `src/App.tsx` (route `/dashboard/resume`); `src/components/DashboardLayout.tsx` (nav + search) |

---

## Environment & setup

- **Env vars:** `DATABASE_URL`, `JWT_SECRET`, `APP_BASE_URL`, `DEEPSEEK_API_KEY`; Stripe vars for billing; optional `REDIS_URL` for cache/lockout.
- **Setup:** `npm install`, copy `.env.example` to `.env`, run migrations (including 002), `npm run dev` (Vite), `npm run server` (Express).
- **README:** Link to this document; list features (auth, upload/paste, Tiptap, AI rewrite, score, side-by-side preview, PDF export, templates, usage caps, rate limiting).

---

## Summary

- **Stack:** TypeScript, Vite, React, Express, PostgreSQL (pg), JWT, Stripe, DeepSeek, pdfmake, Tiptap.
- **Product:** Resume upload/paste, job desc, Tiptap editor, AI rewrite, Rezi-style score, side-by-side preview with keyword highlights, PDF export, three templates.
- **Abuse:** usage_logs, daily caps (50/500), job-desc cooldown, burst lockout, 1000-credit suspend, rate limit 1 req/s, optional job-desc cache.
