-- Normalize legacy/invalid values and ensure subscription_plan allows starter/pro/studio.
-- Safe to run multiple times.

ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan TEXT;

-- Normalize case and legacy tier names.
UPDATE users
SET subscription_plan = CASE
  WHEN subscription_plan IS NULL THEN NULL
  WHEN lower(trim(subscription_plan)) IN ('starter', 'pro', 'studio') THEN lower(trim(subscription_plan))
  WHEN lower(trim(subscription_plan)) IN ('elite', 'enterprise', 'team') THEN 'studio'
  ELSE NULL
END;

-- Replace any old check with the canonical one.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_subscription_plan_check;
ALTER TABLE users
ADD CONSTRAINT users_subscription_plan_check
CHECK (subscription_plan IS NULL OR subscription_plan IN ('starter', 'pro', 'studio'));
