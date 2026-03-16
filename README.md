# Frosted Landing

A minimal landing page with an ethereal, frosted-glass aesthetic—organic blob shapes, cool teal/gray palette, glassmorphism UI, and soft shadows.

## Stack

- **Vite** + **React** + **TypeScript**
- Plain CSS (no Tailwind in this project)

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
- **Texture:** Subtle noise overlay for a frosted feel

---

## Auth (login, register, email confirmation)

The app includes a full auth flow that you can hook up to your API and PostgreSQL.

### Backend (Node + Express + PostgreSQL)

- **API:** `server/` — Express app with JWT auth and email verification.
- **Endpoints:**  
  `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/verify-email?token=...` · `POST /api/auth/resend-verification` · `GET /api/auth/me` (protected)
- **Database:** Run `server/schema.sql` against your Postgres DB to create the `users` table.
- **Config:** Copy `.env.example` to `.env` and set `DATABASE_URL`, `JWT_SECRET`, and optionally `APP_BASE_URL`, `PORT`, etc.

```bash
# Create DB and run schema (example)
psql -U postgres -d your_db -f server/schema.sql

# Run the auth API (from project root)
npm run server
# or with auto-reload: npm run dev:server
```

- **Email:** By default the server logs verification emails to the console. To send real email, implement the `EmailService` in `server/services/email.ts` (e.g. SendGrid, Resend, Nodemailer) and use it in `server/routes/auth.ts` instead of `stubEmailService`.

### Frontend

- **Routes:** `/` (landing), `/login`, `/register`, `/verify-email`, `/dashboard` (protected).
- **API base URL:** Set `VITE_API_URL` in `.env` (default `http://localhost:3001`).
- **Token:** Stored in `localStorage` and sent as `Authorization: Bearer <token>`.

### Flow

1. User registers → account created, verification email sent (or logged).
2. User clicks link in email → `GET /verify-email?token=...` → email marked verified.
3. User signs in at `/login` → receives JWT → can access `/dashboard` and other protected endpoints.
