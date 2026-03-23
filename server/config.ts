import 'dotenv/config'

/** Origins allowed for CORS in production (`credentials: true`). Comma-separated override via `CORS_ORIGINS`. */
export const corsAllowedOrigins: string[] = (() => {
  const extra = process.env.CORS_ORIGINS
  if (extra?.trim()) {
    return extra.split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean)
  }
  const base = process.env.APP_BASE_URL?.trim().replace(/\/$/, '')
  return base ? [base] : ['http://localhost:5173']
})()

export const config = {
  port: Number(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    connectionString: process.env.DATABASE_URL,
    /**
     * Managed Postgres (Neon, Supabase, RDS…) often needs TLS.
     * Set `DATABASE_SSL=true` or include `sslmode=require` in `DATABASE_URL`.
     */
    ssl:
      process.env.DATABASE_SSL === 'true' ||
      /sslmode=require|sslmode=verify-full|sslmode=no-verify/i.test(process.env.DATABASE_URL ?? '')
        ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' }
        : undefined,
    poolMax: Math.min(100, Math.max(2, Number(process.env.PG_POOL_MAX) || 20)),
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  /** Reject weak JWT secret in production. */
  get isJwtSecretSafe(): boolean {
    const s = process.env.JWT_SECRET
    return !!s && s.length >= 32 && s !== 'change-me-in-production'
  },

  confirmation: {
    tokenExpiresMinutes: Number(process.env.CONFIRMATION_EXPIRES_MINUTES) || 60 * 24, // 24h
  },

  /** Password reset link expiry (default 1 hour). */
  passwordReset: {
    tokenExpiresMinutes: Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES) || 60,
  },

  app: {
    baseUrl: process.env.APP_BASE_URL || 'http://localhost:5173',
    /** Base URL of this API server (for OAuth redirect_uri). In dev default 3001; in prod usually same as baseUrl. */
    apiBaseUrl: process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' ? (process.env.APP_BASE_URL || 'http://localhost:5173') : 'http://localhost:3001'),
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },

  /** In development, allow sign-in without email verification (no verification link needed). */
  dev: {
    allowLoginWithoutVerification: process.env.NODE_ENV !== 'production',
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    pricePro: process.env.STRIPE_PRICE_PRO || '',
    /** Elite tier Stripe Price ID. STRIPE_PRICE_ENTERPRISE still read for backward compatibility. */
    priceElite: process.env.STRIPE_PRICE_ELITE || process.env.STRIPE_PRICE_ENTERPRISE || '',
  },

  /** Replicate.com — image colorize & restore (see server/services/replicateImage.ts). */
  replicate: {
    apiToken: process.env.REPLICATE_API_TOKEN,
    /** Optional override, e.g. `owner/model:version` */
    colorizeModel: process.env.REPLICATE_COLORIZE_MODEL,
    restoreModel: process.env.REPLICATE_RESTORE_MODEL,
  },

  redis: {
    url: process.env.REDIS_URL,
  },

  resend: {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.RESEND_FROM || 'Resend <onboarding@resend.dev>',
  },
} as const

if (!config.database.connectionString) {
  console.warn('DATABASE_URL is not set. Auth API will fail on DB operations.')
}
if (config.nodeEnv !== 'production' && !config.isJwtSecretSafe) {
  console.warn('WARNING: Set JWT_SECRET to a long random string (32+ chars) before production.')
}
