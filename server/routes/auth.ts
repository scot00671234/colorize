import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import Stripe from 'stripe'
import { pool } from '../db'
import { config } from '../config'
import { emailService, buildVerificationEmail, buildPasswordResetEmail } from '../services/email'
import { requireAuth } from '../middleware/auth'
import type { JwtPayload } from '../middleware/auth'
import { planFromPriceId, effectivePaidPlan, projectLimitForPlan, colorizeLimitForPlan } from '../planConfig'
import { countImageProcessThisMonth } from '../middleware/usage'

const router = Router()
const stripe = config.stripe.secretKey ? new Stripe(config.stripe.secretKey) : null

const MAX_EMAIL_LENGTH = 254
const MAX_PASSWORD_LENGTH = 256

/** POST /api/auth/register */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string }

  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
    res.status(400).json({ error: 'Email and password are required' })
    return
  }

  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail || normalizedEmail.length > MAX_EMAIL_LENGTH) {
    res.status(400).json({ error: 'Invalid email.' })
    return
  }
  if (password.length < 8 || password.length > MAX_PASSWORD_LENGTH) {
    res.status(400).json({ error: 'Invalid email or password (min 8 characters).' })
    return
  }

  if (!pool) {
    res.status(503).json({ error: 'Database not configured' })
    return
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail]
    )
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'An account with this email already exists' })
      return
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const confirmationToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + config.confirmation.tokenExpiresMinutes * 60 * 1000)

    await pool.query(
      `INSERT INTO users (email, password_hash, confirmation_token, confirmation_token_expires_at, updated_at)
       VALUES ($1, $2, $3, $4, now())`,
      [normalizedEmail, passwordHash, confirmationToken, expiresAt]
    )

    const confirmUrl = `${config.app.baseUrl}/verify-email?token=${confirmationToken}`
    const expiresInHours = Math.round(config.confirmation.tokenExpiresMinutes / 60)
    const { subject, html, text } = buildVerificationEmail({
      email: normalizedEmail,
      confirmUrl,
      expiresInHours,
    })
    try {
      await emailService.send({ to: normalizedEmail, subject, html, text })
    } catch (emailErr) {
      // Account was created; email failed (e.g. Resend: "only testing to your own email" until domain verified)
      console.error('Register: verification email failed (user created). Verify domain in Resend and set RESEND_FROM:', emailErr)
      res.status(201).json({
        message: 'Account created. We couldn\'t send the verification email yet. Use "Resend verification email" on the sign-up page or contact support.',
        email: normalizedEmail,
      })
      return
    }

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      email: normalizedEmail,
    })
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code
    if (code === '23505') {
      res.status(409).json({ error: 'An account with this email already exists' })
      return
    }
    console.error('Register error:', err)
    res.status(500).json({ error: 'Registration failed' })
  }
})

/** POST /api/auth/login */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string }

  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
    res.status(400).json({ error: 'Email and password are required' })
    return
  }

  const normalizedEmail = email.trim().toLowerCase()
  if (normalizedEmail.length > MAX_EMAIL_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    res.status(400).json({ error: 'Invalid email or password' })
    return
  }
  if (!pool) {
    res.status(503).json({ error: 'Database not configured' })
    return
  }

  try {
    const result = await pool.query(
      'SELECT id, email, password_hash, email_verified_at FROM users WHERE email = $1',
      [normalizedEmail]
    )
    const user = result.rows[0]
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' })
      return
    }

    if (user.password_hash == null) {
      res.status(400).json({
        error: 'This account uses Google sign-in. Use the "Continue with Google" button.',
        code: 'USE_GOOGLE',
      })
      return
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' })
      return
    }

    if (!user.email_verified_at && !config.dev.allowLoginWithoutVerification) {
      res.status(403).json({
        error: 'Please verify your email before signing in.',
        code: 'EMAIL_NOT_VERIFIED',
      })
      return
    }

    const payload: JwtPayload = { userId: user.id, email: user.email }
    const token = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn })

    res.json({ token, user: { id: user.id, email: user.email } })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Login failed' })
  }
})

