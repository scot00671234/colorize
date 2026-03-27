# Colorizer Product-Truth Messaging Guardrail

Use this file before updating landing copy, blog copy, or metadata.

## Safe Claims (current)

- Colorizer is a web app for AI photo colorization.
- Workflow: upload -> colorize -> preview -> export.
- Users can save named projects in Dashboard.
- Pricing tiers: Starter, Pro, Studio.
- Monthly colorization limits and saved project limits are enforced.
- Billing and plan changes are handled with Stripe.

## Claims to Avoid Unless Implemented

- Guaranteed historical color accuracy
- Unlimited usage
- Permanent hosted output links
- Features not currently exposed in workspace UI

## Canonical Limits (source)

Reference backend limits in:

- `server/planConfig.ts`

Do not hardcode numbers in content without verifying against this file.

