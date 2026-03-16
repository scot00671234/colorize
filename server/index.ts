import express from 'express'
import cors from 'cors'
import { config } from './config'
import authRoutes from './routes/auth'
import billingRoutes from './routes/billing'

const app = express()

app.use(cors({
  origin: [config.app.baseUrl, 'http://localhost:5173'],
  credentials: true,
}))
app.use(express.json({
  verify: (req: express.Request, _res, buf) => {
    (req as express.Request & { rawBody?: Buffer }).rawBody = buf
  },
}))

app.use('/api/auth', authRoutes)
app.use('/api/auth', billingRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.listen(config.port, () => {
  console.log(`Auth API running at http://localhost:${config.port}`)
})
