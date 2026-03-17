import 'dotenv/config'

export const config = {
  port: Number(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    connectionString: process.env.DATABASE_URL,
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
  },

  /** In development, allow sign-in without email verification (no verification link needed). */
  dev: {
    allowLoginWithoutVerification: process.env.NODE_ENV !== 'production',
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    pricePro: process.env.STRIPE_PRICE_PRO || '',
    priceEnterprise: process.env.STRIPE_PRICE_ENTERPRISE || '',
  },

  replicate: {
    apiToken: process.env.REPLICATE_API_TOKEN,
  },

  storage: {
    bucket: process.env.STORAGE_BUCKET || process.env.AWS_S3_BUCKET,
    region: process.env.STORAGE_REGION || process.env.AWS_REGION || 'auto',
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
    /** Optional: set for R2 or MinIO (e.g. https://<account>.r2.cloudflarestorage.com) */
    endpoint: process.env.STORAGE_ENDPOINT,
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
if (config.nodeEnv === 'production' && !config.isJwtSecretSafe) {
  console.warn('WARNING: Set a strong JWT_SECRET in production (at least 32 characters). Default secret is insecure.')
}
