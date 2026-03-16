import pg from 'pg'
import { config } from './config'

const { Pool } = pg

export const pool = config.database.connectionString
  ? new Pool({ connectionString: config.database.connectionString })
  : null

export type User = {
  id: string
  email: string
  password_hash: string
  email_verified_at: Date | null
  confirmation_token: string | null
  confirmation_token_expires_at: Date | null
  created_at: Date
  updated_at: Date
}
