# Stripe webhook setup

**The API already has the webhook endpoint.** It lives at `POST /api/auth/stripe-webhook` (see `server/routes/billing.ts`). Raw body is preserved for signature verification. You only need to **add the webhook in the Stripe Dashboard** and set `STRIPE_WEBHOOK_SECRET` in your env.

Quick reference for configuring the Stripe webhook (test or live).

## 1. Destination type

Choose **Webhook endpoint** (sends events to a URL on your server).  
Do *not* choose Amazon EventBridge unless you use that.

## 2. Endpoint URL

Use your API base URL + the webhook path:

- **Your app:** use your API base URL + path in **both** Test and Live mode (same URL, different signing secrets per mode), e.g.:
  ```
  https://your-app.example.com/api/auth/stripe-webhook
  ```
- **Local:** use Stripe CLI (`stripe listen --forward-to localhost:3001/api/auth/stripe-webhook`) and use the CLI’s signing secret; don’t add a dashboard endpoint for localhost.

## 3. Events from

Leave **Your account** selected.

## 4. Events to send

Select these four events (search by name if needed):

| Event |
|--------|
| `checkout.session.completed` |
| `customer.subscription.created` |
| `customer.subscription.updated` |
| `customer.subscription.deleted` |

Do *not* use “Select all events”.

## 5. Signing secret

After creating the endpoint, open it in the dashboard and copy the **Signing secret** (starts with `whsec_`). Set it in your env as:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Test vs Live:** Use the **test** endpoint secret when using `sk_test_...`; use the **live** endpoint secret when using `sk_live_...`. Create one webhook destination in Test mode and one in Live mode (same URL for both); each has its own signing secret.

## Links

- **Test mode webhooks:** https://dashboard.stripe.com/test/webhooks  
- **Live mode webhooks:** https://dashboard.stripe.com/webhooks (with Live mode on)
