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
  const priceId = plan === 'enterprise' ? config.stripe.priceEnterprise : config.stripe.pricePro
  if (!priceId) {
    res.status(400).json({ error: 'Invalid plan or Stripe price not configured. Set STRIPE_PRICE_PRO or STRIPE_PRICE_ENTERPRISE.' })
    return
  }

  try {
    const baseUrl = config.app.baseUrl
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
    res.status(500).json({ error: 'Failed to create checkout session' })
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
  if (event.type === 'checkout.session.completed' && event.data.object) {
    const session = event.data.object as Stripe.Checkout.Session
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
    const email = session.customer_email || session.customer_details?.email
    if (customerId && email && pool) {
      try {
        await pool.query(
          'UPDATE users SET stripe_customer_id = $1, updated_at = now() WHERE email = $2',
          [customerId, email.toLowerCase()]
        )
      } catch (err) {
        console.error('Webhook update stripe_customer_id failed:', err)
      }
    }
  }
  res.json({ received: true })
})
