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

  confirmation: {
    tokenExpiresMinutes: Number(process.env.CONFIRMATION_EXPIRES_MINUTES) || 60 * 24, // 24h
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

  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
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