/** GET /api/auth/google — redirect to Google OAuth. Query: returnTo (optional path, e.g. /dashboard). */
router.get('/google', (req: Request, res: Response): void => {
  if (!config.google.clientId || !config.google.clientSecret) {
    res.status(501).json({ error: 'Google sign-in is not configured' })
    return
  }
  const returnTo = typeof req.query.returnTo === 'string' && req.query.returnTo.startsWith('/')
    ? req.query.returnTo
    : '/dashboard'
  const redirectUri = `${config.app.apiBaseUrl}/api/auth/google/callback`
  const state = Buffer.from(JSON.stringify({ returnTo }), 'utf8').toString('base64url')
  const scope = 'openid email profile'
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', config.google.clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', scope)
  url.searchParams.set('state', state)
  res.redirect(302, url.toString())
})

/** GET /api/auth/google/callback — exchange code for user, issue JWT, redirect to app. */
router.get('/google/callback', async (req: Request, res: Response): Promise<void> => {
  if (!config.google.clientId || !config.google.clientSecret || !pool) {
    res.redirect(302, `${config.app.baseUrl}/login?error=config`)
    return
  }
  const code = typeof req.query.code === 'string' ? req.query.code : null
  const stateRaw = typeof req.query.state === 'string' ? req.query.state : null
  let returnTo = '/dashboard'
  if (stateRaw) {
    try {
      const state = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8'))
      if (state.returnTo && typeof state.returnTo === 'string' && state.returnTo.startsWith('/')) {
        returnTo = state.returnTo
      }
    } catch {
      /* ignore */
    }
  }

  if (!code) {
    res.redirect(302, `${config.app.baseUrl}/login?error=no_code`)
    return
  }

  const redirectUri = `${config.app.apiBaseUrl}/api/auth/google/callback`
  let accessToken: string
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      console.error('Google token exchange failed:', tokenRes.status, errText)
      res.redirect(302, `${config.app.baseUrl}/login?error=token`)
      return
    }
    const tokenData = (await tokenRes.json()) as { access_token?: string }
    accessToken = tokenData.access_token
    if (!accessToken) {
      res.redirect(302, `${config.app.baseUrl}/login?error=token`)
      return
    }
  } catch (err) {
    console.error('Google token exchange error:', err)
    res.redirect(302, `${config.app.baseUrl}/login?error=token`)
    return
  }

  let email: string
  let googleId: string
  try {
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!userRes.ok) {
      console.error('Google userinfo failed:', userRes.status)
      res.redirect(302, `${config.app.baseUrl}/login?error=userinfo`)
      return
    }
    const profile = (await userRes.json()) as { id?: string; email?: string }
    googleId = profile.id
    email = (profile.email || '').trim().toLowerCase()
    if (!googleId || !email) {
      res.redirect(302, `${config.app.baseUrl}/login?error=profile`)
      return
    }
  } catch (err) {
    console.error('Google userinfo error:', err)
    res.redirect(302, `${config.app.baseUrl}/login?error=userinfo`)
    return
  }

  try {
    let user: { id: string; email: string }
    const byGoogle = await pool.query(
      'SELECT id, email FROM users WHERE google_id = $1',
      [googleId]
    )
    if (byGoogle.rows.length > 0) {
      user = byGoogle.rows[0]
    } else {
      const byEmail = await pool.query(
        'SELECT id, email FROM users WHERE email = $1',
        [email]
      )
      if (byEmail.rows.length > 0) {
        await pool.query(
          'UPDATE users SET google_id = $1, updated_at = now() WHERE id = $2',
          [googleId, byEmail.rows[0].id]
        )
        user = byEmail.rows[0]
      } else {
        const insert = await pool.query(
          `INSERT INTO users (email, google_id, email_verified_at, updated_at)
           VALUES ($1, $2, now(), now())
           RETURNING id, email`,
          [email, googleId]
        )
        user = insert.rows[0]
      }
    }

    const payload: JwtPayload = { userId: user.id, email: user.email }
    const token = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn })
    const path = returnTo.startsWith('/') ? returnTo : `/${returnTo}`
    const base = config.app.baseUrl.replace(/\/$/, '')
    const redirectUrl = new URL(path, `${base}/`)
    redirectUrl.searchParams.set('token', token)
    res.redirect(302, redirectUrl.toString())
  } catch (err) {
    console.error('Google callback DB error:', err)
    res.redirect(302, `${config.app.baseUrl}/login?error=server`)
  }
})

