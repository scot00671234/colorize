import { Router, Request, Response } from 'express'
import Stripe from 'stripe'
import { pool } from '../db'
import { config } from '../config'
import { requireAuth } from '../middleware/auth'
import type { JwtPayload } from '../middleware/auth'

const router = Router()
const stripe = config.stripe.secretKey ? new Stripe(config.stripe.secretKey) : null

function billingNotConfigured(res: Response): boolean {
  if (!stripe) {
    res.status(503).json({ error: 'Billing is not configured. Set STRIPE_SECRET_KEY and Stripe Price IDs.' })
    return true
  }
  return false
}

/** POST /api/auth/create-checkout-session — requires auth. Creates Stripe Checkout for upgrade. */
router.post('/create-checkout-session', requireAuth, async (req: Request, res: Response): Promise<void> => {
  if (billingNotConfigured(res)) return
  const { user } = req as Request & { user: JwtPayload }
  const { plan } = (req.body as { plan?: string }) || {}
  const isElite = plan === 'elite' || plan === 'enterprise'
  const priceId = isElite ? config.stripe.priceElite : config.stripe.pricePro
  if (!priceId) {
    const envVar = isElite ? 'STRIPE_PRICE_ELITE' : 'STRIPE_PRICE_PRO'
    res.status(400).json({
      error: `Stripe price not configured. Set ${envVar} in .env. In Stripe Dashboard → Products → your product → add a Price, then copy the full Price ID (e.g. price_1ABC123...).`,
    })
    return
  }

  try {
    const baseUrl = config.app.baseUrl
    if (!baseUrl || baseUrl.includes('localhost')) {
      res.status(400).json({
        error: 'Set APP_BASE_URL to your public URL so Stripe can redirect back after checkout. For local testing use Stripe CLI: stripe listen --forward-to localhost:3001/api/auth/stripe-webhook',
      })
      return
    }
    const session = await stripe!.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/dashboard/settings?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard/settings`,
      customer_email: user.email,
    })
    console.log('[stripe-checkout] session created', {
      plan,
      isElite,
      priceId,
      customer_email: user.email,
      sessionId: session.id,
    })
    res.json({ url: session.url })
  } catch (err) {
    console.error('Create checkout session error:', err)
    const rawMessage = err instanceof Error ? err.message : 'Failed to create checkout session'
    const isNoSuchPrice = /no such price|resource_missing|Invalid request/i.test(rawMessage)
    const message = isNoSuchPrice
      ? 'That Stripe Price ID was not found. In Stripe Dashboard go to Products → your product → copy the full Price ID (it looks like price_1ABC123..., not a short value like price_29). Update STRIPE_PRICE_PRO or STRIPE_PRICE_ELITE in your server env and redeploy.'
      : rawMessage
    res.status(500).json({ error: `Checkout failed: ${message}` })
  }
})

/** POST /api/auth/create-portal-session — requires auth. Opens Stripe Customer Portal (cancel subscription, update payment). */
router.post('/create-portal-session', requireAuth, async (req: Request, res: Response): Promise<void> => {
  if (billingNotConfigured(res)) return
  const { user } = req as Request & { user: JwtPayload }
  const { plan } = (req.body as { plan?: string } | undefined) || {}

  if (!pool) {
    res.status(503).json({ error: 'Database not configured' })
    return
  }

  try {
    const result = await pool.query(
      'SELECT stripe_customer_id FROM users WHERE id = $1',
      [user.userId]
    )
    const customerId = result.rows[0]?.stripe_customer_id
    if (!customerId) {
      res.status(400).json({ error: 'No billing account found. Subscribe to a plan first.' })
      return
    }

    const baseUrl = config.app.baseUrl
    const returnUrl = `${baseUrl}/dashboard/settings`

    // If a target plan is provided, deep-link into a subscription update confirmation flow.
    // This upgrades/downgrades the EXISTING subscription (proper proration/payment handled by Stripe),
    // instead of creating a second subscription via Checkout.
    if (plan === 'elite' || plan === 'pro') {
      const targetPriceId = plan === 'elite' ? config.stripe.priceElite : config.stripe.pricePro
      if (!targetPriceId) {
        const envVar = plan === 'elite' ? 'STRIPE_PRICE_ELITE' : 'STRIPE_PRICE_PRO'
        res.status(400).json({ error: `Stripe price not configured. Set ${envVar} in .env.` })
        return
      }

      const subs = await stripe!.subscriptions.list({ customer: customerId, status: 'active', limit: 1 })
      const sub = subs.data[0]
      const item = sub?.items?.data?.[0]
      if (!sub || !item) {
        res.status(400).json({ error: 'No active subscription found to update.' })
        return
      }

      // Note: Stripe requires the target price to be allowed by your Billing Portal configuration
      // (features.subscription_update.products). If not, Stripe will error with a helpful message.
      const session = await stripe!.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
        flow_data: {
          type: 'subscription_update_confirm',
          after_completion: { type: 'redirect', redirect: { return_url: returnUrl } },
          subscription_update_confirm: {
            subscription: sub.id,
            items: [{ id: item.id, price: targetPriceId, quantity: 1 }],
          },
        } as any,
      })
      res.json({ url: session.url })
      return
    }

    const session = await stripe!.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl })
    res.json({ url: session.url })
  } catch (err: unknown) {
    console.error('Create portal session error:', err)
    const e = err as { message?: string; raw?: { message?: string } }
    const stripeMsg = e?.raw?.message || e?.message || (err instanceof Error ? err.message : '')
    const hint =
      plan === 'elite' || plan === 'pro'
        ? ' For Pro→Elite upgrades: Stripe Dashboard → Settings → Billing → Customer portal → enable “Subscription update”, and add both Pro and Elite products (prices) under products customers can switch to.'
        : ''
    const error =
      stripeMsg && stripeMsg.length < 500
        ? `${stripeMsg}${hint ? ` ${hint}` : ''}`
        : `Failed to open billing portal.${hint}`
    res.status(500).json({ error })
  }
})

/** POST /api/auth/stripe-webhook — Stripe sends checkout.session.completed etc. here.
 *  When STRIPE_WEBHOOK_SECRET is set: verify signature, on checkout.session.completed
 *  find user by session.customer_email and set stripe_customer_id = session.customer.
 *  See: https://stripe.com/docs/webhooks
 */
router.post('/stripe-webhook', async (req: Request, res: Response): Promise<void> => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret || !stripe) {
    console.error('[stripe-webhook] not configured', {
      hasWebhookSecret: !!webhookSecret,
      hasStripeClient: !!stripe,
    })
    res.status(501).json({ error: 'Webhook not configured' })
    return
  }
  const sig = req.headers['stripe-signature'] as string | undefined
  if (!sig) {
    console.error('[stripe-webhook] missing stripe-signature header')
    res.status(400).json({ error: 'Missing signature' })
    return
  }
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody
  if (!rawBody) {
    console.error('[stripe-webhook] missing rawBody (verify hook may not be running)')
    res.status(400).json({ error: 'Raw body required for webhook' })
    return
  }
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    res.status(400).json({ error: 'Invalid signature' })
    return
  }
  const priceElite = config.stripe.priceElite || ''
  console.log('[stripe-webhook]', {
    eventId: event.id,
    type: event.type,
    priceEliteConfigured: !!priceElite,
  })

  async function getCustomerEmail(customerId: string): Promise<string | undefined> {
    if (!stripe) return undefined
    try {
      const customer = await stripe.customers.retrieve(customerId)
      const email = typeof customer.email === 'string' ? customer.email : customer.email?.toString()
      return email?.trim().toLowerCase() || undefined
    } catch (e) {
      console.warn('Stripe: failed to retrieve customer for email:', customerId)
      return undefined
    }
  }

  async function getTierFromSubscriptionId(subscriptionId: string): Promise<{ isPro: boolean; isTeam: boolean } | undefined> {
    if (!stripe) return undefined
    try {
      // Expand so we can reliably read the price id from items.data.price.
      const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data.price'] })
      return subscriptionTier(sub as Stripe.Subscription)
    } catch (e) {
      console.warn('Stripe: failed to retrieve subscription for tier:', subscriptionId)
      return undefined
    }
  }

  async function getPriceIdFromSubscriptionId(subscriptionId: string): Promise<string | undefined> {
    if (!stripe) return undefined
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data.price'] })
      const priceId = (sub as Stripe.Subscription).items?.data?.[0]?.price?.id
      return typeof priceId === 'string' ? priceId : undefined
    } catch (e) {
      console.warn('Stripe: failed to retrieve subscription price id:', subscriptionId)
      return undefined
    }
  }

  if (event.type === 'checkout.session.completed' && event.data.object) {
    const session = event.data.object as Stripe.Checkout.Session
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
    let email = session.customer_email || session.customer_details?.email
    if (customerId && pool) {
      console.log('Stripe webhook checkout.session.completed received')
      if (!email) {
        email = await getCustomerEmail(customerId)
      }
      email = typeof email === 'string' ? email.trim().toLowerCase() : undefined

      // For checkout.session.completed we should mark the user as paid immediately.
      // Derive tier from the purchased price id rather than subscription status (which may not be "active" yet).
      let isPro = true
      let isTeam = false
      if (typeof session.subscription === 'string') {
        const priceId = await getPriceIdFromSubscriptionId(session.subscription)
        console.log('[stripe-webhook] checkout:', {
          customerId,
          email,
          subscriptionId: session.subscription,
          priceId,
          priceElite,
        })
        if (priceElite && priceId && priceId === priceElite) isTeam = true
      }

      if (email) {
        try {
          console.log('[stripe-webhook] updating user tier by email', { email, isPro, isTeam })
          const result = await pool.query(
            'UPDATE users SET stripe_customer_id = $1, is_pro = $2, is_team = $3, updated_at = now() WHERE LOWER(email) = LOWER($4)',
            [customerId, isPro, isTeam, email]
          )
          console.log('[stripe-webhook] users rows updated (email match)', { rowCount: result.rowCount })

          if (result.rowCount === 0) {
            // Fallback: sometimes existing users already have stripe_customer_id stored,
            // but email casing can differ. Try updating by stripe_customer_id.
            const resultByStripeId = await pool.query(
              'UPDATE users SET is_pro = $1, is_team = $2, updated_at = now() WHERE stripe_customer_id = $3',
              [isPro, isTeam, customerId]
            )
            console.log('[stripe-webhook] users rows updated (stripe_customer_id match)', {
              rowCount: resultByStripeId.rowCount,
            })
          }
        } catch (err) {
          console.error('[stripe-webhook] update user tier failed:', err)
        }
      } else {
        console.warn('Webhook checkout.session.completed: missing customer email for customerId:', customerId)
      }
    }
  }
  function subscriptionTier(sub: Stripe.Subscription): { isPro: boolean; isTeam: boolean } {
    const priceId = sub.items?.data?.[0]?.price?.id ?? ''
    const isTeam = !!priceElite && priceId === priceElite
    const isPro = sub.status === 'active' || sub.status === 'trialing'
    return { isPro, isTeam: isPro && isTeam }
  }
  if (event.type === 'customer.subscription.created' && event.data.object) {
    const sub = event.data.object as Stripe.Subscription
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
    const { isPro, isTeam } = subscriptionTier(sub)
    if (customerId && pool) {
      try {
        const email = await getCustomerEmail(customerId)
        if (email) {
          console.log('[stripe-webhook] subscription.created:', { customerId, email, isPro, isTeam })
          await pool.query(
            'UPDATE users SET stripe_customer_id = $1, is_pro = $2, is_team = $3, updated_at = now() WHERE LOWER(email) = LOWER($4)',
            [customerId, isPro, isTeam, email]
          )
        } else {
          console.warn('[stripe-webhook] subscription.created: missing customer email', { customerId, isPro, isTeam })
          await pool.query(
            'UPDATE users SET is_pro = $1, is_team = $2, updated_at = now() WHERE stripe_customer_id = $3',
            [isPro, isTeam, customerId]
          )
        }
      } catch (err) {
        console.error('[stripe-webhook] subscription.created is_pro/is_team failed:', err)
      }
    }
  }
  if (event.type === 'customer.subscription.updated' && event.data.object) {
    const sub = event.data.object as Stripe.Subscription
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
    const { isPro, isTeam } = subscriptionTier(sub)
    if (customerId && pool) {
      try {
        const email = await getCustomerEmail(customerId)
        if (email) {
          console.log('[stripe-webhook] subscription.updated:', { customerId, email, isPro, isTeam })
          await pool.query(
            'UPDATE users SET stripe_customer_id = $1, is_pro = $2, is_team = $3, updated_at = now() WHERE LOWER(email) = LOWER($4)',
            [customerId, isPro, isTeam, email]
          )
        } else {
          console.warn('[stripe-webhook] subscription.updated: missing customer email', { customerId, isPro, isTeam })
          await pool.query(
            'UPDATE users SET is_pro = $1, is_team = $2, updated_at = now() WHERE stripe_customer_id = $3',
            [isPro, isTeam, customerId]
          )
        }
      } catch (err) {
        console.error('[stripe-webhook] subscription.updated is_pro/is_team failed:', err)
      }
    }
  }
  if (event.type === 'customer.subscription.deleted' && event.data.object) {
    const sub = event.data.object as Stripe.Subscription
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
    if (customerId && pool) {
      try {
        console.log('[stripe-webhook] subscription.deleted:', { customerId })
        await pool.query(
          'UPDATE users SET is_pro = false, is_team = false, updated_at = now() WHERE stripe_customer_id = $1',
          [customerId]
        )
      } catch (err) {
        console.error('[stripe-webhook] subscription.deleted is_pro failed:', err)
      }
    }
  }
  const handled =
    event.type === 'checkout.session.completed' ||
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  if (!handled) {
    console.log('[stripe-webhook] unhandled event type (ignored):', event.type)
  }
  res.json({ received: true })
})

export default router
