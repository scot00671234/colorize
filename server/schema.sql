-- Run this against your PostgreSQL database to create the auth schema.
-- Example: psql -U postgres -d your_db -f server/schema.sql

CREATE TABLE IF NOT EXISTS users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT NOT NULL UNIQUE,
  password_hash     TEXT NOT NULL,
  email_verified_at TIMESTAMPTZ,
  confirmation_token TEXT,
  confirmation_token_expires_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  stripe_customer_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_confirmation_token ON users (confirmation_token) WHERE confirmation_token IS NOT NULL;

-- For existing databases that already had users table without stripe_customer_id:
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
