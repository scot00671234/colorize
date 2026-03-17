import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'
import { config } from './config'
import { securityHeaders } from './middleware/securityHeaders'
import { authRateLimiter } from './middleware/rateLimit'
import { verifyLocalFileToken } from './services/storage'
import authRoutes from './routes/auth'
import billingRoutes from './routes/billing'
import projectsRoutes from './routes/projects'
import jobsRoutes from './routes/jobs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProduction = config.nodeEnv === 'production'

const app = express()

app.use(securityHeaders)
app.use(cors({
  origin: isProduction
    ? [config.app.baseUrl]
    : (origin, cb) => {
        // In dev, allow any localhost port (Vite may use 5174 if 5173 is taken)
        if (!origin || /^https?:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true)
        return cb(null, false)
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
app.use('/api/projects', projectsRoutes)
app.use('/api/jobs', jobsRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

// Serve local storage files (when STORAGE_LOCAL_PATH is set). Requires valid signed token.
app.get('/api/files', (req, res) => {
  const localPath = config.storage.localPath
  if (!localPath) {
    res.status(404).end()
    return
  }
  const key = req.query.key as string
  const token = req.query.token as string
  const expires = parseInt(req.query.expires as string, 10)
  if (!key || !token || !Number.isFinite(expires) || !verifyLocalFileToken(key, token, expires)) {
    res.status(403).json({ error: 'Invalid or expired link' })
    return
  }
  if (key.includes('..') || !/^uploads\/[^/]+\/.+/.test(key)) {
    res.status(403).json({ error: 'Invalid path' })
    return
  }
  const base = path.resolve(localPath)
  const fullPath = path.resolve(localPath, key)
  if (fullPath !== base && !fullPath.startsWith(base + path.sep)) {
    res.status(403).json({ error: 'Invalid path' })
    return
  }
  res.sendFile(fullPath, (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: 'File not found' })
  })
})

if (isProduction) {
  const distPath = path.join(path.dirname(__dirname), 'dist')
  app.use(express.static(distPath))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(config.port, () => {
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
    console.warn('WARNING: RESEND_FROM is default (resend.dev). Set RESEND_FROM to an address on your verified domain (e.g. "Wish Wello <noreply@yourdomain.com>") so confirmation emails can be sent to any user.')
  }
})
