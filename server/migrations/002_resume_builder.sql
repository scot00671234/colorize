-- Usage tracking (usage_logs) and Pro / suspend flags on users.
-- Run after server/schema.sql. Example: psql -U postgres -d your_db -f server/migrations/002_resume_builder.sql

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
