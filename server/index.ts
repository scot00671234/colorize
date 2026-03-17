import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'
import { config } from './config'
import { securityHeaders } from './middleware/securityHeaders'
import { authRateLimiter } from './middleware/rateLimit'
import authRoutes from './routes/auth'
import billingRoutes from './routes/billing'
import aiRoutes from './routes/ai'
import resumeRoutes from './routes/resume'
import projectsRoutes from './routes/projects'

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
app.use('/api/ai', aiRoutes)
app.use('/api/resume', resumeRoutes)
app.use('/api/projects', projectsRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
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
    console.warn('WARNING: RESEND_FROM is default (resend.dev). Set RESEND_FROM to an address on your verified domain (e.g. "bioqz <noreply@bioqz.com>") so confirmation emails can be sent to any user.')
  }
})
