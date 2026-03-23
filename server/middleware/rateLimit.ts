import rateLimit from 'express-rate-limit'

/** 1 request per second per IP for AI and resume routes */
export const aiRateLimiter = rateLimit({
  windowMs: 1000,
  max: 1,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  // We are behind a reverse proxy (Hostinger/etc). Trust only the first hop.
  // Using `true` is rejected by express-rate-limit as "permissive".
  trustProxy: 1,
})

/** Auth routes: limit per IP to slow brute force and abuse (login, register, forgot-password, resend). */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: { error: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Trust only the first proxy hop.
  trustProxy: 1,
})
