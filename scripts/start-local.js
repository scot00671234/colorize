/**
 * One-command local setup:
 * 1. Start Postgres (docker-compose up -d)
 * 2. Wait for Postgres, run migrations
 * 3. Start API and frontend in background
 * Requires: Docker Desktop installed and running, Node/npm.
 */
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

// Load .env so DATABASE_URL exists for migrate/wait
const envPath = path.join(root, '.env')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', cwd: root, shell: true, ...opts })
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Exit ${code}`))))
  })
}

function runBackground(cmd, args) {
  const p = spawn(cmd, args, { stdio: 'ignore', cwd: root, detached: true, shell: true })
  p.unref()
  return p
}

async function main() {
  console.log('Step 1: Starting Postgres with Docker...')
  try {
    await run('docker-compose', ['up', '-d'])
  } catch (e) {
    console.error('Failed to start Docker. Is Docker Desktop installed and running?')
    process.exit(1)
  }

  console.log('Step 2: Waiting for Postgres and running migrations...')
  const { wait } = await import('./wait-for-pg.js')
  await wait()
  const { runMigrations } = await import('./run-migrations.js')
  try {
    await runMigrations()
  } catch (err) {
    console.error('Migration failed:', err.message)
    process.exit(1)
  }

  console.log('Step 3: Starting API (port 3001) and frontend (port 5173)...')
  runBackground('npm', ['run', 'server'])
  runBackground('npm', ['run', 'dev'])

  console.log('\nDone. Open http://localhost:5173 in your browser.')
  console.log('(API at http://localhost:3001). To stop: docker-compose down, and close the Node processes.)')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
