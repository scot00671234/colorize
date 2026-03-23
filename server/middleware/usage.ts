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
