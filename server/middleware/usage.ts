import { pool } from '../db'

export type ActionType = 'export' | 'image_process'

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

/** Calendar month in the database session timezone (use UTC DB/session for consistent billing). */
export async function countImageProcessThisMonth(userId: string): Promise<number> {
  if (!pool) return 0
  try {
    // Column is `timestamp` per migration 002 (`created_at` was wrong and made COUNT always error → 0).
    const r = await pool.query(
      `SELECT COUNT(*)::int AS c FROM usage_logs
       WHERE user_id = $1 AND action_type = 'image_process'
       AND "timestamp" >= date_trunc('month', now())`,
      [userId]
    )
    return typeof r.rows[0]?.c === 'number' ? r.rows[0].c : 0
  } catch (err) {
    console.error('countImageProcessThisMonth:', err)
    return 0
  }
}
