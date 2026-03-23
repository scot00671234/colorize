import { Request, Response, NextFunction } from 'express'
import { config } from '../config'

/**
 * Set HTTP security headers to mitigate common attacks:
 * - XSS, clickjacking, MIME sniffing, referrer leakage.
 * HSTS only in production when base URL is HTTPS.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  if (config.nodeEnv === 'production' && config.app.baseUrl.startsWith('https://')) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }
  next()
}
