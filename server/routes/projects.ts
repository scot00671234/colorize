import { Router, Request, Response } from 'express'
import { pool } from '../db'
import { requireAuth } from '../middleware/auth'
import type { JwtPayload } from '../middleware/auth'

const router = Router()

const PROJECT_LIMIT_FREE = 1
const PROJECT_LIMIT_PRO = 10
const PROJECT_LIMIT_TEAM = 100

async function getProjectLimit(userId: string): Promise<number> {
  if (!pool) return PROJECT_LIMIT_FREE
  const r = await pool.query(
    'SELECT is_pro, is_team FROM users WHERE id = $1',
    [userId]
  )
  const row = r.rows[0]
  if (row?.is_team === true) return PROJECT_LIMIT_TEAM
  if (row?.is_pro === true) return PROJECT_LIMIT_PRO
  return PROJECT_LIMIT_FREE
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
      'SELECT id, title, content, created_at, updated_at FROM projects WHERE user_id = $1 ORDER BY updated_at DESC',
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
      'SELECT id, title, content, created_at, updated_at FROM projects WHERE id = $1 AND user_id = $2',
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

/** POST /api/projects — create project (enforce limit) */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { user } = req as Request & { user: JwtPayload }
  const { title } = (req.body as { title?: string }) || {}
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
  try {
    const result = await pool.query(
      `INSERT INTO projects (user_id, title, content) VALUES ($1, $2, '') RETURNING id, title, content, created_at, updated_at`,
      [user.userId, name]
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
  const { title, content } = req.body as { title?: string; content?: string }
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
    values.push(content)
  }
  updates.push(`updated_at = now()`)
  if (updates.length <= 1) {
    res.status(400).json({ error: 'Provide title and/or content to update' })
    return
  }
  values.push(id, user.userId)
  try {
    const result = await pool.query(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = $${pos} AND user_id = $${pos + 1} RETURNING id, title, content, created_at, updated_at`,
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
