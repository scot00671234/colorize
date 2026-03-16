import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { pool } from '../db'
import { config } from '../config'
import { stubEmailService } from '../services/email'
import { buildVerificationEmail } from '../services/email'
import { requireAuth } from '../middleware/auth'
import type { JwtPayload } from '../middleware/auth'

const router = Router()
const emailService = stubEmailService

/** POST /api/auth/register */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string }

  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
    res.status(400).json({ error: 'Email and password are required' })
    return
  }

  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail || password.length < 8) {
    res.status(400).json({ error: 'Invalid email or password (min 8 characters)' })
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
    await emailService.send({ to: normalizedEmail, subject, html, text })

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      email: normalizedEmail,
    })
  } catch (err) {
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

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' })
      return
    }

    if (!user.email_verified_at) {
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

  if (!normalizedEmail) {
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

/** GET /api/auth/me — requires Bearer token */
router.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { user } = req as Request & { user: JwtPayload }
  if (!pool) {
    res.status(503).json({ error: 'Database not configured' })
    return
  }
  try {
    const result = await pool.query(
      'SELECT id, email, email_verified_at, created_at FROM users WHERE id = $1',
      [user.userId]
    )
    const row = result.rows[0]
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
      },
    })
  } catch (err) {
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
    if (stripeSecret) {
      const stripeClient = new stripe(stripeSecret)
      const row = (await pool.query('SELECT stripe_customer_id FROM users WHERE id = $1', [user.userId])).rows[0]
      if (row?.stripe_customer_id) {
        const subs = await stripeClient.subscriptions.list({ customer: row.stripe_customer_id, status: 'active' })
        for (const sub of subs.data) {
          await stripeClient.subscriptions.cancel(sub.id)
        }
      }
    }
    await pool.query('DELETE FROM users WHERE id = $1', [user.userId])
    res.json({ message: 'Account deleted' })
  } catch (err) {
    console.error('Delete account error:', err)
    res.status(500).json({ error: 'Failed to delete account' })
  }
})

export default router
