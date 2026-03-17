import { Router, Request, Response } from 'express'
import multer from 'multer'
import { pool } from '../db'
import { requireAuth } from '../middleware/auth'
import type { JwtPayload } from '../middleware/auth'
import { uploadBuffer, getSignedReadUrl, isStorageConfigured, deleteObject } from '../services/storage'
import { processJob } from '../services/jobProcessor'
import { randomUUID } from 'crypto'

const PHOTO_LIMIT_STARTER = 50
const PHOTO_LIMIT_PRO = 150
const PHOTO_LIMIT_TEAM = 400

function photoLimitForPlan(plan: string | null, isPro: boolean): number {
  if (plan === 'team') return PHOTO_LIMIT_TEAM
  if (plan === 'pro') return PHOTO_LIMIT_PRO
  if (plan === 'starter') return PHOTO_LIMIT_STARTER
  if (isPro) return PHOTO_LIMIT_PRO // legacy: is_pro but no plan
  return 0
}

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.mimetype)
    cb(null, !!ok)
  },
})

router.use(requireAuth)

/** GET /api/jobs — list current user's photo jobs + photo limit/count */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { user } = req as Request & { user: JwtPayload }
  if (!pool) {
    res.status(503).json({ error: 'Database not configured' })
    return
  }
  try {
    const [jobsResult, userResult] = await Promise.all([
      pool.query(
        `SELECT id, type, status, input_url, output_url, error_message, created_at, updated_at
         FROM photo_jobs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
        [user.userId]
      ),
      pool.query<{ subscription_plan: string | null; is_pro: boolean }>(
        'SELECT subscription_plan, is_pro FROM users WHERE id = $1',
        [user.userId]
      ),
    ])
    const jobs = jobsResult.rows
    const plan = userResult.rows[0]?.subscription_plan ?? null
    const isPro = userResult.rows[0]?.is_pro === true
    const photoLimit = photoLimitForPlan(plan, isPro)
    const photoCount = jobs.length

    if (!isStorageConfigured()) {
      res.json({
        jobs: jobs.map((r: { input_url: string; output_url: string | null }) => ({ ...r, inputUrl: null, outputUrl: null })),
        photoLimit,
        photoCount,
      })
      return
    }
    const withUrls = await Promise.all(
      jobs.map(async (row: { input_url: string; output_url: string | null }) => ({
        ...row,
        inputUrl: row.input_url ? await getSignedReadUrl(row.input_url).catch(() => null) : null,
        outputUrl: row.output_url ? await getSignedReadUrl(row.output_url).catch(() => null) : null,
      }))
    )
    res.json({ jobs: withUrls, photoLimit, photoCount })
  } catch (err) {
    console.error('List jobs error:', err)
    res.status(500).json({ error: 'Failed to load jobs' })
  }
})

/** GET /api/jobs/:id — get one job with signed URLs */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { user } = req as Request & { user: JwtPayload }
  const { id } = req.params
  if (!pool) {
    res.status(503).json({ error: 'Database not configured' })
    return
  }
  try {
    const result = await pool.query(
      `SELECT id, type, status, input_url, output_url, error_message, created_at, updated_at
       FROM photo_jobs WHERE id = $1 AND user_id = $2`,
      [id, user.userId]
    )
    const row = result.rows[0]
    if (!row) {
      res.status(404).json({ error: 'Job not found' })
      return
    }
    let inputUrl: string | null = null
    let outputUrl: string | null = null
    if (isStorageConfigured()) {
      inputUrl = row.input_url ? await getSignedReadUrl(row.input_url).catch(() => null) : null
      outputUrl = row.output_url ? await getSignedReadUrl(row.output_url).catch(() => null) : null
    }
    res.json({
      ...row,
      inputUrl,
      outputUrl,
    })
  } catch (err) {
    console.error('Get job error:', err)
    res.status(500).json({ error: 'Failed to load job' })
  }
})

/** POST /api/jobs — create job (multipart: single image). Uploads to S3, creates pending job. */
router.post(
  '/',
  upload.single('image'),
  async (req: Request, res: Response): Promise<void> => {
    const { user } = req as Request & { user: JwtPayload }
    if (!req.file) {
      res.status(400).json({ error: 'No image file. Send multipart/form-data with field "image".' })
      return
    }
    if (!isStorageConfigured()) {
      res.status(503).json({ error: 'Storage not configured. Set STORAGE_LOCAL_PATH (VPS disk) or STORAGE_* / AWS_* (S3/R2).' })
      return
    }
    if (!pool) {
      res.status(503).json({ error: 'Database not configured' })
      return
    }
    const userRow = await pool.query<{ subscription_plan: string | null; is_pro: boolean }>(
      'SELECT subscription_plan, is_pro FROM users WHERE id = $1',
      [user.userId]
    )
    const plan = userRow.rows[0]?.subscription_plan ?? null
    const isPro = userRow.rows[0]?.is_pro === true
    const limit = photoLimitForPlan(plan, isPro)
    if (limit === 0) {
      res.status(403).json({
        error: 'A subscription is required to upload photos. Upgrade in Settings to get started.',
      })
      return
    }
    const countResult = await pool.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM photo_jobs WHERE user_id = $1',
      [user.userId]
    )
    const count = parseInt(countResult.rows[0]?.count ?? '0', 10)
    if (count >= limit) {
      res.status(403).json({
        error: `Photo limit reached (${limit} photos per plan). Delete some to free space or upgrade in Settings.`,
      })
      return
    }
    const jobId = randomUUID()
    const ext = req.file.mimetype === 'image/png' ? 'png' : req.file.mimetype === 'image/webp' ? 'webp' : 'jpg'
    const key = `uploads/${user.userId}/${jobId}.${ext}`
    try {
      await uploadBuffer(key, req.file.buffer, req.file.mimetype)
    } catch (err) {
      console.error('Upload to storage error:', err)
      res.status(500).json({ error: 'Failed to store image' })
      return
    }
    const type = (req.body?.type as string) === 'restore' ? 'restore' : 'colorize'
    try {
      await pool.query(
        `INSERT INTO photo_jobs (id, user_id, type, input_url, status)
         VALUES ($1, $2, $3, $4, 'pending')`,
        [jobId, user.userId, type, key]
      )
    } catch (err) {
      console.error('Insert job error:', err)
      res.status(500).json({ error: 'Failed to create job' })
      return
    }
    processJob(jobId).catch((err: unknown) => console.error('processJob:', err))
    res.status(201).json({
      id: jobId,
      type,
      status: 'pending',
      inputUrl: await getSignedReadUrl(key).catch(() => null),
      createdAt: new Date().toISOString(),
    })
  }
)

/** DELETE /api/jobs/:id — delete job and its files (frees a slot). */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const { user } = req as Request & { user: JwtPayload }
  const { id } = req.params
  if (!pool) {
    res.status(503).json({ error: 'Database not configured' })
    return
  }
  try {
    const result = await pool.query<{ input_url: string; output_url: string | null }>(
      'SELECT input_url, output_url FROM photo_jobs WHERE id = $1 AND user_id = $2',
      [id, user.userId]
    )
    const row = result.rows[0]
    if (!row) {
      res.status(404).json({ error: 'Job not found' })
      return
    }
    await deleteObject(row.input_url)
    if (row.output_url) await deleteObject(row.output_url)
    await pool.query('DELETE FROM photo_jobs WHERE id = $1 AND user_id = $2', [id, user.userId])
    res.status(204).send()
  } catch (err) {
    console.error('Delete job error:', err)
    res.status(500).json({ error: 'Failed to delete job' })
  }
})

export default router
