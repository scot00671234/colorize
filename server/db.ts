import pg from 'pg'
import { config } from './config'

const { Pool } = pg

const poolConfig: pg.PoolConfig | null = config.database.connectionString
  ? {
      connectionString: config.database.connectionString,
      max: config.database.poolMax,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
      ...(config.database.ssl ? { ssl: config.database.ssl } : {}),
    }
  : null

export const pool = poolConfig ? new Pool(poolConfig) : null

export type User = {
  id: string
  email: string
  password_hash: string
  email_verified_at: Date | null
  confirmation_token: string | null
  confirmation_token_expires_at: Date | null
  password_reset_token: string | null
  password_reset_token_expires_at: Date | null
  created_at: Date
  updated_at: Date
}

/** Close pool (graceful shutdown). */
export async function closePool(): Promise<void> {
  if (!pool) return
  await pool.end()
}
