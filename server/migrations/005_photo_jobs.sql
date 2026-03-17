-- Photo colorize/restore jobs. Run after 004_projects.sql.
-- Requires users.id.

CREATE TABLE IF NOT EXISTS photo_jobs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL DEFAULT 'colorize' CHECK (type IN ('colorize', 'restore', 'portrait')),
  input_url    TEXT NOT NULL,
  output_url   TEXT,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  replicate_id TEXT,
  error_message TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_photo_jobs_user_id ON photo_jobs (user_id);
CREATE INDEX IF NOT EXISTS idx_photo_jobs_status ON photo_jobs (status) WHERE status IN ('pending', 'processing');