/** GET /api/auth/verify-email?token=... */
router.get('/verify-email', async (req: Request, res: Response): Promise<void> => {
  const token = req.query.token as string | undefined
  if (!token?.trim()) {
    res.status(400).json({ error: 'Confirmation token is required' })
    return
  }

  if (!pool) {
    res.status(503).json({ error: 'Database not configured' })
    return
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET email_verified_at = now(), confirmation_token = NULL, confirmation_token_expires_at = NULL, updated_at = now()
       WHERE confirmation_token = $1 AND confirmation_token_expires_at > now()
       RETURNING id, email`,
      [token.trim()]
    )
    if (result.rows.length === 0) {
      res.status(400).json({ error: 'Invalid or expired confirmation link' })
      return
    }

    res.json({ message: 'Email verified. You can now sign in.', email: result.rows[0].email })
  } catch (err) {
    console.error('Verify email error:', err)
    res.status(500).json({ error: 'Verification failed' })
  }
})

/** POST /api/auth/resend-verification */
router.post('/resend-verification', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body as { email?: string }
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

  if (!normalizedEmail || normalizedEmail.length > MAX_EMAIL_LENGTH) {
    res.status(400).json({ error: 'Email is required' })
    return
  }

  if (!pool) {
    res.status(503).json({ error: 'Database not configured' })
    return
  }

  try {
    const result = await pool.query(
      'SELECT id, email_verified_at FROM users WHERE email = $1',
      [normalizedEmail]
    )
    const user = result.rows[0]
    if (!user) {
      res.status(404).json({ error: 'No account found with this email' })
      return
    }
    if (user.email_verified_at) {
      res.status(400).json({ error: 'Email is already verified' })
      return
    }

    const confirmationToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + config.confirmation.tokenExpiresMinutes * 60 * 1000)

    await pool.query(
      `UPDATE users SET confirmation_token = $1, confirmation_token_expires_at = $2, updated_at = now() WHERE id = $3`,
      [confirmationToken, expiresAt, user.id]
    )

    const confirmUrl = `${config.app.baseUrl}/verify-email?token=${confirmationToken}`
    const expiresInHours = Math.round(config.confirmation.tokenExpiresMinutes / 60)
    const { subject, html, text } = buildVerificationEmail({
      email: normalizedEmail,
      confirmUrl,
      expiresInHours,
    })
    await emailService.send({ to: normalizedEmail, subject, html, text })

    res.json({ message: 'Verification email sent. Please check your inbox.' })
  } catch (err) {
    console.error('Resend verification error:', err)
    res.status(500).json({ error: 'Failed to send verification email' })
  }
})

/** POST /api/auth/forgot-password — request password reset email (does not reveal if email exists). */
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body as { email?: string }
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

  if (!normalizedEmail || normalizedEmail.length > MAX_EMAIL_LENGTH) {
    res.status(400).json({ error: 'Email is required' })
    return
  }

  if (!pool) {
    res.status(503).json({ error: 'Database not configured' })
    return
  }

  try {
    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail]
    )
    const user = result.rows[0]
    if (!user) {
      res.json({ message: 'If an account exists with this email, you will receive a password reset link.' })
      return
    }

    const resetToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + config.passwordReset.tokenExpiresMinutes * 60 * 1000)

    await pool.query(
      `UPDATE users SET password_reset_token = $1, password_reset_token_expires_at = $2, updated_at = now() WHERE id = $3`,
      [resetToken, expiresAt, user.id]
    )

    const resetUrl = `${config.app.baseUrl}/reset-password?token=${resetToken}`
    const expiresInHours = Math.max(1, Math.round(config.passwordReset.tokenExpiresMinutes / 60))
    const { subject, html, text } = buildPasswordResetEmail({ resetUrl, expiresInHours })
    try {
      await emailService.send({ to: normalizedEmail, subject, html, text })
    } catch (emailErr) {
      await pool.query(
        'UPDATE users SET password_reset_token = NULL, password_reset_token_expires_at = NULL, updated_at = now() WHERE id = $1',
        [user.id]
      )
      console.error('Forgot password: email failed:', emailErr)
      res.status(500).json({ error: 'Failed to send reset email. Please try again later.' })
      return
    }

    res.json({ message: 'If an account exists with this email, you will receive a password reset link.' })
  } catch (err) {
    console.error('Forgot password error:', err)
    res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
})

/** POST /api/auth/reset-password — set new password using token from email. */
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  const { token, newPassword } = req.body as { token?: string; newPassword?: string }

  if (!token?.trim() || !newPassword || typeof newPassword !== 'string') {
    res.status(400).json({ error: 'Token and new password are required' })
    return
  }

  if (newPassword.length < 8 || newPassword.length > MAX_PASSWORD_LENGTH) {
    res.status(400).json({ error: 'Password must be at least 8 characters' })
    return
  }

  if (!pool) {
    res.status(503).json({ error: 'Database not configured' })
    return
  }

  try {
    const result = await pool.query(
      `SELECT id FROM users
       WHERE password_reset_token = $1 AND password_reset_token_expires_at > now()`,
      [token.trim()]
    )
    if (result.rows.length === 0) {
      res.status(400).json({ error: 'Invalid or expired reset link. Request a new one.' })
      return
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await pool.query(
      `UPDATE users
       SET password_hash = $1, password_reset_token = NULL, password_reset_token_expires_at = NULL, updated_at = now()
       WHERE id = $2`,
      [passwordHash, result.rows[0].id]
    )

    res.json({ message: 'Password reset successfully. You can now sign in.' })
  } catch (err) {
    console.error('Reset password error:', err)
    res.status(500).json({ error: 'Failed to reset password' })
  }
})

/** GET /api/auth/me — requires Bearer token */
router.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { user } = req as Request & { user: JwtPayload }
  if (!pool) {
    res.status(503).json({ error: 'Database not configured' })
    return
  }
  try {
    const userResult = await pool.query(
      `SELECT id, email, email_verified_at, created_at, is_pro, COALESCE(is_team, false) AS is_team,
              subscription_plan, stripe_customer_id
       FROM users WHERE id = $1`,
      [user.userId]
    )
    const row = userResult.rows[0]
    if (!row) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    let isPro = row.is_pro === true
    let isTeam = row.is_team === true
    let subscriptionPlan: string | null =
      typeof row.subscription_plan === 'string' && row.subscription_plan.trim()
        ? row.subscription_plan.trim().toLowerCase()
        : null
    let stripeCustomerId = typeof row.stripe_customer_id === 'string' ? row.stripe_customer_id : null

    // Fallback sync: if webhook is delayed/missed in production, keep plan state accurate
    // by reconciling from Stripe at /me time.
    if (stripe) {
      try {
        async function syncFromStripeCustomerId(
          customerId: string
        ): Promise<{ isPro: boolean; isTeam: boolean; subscriptionPlan: string | null } | null> {
          const subscriptions = await stripe!.subscriptions.list({
            customer: customerId,
            status: 'all',
            limit: 20,
          })
          const activeSubs = subscriptions.data.filter((s) => s.status === 'active' || s.status === 'trialing')
          if (activeSubs.length === 0) {
            return { isPro: false, isTeam: false, subscriptionPlan: null }
          }
          for (const s of activeSubs) {
            const priceId = s.items?.data?.[0]?.price?.id
            const pid = typeof priceId === 'string' ? priceId : undefined
            const paid = planFromPriceId(pid)
            if (paid) {
              return {
                isPro: true,
                isTeam: paid === 'studio',
                subscriptionPlan: paid,
              }
            }
          }
          return { isPro: true, isTeam: false, subscriptionPlan: null }
        }

        async function syncFromEmail(email: string): Promise<void> {
          const customers = await stripe!.customers.list({ email, limit: 1 })
          const customer = customers.data[0]
          if (!customer?.id) return
          const nextTier = await syncFromStripeCustomerId(customer.id)
          if (!nextTier) return

          if (
            customer.id !== stripeCustomerId ||
            nextTier.isPro !== isPro ||
            nextTier.isTeam !== isTeam ||
            nextTier.subscriptionPlan !== subscriptionPlan
          ) {
            console.log('[auth/me] syncing from Stripe customer by email', {
              userId: row.id,
              email,
              old: { stripeCustomerId, isPro, isTeam, subscriptionPlan },
              next: {
                stripeCustomerId: customer.id,
                isPro: nextTier.isPro,
                isTeam: nextTier.isTeam,
                subscriptionPlan: nextTier.subscriptionPlan,
              },
            })
            await pool.query(
              'UPDATE users SET stripe_customer_id = $1, is_pro = $2, is_team = $3, subscription_plan = $4, updated_at = now() WHERE id = $5',
              [customer.id, nextTier.isPro, nextTier.isTeam, nextTier.subscriptionPlan, row.id],
            )
            stripeCustomerId = customer.id
            isPro = nextTier.isPro
            isTeam = nextTier.isTeam
            subscriptionPlan = nextTier.subscriptionPlan
          }
        }

        if (stripeCustomerId) {
          const nextTier = await syncFromStripeCustomerId(stripeCustomerId)
          if (
            nextTier &&
            (nextTier.isPro !== isPro ||
              nextTier.isTeam !== isTeam ||
              nextTier.subscriptionPlan !== subscriptionPlan)
          ) {
            console.log('[auth/me] syncing plan flags from Stripe', {
              userId: row.id,
              stripeCustomerId,
              old: { isPro, isTeam, subscriptionPlan },
              next: {
                isPro: nextTier.isPro,
                isTeam: nextTier.isTeam,
                subscriptionPlan: nextTier.subscriptionPlan,
              },
            })
            await pool.query(
              'UPDATE users SET is_pro = $1, is_team = $2, subscription_plan = $3, updated_at = now() WHERE id = $4',
              [nextTier.isPro, nextTier.isTeam, nextTier.subscriptionPlan, row.id],
            )
            isPro = nextTier.isPro
            isTeam = nextTier.isTeam
            subscriptionPlan = nextTier.subscriptionPlan
          }
        } else {
          await syncFromEmail(row.email)
        }
      } catch (stripeSyncErr) {
        console.warn('[auth/me] stripe sync failed:', stripeSyncErr)
      }
    }
    const effectivePlan = effectivePaidPlan(subscriptionPlan, isPro, isTeam)
    const projectLimit = projectLimitForPlan(effectivePlan)
    const colorizeLimitMonthly = colorizeLimitForPlan(effectivePlan)
    const colorizeUsedThisMonth = await countImageProcessThisMonth(user.userId)
    console.log('[auth/me] responding with plan', {
      userId: row.id,
      isPro,
      isTeam,
      subscriptionPlan,
      effectivePlan,
      projectLimit,
      colorizeLimitMonthly,
      colorizeUsedThisMonth,
      stripeCustomerIdPresent: !!stripeCustomerId,
    })
    res.json({
      user: {
        id: row.id,
        email: row.email,
        emailVerified: !!row.email_verified_at,
        createdAt: row.created_at,
        isPro: !!isPro,
        isTeam: !!isTeam,
        subscriptionPlan: effectivePlan,
        projectLimit,
        colorizeLimitMonthly,
        colorizeUsedThisMonth,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('is_pro') || msg.includes('is_team') || msg.includes('subscription_plan') || msg.includes('usage_logs') || msg.includes('column') || msg.includes('relation')) {
      try {
        const fallback = await pool.query(
          'SELECT id, email, email_verified_at, created_at FROM users WHERE id = $1',
          [user.userId]
        )
        const row = fallback.rows[0]
        if (!row) {
          res.status(404).json({ error: 'User not found' })
          return
        }
        res.json({
          user: {
            id: row.id,
            email: row.email,
            emailVerified: !!row.email_verified_at,
            createdAt: row.created_at,
            isPro: false,
            isTeam: false,
            subscriptionPlan: null,
            projectLimit: 1,
            colorizeLimitMonthly: 0,
            colorizeUsedThisMonth: 0,
          },
        })
        return
      } catch {
        /* fall through to 500 */
      }
    }
    console.error('Me error:', err)
    res.status(500).json({ error: 'Failed to load user' })
  }
})

/** DELETE /api/auth/account — requires Bearer token. Cancels Stripe subscription if any, then deletes user. */
router.delete('/account', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { user } = req as Request & { user: JwtPayload }
  if (!pool) {
    res.status(503).json({ error: 'Database not configured' })
    return
  }
  try {
    const stripe = await import('stripe').then((m) => m.default)
    const stripeSecret = process.env.STRIPE_SECRET_KEY
    const row = (
      await pool.query('SELECT stripe_customer_id, email FROM users WHERE id = $1', [user.userId])
    ).rows[0]
    if (!row) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    let cancelErrors: unknown[] = []

    if (stripeSecret) {
      const stripeClient = new stripe(stripeSecret)

      const customerIds = new Set<string>()
      if (typeof row.stripe_customer_id === 'string' && row.stripe_customer_id.trim()) {
        customerIds.add(row.stripe_customer_id.trim())
      }
      if (typeof row.email === 'string' && row.email.trim()) {
        try {
          const customers = await stripeClient.customers.list({ email: row.email.trim(), limit: 5 })
          for (const c of customers.data) {
            if (c?.id) customerIds.add(c.id)
          }
        } catch (e) {
          cancelErrors.push(e)
        }
      }

      for (const customerId of customerIds) {
        // "all" lets us cover active + trialing + past_due, etc. We'll cancel only if not already canceled.
        const subs = await stripeClient.subscriptions.list({ customer: customerId, status: 'all', limit: 20 })
        const billableStatuses = new Set(['active', 'trialing', 'past_due', 'unpaid'])
        const subsToCancel = subs.data.filter((s) => s && s.id && billableStatuses.has((s.status as string) || ''))

        for (const sub of subsToCancel) {
          try {
            await stripeClient.subscriptions.cancel(sub.id)
          } catch (e) {
            cancelErrors.push(e)
          }
        }
      }
    } else {
      // Stripe is not configured; deletion should still work, but cancellation cannot be guaranteed.
      cancelErrors.push(new Error('STRIPE_SECRET_KEY missing'))
    }

    // usage_logs.user_id references users(id) without ON DELETE CASCADE.
    // Delete dependents first so the user row can be removed successfully.
    await pool.query('DELETE FROM usage_logs WHERE user_id = $1', [user.userId])
    await pool.query('DELETE FROM users WHERE id = $1', [user.userId])

    // If cancellations failed, surface it as a warning (still succeed delete).
    if (cancelErrors.length) {
      console.warn('[delete-account] completed user delete, but subscription cancellation had errors', cancelErrors)
      res.json({ message: 'Account deleted', warning: 'Subscriptions may not have been cancelled' })
      return
    }

    res.json({ message: 'Account deleted' })
  } catch (err) {
    console.error('Delete account error:', err)
    res.status(500).json({ error: 'Failed to delete account' })
  }
})

export default router
