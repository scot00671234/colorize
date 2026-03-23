/**
 * Waits for PostgreSQL on DATABASE_URL to accept connections (e.g. after docker-compose up).
 */
import 'dotenv/config'
import pg from 'pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('Missing DATABASE_URL')
  process.exit(1)
}

const maxAttempts = 30
const delayMs = 1000

export async function wait() {
  const client = new pg.Client({ connectionString })
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await client.connect()
      await client.end()
      console.log('Postgres is ready.')
      return
    } catch (err) {
      await client.end().catch(() => {})
      if (i < maxAttempts - 1) {
        process.stdout.write('.')
        await new Promise((r) => setTimeout(r, delayMs))
      } else {
        throw new Error('Postgres did not become ready: ' + err.message)
      }
    }
  }
}
