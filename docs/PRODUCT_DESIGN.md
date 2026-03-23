# Product design — Colorizer

**Colorizer** is a web app for **AI photo colorization and restoration**: users upload images, run **Colorize** or **Restore** (via Replicate), and manage saved **projects**. Accounts use email/password (optional Google), with **Stripe** for Pro / Elite tiers.

## Technical reference

- **Runbook & VPS:** [DEPLOY.md](./DEPLOY.md)
- **Stripe webhooks:** [STRIPE_WEBHOOK.md](./STRIPE_WEBHOOK.md)
- **Repo root:** [README.md](../README.md)

## Data model (high level)

- **`users`** — auth, Stripe customer id, plan flags (`is_pro`, `is_team`).
- **`projects`** — per-user saved items; `job_description` is a legacy column name (optional text context).
- **`usage_logs`** — `action_type` values include `export`, `image_process`.
