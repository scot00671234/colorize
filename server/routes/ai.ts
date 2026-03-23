import { Router, Request, Response } from 'express'
import multer from 'multer'
import { requireAuth } from '../middleware/auth'
import { aiRateLimiter } from '../middleware/rateLimit'
import { insertUsageLog } from '../middleware/usage'
import type { JwtPayload } from '../middleware/auth'
import { config } from '../config'
import { runReplicateImage, type ImageProcessMode } from '../services/replicateImage'

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

function parseMode(raw: unknown): ImageProcessMode | undefined {
  if (raw === 'colorize' || raw === 'restore') return raw
  return undefined
}

function parseWithScratch(raw: unknown): boolean | undefined {
  if (raw === 'true' || raw === true) return true
  if (raw === 'false' || raw === false) return false
  return undefined
}

/**
 * POST /api/ai/process — multipart: field `image` (file), `mode` = colorize | restore,
 * optional `withScratch` = true | false (restore only; default true).
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

  const mode = parseMode(req.body?.mode)
  if (!mode) {
    res.status(400).json({ error: 'Invalid or missing mode. Use colorize or restore.' })
    return
  }

  const scratchOpt = parseWithScratch(req.body?.withScratch)

  try {
    const outputUrl = await runReplicateImage(mode, file.buffer, {
      withScratch: mode === 'restore' ? scratchOpt !== false : undefined,
    })
    await insertUsageLog(user.userId, 'image_process', null)
    res.json({ outputUrl, mode })
  } catch (err) {
    console.error('Replicate image error:', err)
    const message = err instanceof Error ? err.message : 'Image processing failed.'
    res.status(502).json({ error: message })
  }
})

export default router
