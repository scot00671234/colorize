import { Router, Request, Response } from 'express'
import multer from 'multer'
import { pool } from '../db'
import { requireAuth } from '../middleware/auth'
import type { JwtPayload } from '../middleware/auth'
import { uploadBuffer, getSignedReadUrl, isStorageConfigured } from '../services/storage'
import { processJob } from '../services/jobProcessor'
import { randomUUID } from 'crypto'

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

/** GET /api/jobs — list current user's photo jobs */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { user } = req as Request & { user: JwtPayload }
  if (!pool) {
    res.status(503).json({ error: 'Database not configured' })
    return
  }
  try {
    const result = await pool.query(
      `SELECT id, type, status, input_url, output_url, error_message, created_at, updated_at
       FROM photo_jobs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [user.userId]
    )
    const jobs = result.rows
    if (!isStorageConfigured()) {
      res.json({ jobs: jobs.map((r: { input_url: string; output_url: string | null }) => ({ ...r, inputUrl: null, outputUrl: null })) })
      return
    }
    const withUrls = await Promise.all(
      jobs.map(async (row: { input_url: string; output_url: string | null }) => ({
        ...row,
        inputUrl: row.input_url ? await getSignedReadUrl(row.input_url).catch(() => null) : null,
        outputUrl: row.output_url ? await getSignedReadUrl(row.output_url).catch(() => null) : null,
      }))
    )
    res.json({ jobs: withUrls })
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
      res.status(503).json({ error: 'Storage not configured. Set STORAGE_* or AWS_* env vars.' })
      return
    }
    if (!pool) {
      res.status(503).json({ error: 'Database not configured' })
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
    processJob(jobId).catch((e) => console.error('processJob:', e))
    res.status(201).json({
      id: jobId,
      type,
      status: 'pending',
      inputUrl: await getSignedReadUrl(key).catch(() => null),
      createdAt: new Date().toISOString(),
    })
  }
)

export default router
