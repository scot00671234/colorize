-- Subscription plan for photo limits (starter=50, pro=150, team=400). Run after 005.

ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan TEXT CHECK (subscription_plan IN ('starter', 'pro', 'team'));
