-- Paid tier label from Stripe (starter | pro | studio). Legacy rows may be null until webhook or /me sync.
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan TEXT;
