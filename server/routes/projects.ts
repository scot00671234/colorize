/**
 * Saved projects per user (`projects` table).
 * Column `job_description` is legacy naming — stores optional text context for the project (not job-specific).
 */
import { Router, Request, Response } from 'express'
import { pool } from '../db'
import { requireAuth } from '../middleware/auth'
import type { JwtPayload } from '../middleware/auth'
import { effectivePaidPlan, projectLimitForPlan } from '../planConfig'

const router = Router()

const PROJECT_LIMIT_FALLBACK = 1
/** Max stored JSON / HTML per project (colorize payloads may include a downscaled original). */
const MAX_PROJECT_CONTENT_CHARS = 2_500_000

async function getProjectLimit(userId: string): Promise<number> {
  if (!pool) return PROJECT_LIMIT_FALLBACK
  try {
    const r = await pool.query(
      'SELECT subscription_plan, is_pro, is_team FROM users WHERE id = $1',
      [userId]
    )
    const row = r.rows[0]
    const plan = effectivePaidPlan(
      typeof row?.subscription_plan === 'string' ? row.subscription_plan : null,
      row?.is_pro === true,
      row?.is_team === true
    )
    return projectLimitForPlan(plan)
  } catch {
    return PROJECT_LIMIT_FALLBACK
  }
}

router.use(requireAuth)

/** GET /api/projects — list current user's projects */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { user } = req as Request & { user: JwtPayload }
  if (!pool) {
    res.status(503).json({ error: 'Database not configured' })
    return
  }
  try {
    const result = await pool.query(
      'SELECT id, title, content, job_description, created_at, updated_at FROM projects WHERE user_id = $1 ORDER BY updated_at DESC',
      [user.userId]
    )
    res.json({ projects: result.rows })
  } catch (err) {
    console.error('List projects error:', err)
    res.status(500).json({ error: 'Failed to load projects' })
  }
})

/** GET /api/projects/:id — get one project */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { user } = req as Request & { user: JwtPayload }
  const { id } = req.params
  if (!pool) {
    res.status(503).json({ error: 'Database not configured' })
    return
  }
  try {
    const result = await pool.query(
      'SELECT id, title, content, job_description, created_at, updated_at FROM projects WHERE id = $1 AND user_id = $2',
      [id, user.userId]
    )
    const row = result.rows[0]
    if (!row) {
      res.status(404).json({ error: 'Project not found' })
      return
    }
    res.json(row)
  } catch (err) {
    console.error('Get project error:', err)
    res.status(500).json({ error: 'Failed to load project' })
  }
})

/** POST /api/projects — create project (enforce limit); optional `content` for workspace payloads */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { user } = req as Request & { user: JwtPayload }
  const { title, content: bodyContent } = (req.body as { title?: string; content?: string }) || {}
  if (!pool) {
    res.status(503).json({ error: 'Database not configured' })
    return
  }
  const limit = await getProjectLimit(user.userId)
  const countResult = await pool.query(
    'SELECT COUNT(*)::int AS c FROM projects WHERE user_id = $1',
    [user.userId]
  )
  const count = countResult.rows[0]?.c ?? 0
  if (count >= limit) {
    res.status(403).json({
      error: `Project limit reached (${limit} for your plan). Upgrade to add more projects.`,
    })
    return
  }
  const name = typeof title === 'string' && title.trim() ? title.trim().slice(0, 255) : 'Untitled'
  const content =
    typeof bodyContent === 'string' ? bodyContent.slice(0, MAX_PROJECT_CONTENT_CHARS) : ''
  try {
    const result = await pool.query(
      `INSERT INTO projects (user_id, title, content, job_description) VALUES ($1, $2, $3, '') RETURNING id, title, content, job_description, created_at, updated_at`,
      [user.userId, name, content]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('Create project error:', err)
    res.status(500).json({ error: 'Failed to create project' })
  }
})

/** PATCH /api/projects/:id — update title and/or content */
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  const { user } = req as Request & { user: JwtPayload }
  const { id } = req.params
  const { title, content, jobDescription } = req.body as {
    title?: string
    content?: string
    jobDescription?: string
  }
  if (!pool) {
    res.status(503).json({ error: 'Database not configured' })
    return
  }
  const updates: string[] = []
  const values: unknown[] = []
  let pos = 1
  if (typeof title === 'string') {
    updates.push(`title = $${pos++}`)
    values.push(title.trim().slice(0, 255))
  }
  if (typeof content === 'string') {
    updates.push(`content = $${pos++}`)
    values.push(content.slice(0, MAX_PROJECT_CONTENT_CHARS))
  }
  if (typeof jobDescription === 'string') {
    updates.push(`job_description = $${pos++}`)
    values.push(jobDescription.slice(0, 100_000))
  }
  updates.push(`updated_at = now()`)
  if (updates.length <= 1) {
    res.status(400).json({ error: 'Provide title, content, and/or jobDescription to update' })
    return
  }
  values.push(id, user.userId)
  try {
    const result = await pool.query(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = $${pos} AND user_id = $${pos + 1} RETURNING id, title, content, job_description, created_at, updated_at`,
      values
    )
    const row = result.rows[0]
    if (!row) {
      res.status(404).json({ error: 'Project not found' })
      return
    }
    res.json(row)
  } catch (err) {
    console.error('Update project error:', err)
    res.status(500).json({ error: 'Failed to update project' })
  }
})

/** DELETE /api/projects/:id */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const { user } = req as Request & { user: JwtPayload }
  const { id } = req.params
  if (!pool) {
    res.status(503).json({ error: 'Database not configured' })
    return
  }
  try {
    const result = await pool.query(
      'DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, user.userId]
    )
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Project not found' })
      return
    }
    res.status(204).send()
  } catch (err) {
    console.error('Delete project error:', err)
    res.status(500).json({ error: 'Failed to delete project' })
  }
})

export default router
