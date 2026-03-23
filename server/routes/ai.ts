import { Router, Request, Response } from 'express'
import multer from 'multer'
import { requireAuth } from '../middleware/auth'
import { aiRateLimiter } from '../middleware/rateLimit'
import { insertUsageLog, countImageProcessThisMonth } from '../middleware/usage'
import type { JwtPayload } from '../middleware/auth'
import { config } from '../config'
import { pool } from '../db'
import { effectivePaidPlan, colorizeLimitForPlan } from '../planConfig'
import { runReplicateColorize } from '../services/replicateImage'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype)) {
      cb(null, true)
      return
    }
    cb(new Error('Only JPEG, PNG, WebP, or GIF images are allowed.'))
  },
})

const router = Router()

router.use(aiRateLimiter)
router.use(requireAuth)

/**
 * POST /api/ai/process — multipart: field `image` (file), colorize only.
 */
router.post('/process', (req, res, next) => {
  upload.single('image')(req, res, (err: unknown) => {
    if (err) {
      const msg = err instanceof Error ? err.message : 'Invalid upload'
      res.status(400).json({ error: msg })
      return
    }
    next()
  })
}, async (req: Request, res: Response): Promise<void> => {
  const { user } = req as Request & { user: JwtPayload }

  if (!config.replicate?.apiToken) {
    res.status(503).json({ error: 'Image processing is not configured. Set REPLICATE_API_TOKEN.' })
    return
  }

  const file = req.file
  if (!file?.buffer) {
    res.status(400).json({ error: 'Missing image file (field name: image).' })
    return
  }

  if (!pool) {
    res.status(503).json({ error: 'Database not configured' })
    return
  }

  try {
    const u = await pool.query(
      'SELECT subscription_plan, is_pro, is_team FROM users WHERE id = $1',
      [user.userId]
    )
    const row = u.rows[0]
    const plan = effectivePaidPlan(
      typeof row?.subscription_plan === 'string' ? row.subscription_plan : null,
      row?.is_pro === true,
      row?.is_team === true
    )
    if (!plan) {
      res.status(402).json({
        error:
          'Subscribe to a plan to colorize images. Open Settings to choose Starter, Pro, or Studio.',
        code: 'SUBSCRIPTION_REQUIRED',
      })
      return
    }
    const monthlyLimit = colorizeLimitForPlan(plan)
    const used = await countImageProcessThisMonth(user.userId)
    if (used >= monthlyLimit) {
      res.status(402).json({
        error:
          'You have reached your monthly colorization limit for your plan. Upgrade in Settings or try again next billing month.',
        code: 'USAGE_LIMIT',
      })
      return
    }

    const outputUrl = await runReplicateColorize(file.buffer)
    await insertUsageLog(user.userId, 'image_process', null)
    res.json({ outputUrl, mode: 'colorize' })
  } catch (err) {
    console.error('Replicate image error:', err)
    const message = err instanceof Error ? err.message : 'Image processing failed.'
    res.status(502).json({ error: message })
  }
})

export default router
