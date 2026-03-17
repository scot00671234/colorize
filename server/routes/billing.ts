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
  const isEnterprise = plan === 'enterprise'
  const priceId = isEnterprise ? config.stripe.priceEnterprise : config.stripe.pricePro
  if (!priceId) {
    const envVar = isEnterprise ? 'STRIPE_PRICE_ENTERPRISE' : 'STRIPE_PRICE_PRO'
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
    res.json({ url: session.url })
  } catch (err) {
    console.error('Create checkout session error:', err)
    const rawMessage = err instanceof Error ? err.message : 'Failed to create checkout session'
    const isNoSuchPrice = /no such price|resource_missing|Invalid request/i.test(rawMessage)
    const message = isNoSuchPrice
      ? 'That Stripe Price ID was not found. In Stripe Dashboard go to Products → your product → copy the full Price ID (it looks like price_1ABC123..., not a short value like price_29). Update STRIPE_PRICE_PRO or STRIPE_PRICE_ENTERPRISE in your server env and redeploy.'
      : rawMessage
    res.status(500).json({ error: `Checkout failed: ${message}` })
  }
})

/** POST /api/auth/create-portal-session — requires auth. Opens Stripe Customer Portal (cancel subscription, update payment). */
router.post('/create-portal-session', requireAuth, async (req: Request, res: Response): Promise<void> => {
  if (billingNotConfigured(res)) return
  const { user } = req as Request & { user: JwtPayload }

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
    const session = await stripe!.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/dashboard/settings`,
    })
    res.json({ url: session.url })
  } catch (err) {
    console.error('Create portal session error:', err)
    res.status(500).json({ error: 'Failed to open billing portal' })
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
    res.status(501).json({ error: 'Webhook not configured' })
    return
  }
  const sig = req.headers['stripe-signature'] as string | undefined
  if (!sig) {
    res.status(400).json({ error: 'Missing signature' })
    return
  }
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody
  if (!rawBody) {
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
  const priceEnterprise = config.stripe.priceEnterprise || ''

  if (event.type === 'checkout.session.completed' && event.data.object) {
    const session = event.data.object as Stripe.Checkout.Session
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
    const email = session.customer_email || session.customer_details?.email
    if (customerId && email && pool) {
      try {
        await pool.query(
          'UPDATE users SET stripe_customer_id = $1, is_pro = true, is_team = false, updated_at = now() WHERE email = $2',
          [customerId, email.toLowerCase()]
        )
      } catch (err) {
        console.error('Webhook update stripe_customer_id failed:', err)
      }
    }
  }
  function subscriptionTier(sub: Stripe.Subscription): { isPro: boolean; isTeam: boolean } {
    const priceId = sub.items?.data?.[0]?.price?.id ?? ''
    const isTeam = !!priceEnterprise && priceId === priceEnterprise
    const isPro = sub.status === 'active'
    return { isPro, isTeam: isPro && isTeam }
  }
  if (event.type === 'customer.subscription.created' && event.data.object) {
    const sub = event.data.object as Stripe.Subscription
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
    const { isPro, isTeam } = subscriptionTier(sub)
    if (customerId && pool) {
      try {
        await pool.query(
          'UPDATE users SET is_pro = $1, is_team = $2, updated_at = now() WHERE stripe_customer_id = $3',
          [isPro, isTeam, customerId]
        )
      } catch (err) {
        console.error('Webhook subscription.created is_pro/is_team failed:', err)
      }
    }
  }
  if (event.type === 'customer.subscription.updated' && event.data.object) {
    const sub = event.data.object as Stripe.Subscription
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
    const { isPro, isTeam } = subscriptionTier(sub)
    if (customerId && pool) {
      try {
        await pool.query(
          'UPDATE users SET is_pro = $1, is_team = $2, updated_at = now() WHERE stripe_customer_id = $3',
          [isPro, isTeam, customerId]
        )
      } catch (err) {
        console.error('Webhook subscription.updated is_pro/is_team failed:', err)
      }
    }
  }
  if (event.type === 'customer.subscription.deleted' && event.data.object) {
    const sub = event.data.object as Stripe.Subscription
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
    if (customerId && pool) {
      try {
        await pool.query(
          'UPDATE users SET is_pro = false, is_team = false, updated_at = now() WHERE stripe_customer_id = $1',
          [customerId]
        )
      } catch (err) {
        console.error('Webhook subscription.deleted is_pro failed:', err)
      }
    }
  }
  res.json({ received: true })
})

export default router
