/**
 * Runs server/schema.sql and numbered migrations under server/migrations/
 * using DATABASE_URL from .env. No psql required.
 */
import 'dotenv/config'
import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('Missing DATABASE_URL in .env')
  process.exit(1)
}

const client = new pg.Client({ connectionString })

function runFile(filePath) {
  const fullPath = path.join(root, filePath)
  const sql = fs.readFileSync(fullPath, 'utf8')
  return client.query(sql)
}

export async function runMigrations() {
  await client.connect()
  try {
    console.log('Running server/schema.sql...')
    await runFile('server/schema.sql')
    console.log('Running server/migrations/002_resume_builder.sql...')
    await runFile('server/migrations/002_resume_builder.sql')
    console.log('Running server/migrations/003_password_reset.sql...')
    await runFile('server/migrations/003_password_reset.sql')
    console.log('Running server/migrations/004_projects.sql...')
    await runFile('server/migrations/004_projects.sql')
    console.log('Running server/migrations/005_google_auth.sql...')
    await runFile('server/migrations/005_google_auth.sql')
    console.log('Running server/migrations/006_project_job_description.sql...')
    await runFile('server/migrations/006_project_job_description.sql')
    console.log('Running server/migrations/007_subscription_plan.sql...')
    await runFile('server/migrations/007_subscription_plan.sql')
    console.log('Migrations done.')
  } finally {
    await client.end()
  }
}

// When run directly: node scripts/run-migrations.js
const isMain = process.argv[1]?.endsWith('run-migrations.js')
if (isMain) {
  runMigrations().then(() => process.exit(0)).catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
