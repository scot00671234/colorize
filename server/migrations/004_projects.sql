-- Resume/application projects: one per user (free), 10 (pro), 100 (elite).
-- Run after 003. Requires users.id and is_pro.

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_team BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS projects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects (user_id);
