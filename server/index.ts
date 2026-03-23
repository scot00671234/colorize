import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'
import { config, corsAllowedOrigins } from './config'
import { pool, closePool } from './db'
import { securityHeaders } from './middleware/securityHeaders'
import { authRateLimiter } from './middleware/rateLimit'
import authRoutes from './routes/auth'
import billingRoutes from './routes/billing'
import resumeRoutes from './routes/resume'
import projectsRoutes from './routes/projects'
import aiRoutes from './routes/ai'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProduction = config.nodeEnv === 'production'

if (isProduction) {
  if (!config.database.connectionString) {
    console.error('FATAL: DATABASE_URL is required in production. Set it and restart.')
    process.exit(1)
  }
  if (!config.isJwtSecretSafe) {
    console.error(
      'FATAL: JWT_SECRET must be a random string of at least 32 characters in production (not the default).',
    )
    process.exit(1)
  }
}

const app = express()
// Behind nginx/Caddy on a VPS; first proxy only (rate-limit + IP).
app.set('trust proxy', 1)

if (isProduction) {
  console.log('[cors] Allowed origins:', corsAllowedOrigins.join(', ') || '(none)')
  const onlyLocalhost = corsAllowedOrigins.every((o) => /localhost|127\.0\.0\.1/.test(o))
  if (onlyLocalhost && corsAllowedOrigins.length > 0) {
    console.warn(
      '[cors] WARNING: Production CORS is still using localhost defaults. Set APP_BASE_URL=https://your-domain (no trailing slash). If you use www, add CORS_ORIGINS=https://your-domain,https://www.your-domain',
    )
  }
}

app.use(securityHeaders)
app.use(cors({
  origin(origin, callback) {
    if (!isProduction) {
      if (!origin || /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        callback(null, true)
        return
      }
      callback(new Error('Not allowed by CORS'))
      return
    }
    if (!origin) {
      callback(null, false)
      return
    }
    const normalized = origin.replace(/\/$/, '')
    if (corsAllowedOrigins.includes(normalized)) {
      callback(null, origin)
      return
    }
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))
app.use(express.json({
  limit: '2mb',
  verify: (req: express.Request, _res, buf) => {
    (req as express.Request & { rawBody?: Buffer }).rawBody = buf
  },
}))

app.use('/api/auth', authRateLimiter, authRoutes)
app.use('/api/auth', billingRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/resume', resumeRoutes)
app.use('/api/projects', projectsRoutes)

/** Liveness + DB readiness for reverse proxies and orchestrators. */
app.get('/api/health', async (_req, res) => {
  const payload: {
    ok: boolean
    env: string
    database: 'connected' | 'not_configured' | 'error'
    /** Image API: set REPLICATE_API_TOKEN for /api/ai/process. */
    replicate: 'configured' | 'not_configured'
  } = {
    ok: true,
    env: config.nodeEnv,
    database: 'not_configured',
    replicate: config.replicate.apiToken ? 'configured' : 'not_configured',
  }
  if (pool) {
    try {
      await pool.query('SELECT 1')
      payload.database = 'connected'
    } catch (err) {
      console.error('[health] database ping failed:', err)
      payload.ok = false
      payload.database = 'error'
      res.status(503).json(payload)
      return
    }
  }
  res.json(payload)
})

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

if (isProduction) {
  const distPath = path.join(path.dirname(__dirname), 'dist')
  app.use(express.static(distPath))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

const server = app.listen(config.port, () => {
  console.log(isProduction
    ? `Server running at http://localhost:${config.port}`
    : `Auth API running at http://localhost:${config.port}`)
  if (!isProduction && config.dev.allowLoginWithoutVerification) {
    console.log('Dev: sign-in allowed without email verification.')
  }
  if (isProduction && /localhost|127\.0\.0\.1/.test(config.app.baseUrl)) {
    console.warn('WARNING: APP_BASE_URL is set to localhost. Set APP_BASE_URL to your production URL (e.g. https://your-app.com) so verification links in emails work.')
  }
  if (config.resend.apiKey && /resend\.dev|onboarding@resend/.test(config.resend.from)) {
    console.warn('WARNING: RESEND_FROM is default (resend.dev). Set RESEND_FROM to an address on your verified domain (e.g. "Colorizer <noreply@yourdomain.com>") so confirmation emails can be sent to any user.')
  }
})
function shutdown(signal: string) {
  console.log(`${signal} received, closing server…`)
  server.close(async (err) => {
    if (err) console.error(err)
    try {
      await closePool()
    } catch (e) {
      console.error('Pool close error:', e)
    }
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
