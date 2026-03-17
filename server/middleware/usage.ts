import { Request, Response, NextFunction } from 'express'
import { pool } from '../db'
import type { JwtPayload } from './auth'
import {
  isLockedOut,
  setLockout,
  isSuspended,
  setSuspended,
  getLockoutRemaining,
  recordJobDescHash,
  hashJobDesc,
} from '../services/jobDescCache'

const DAILY_CAP_FREE = 2
const DAILY_CAP_PRO = 500
const REWRITE_BURST_WINDOW_MS = 60 * 1000
const REWRITE_BURST_MAX = 20
const DAILY_REWRITE_SUSPEND = 1000

export type ActionType = 'rewrite' | 'summary' | 'score' | 'export'

/** Check rewrite limits: daily cap, burst, suspend. Call after requireAuth. */
export async function checkRewriteLimits(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { user } = req as Request & { user: JwtPayload }
  const userId = user.userId

  if (isSuspended(userId)) {
    res.status(403).json({ error: 'Account paused—contact support.' })
    return
  }
  if (isLockedOut(userId)) {
    const sec = getLockoutRemaining(userId)
    res.status(429).set('Retry-After', String(sec)).json({ error: 'Slow down—optimizing for quality.' })
    return
  }

  if (!pool) {
    res.status(503).json({ error: 'Service unavailable' })
    return
  }

  try {
    const [userRow, dailyCount, burstCount] = await Promise.all([
      pool.query('SELECT is_pro, suspended_at FROM users WHERE id = $1', [userId]),
      pool.query(
        `SELECT COUNT(*)::int AS c FROM usage_logs WHERE user_id = $1 AND action_type IN ('rewrite', 'summary') AND timestamp > now() - interval '24 hours'`,
        [userId]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS c FROM usage_logs WHERE user_id = $1 AND action_type IN ('rewrite', 'summary') AND timestamp > now() - interval '60 seconds'`,
        [userId]
      ),
    ])

    const isPro = userRow.rows[0]?.is_pro === true
    const suspendedAt = userRow.rows[0]?.suspended_at
    if (suspendedAt) {
      res.status(403).json({ error: 'Account paused—contact support.' })
      return
    }

    const daily = dailyCount.rows[0]?.c ?? 0
    const burst = burstCount.rows[0]?.c ?? 0
    const cap = isPro ? DAILY_CAP_PRO : DAILY_CAP_FREE

    if (daily >= cap) {
      res.status(429).json({ error: 'Daily rewrite limit reached.' })
      return
    }
    if (burst >= REWRITE_BURST_MAX) {
      setLockout(userId)
      res.status(429).set('Retry-After', '300').json({ error: 'Slow down—optimizing for quality.' })
      return
    }
    if (daily >= DAILY_REWRITE_SUSPEND) {
      await pool.query('UPDATE users SET suspended_at = now() WHERE id = $1', [userId])
      setSuspended(userId)
      res.status(403).json({ error: 'Account paused—contact support.' })
      return
    }

    next()
  } catch (err) {
    console.error('checkRewriteLimits:', err)
    res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}

/** Check job-desc cooldown for score (same hash >10 in 24h). Optionally pass jobDescription in body. */
export function checkScoreCooldown(req: Request, res: Response, next: NextFunction): void {
  const { user } = req as Request & { user: JwtPayload }
  const jobDescription = (req.body as { jobDescription?: string })?.jobDescription
  if (!jobDescription || typeof jobDescription !== 'string') {
    next()
    return
  }
  const hash = hashJobDesc(jobDescription)
  const { cooldown } = recordJobDescHash(user.userId, hash)
  if (cooldown) {
    res.status(429).set('Retry-After', '30').json({ error: 'Too many requests with the same job description. Please wait 30 seconds.' })
    return
  }
  next()
}

/** Insert a usage_log row. Call from route handler after success. */
export async function insertUsageLog(
  userId: string,
  actionType: ActionType,
  tokensUsed: number | null
): Promise<void> {
  if (!pool) return
  try {
    await pool.query(
      'INSERT INTO usage_logs (user_id, action_type, tokens_used) VALUES ($1, $2, $3)',
      [userId, actionType, tokensUsed]
    )
  } catch (err) {
    console.error('insertUsageLog:', err)
  }
}
