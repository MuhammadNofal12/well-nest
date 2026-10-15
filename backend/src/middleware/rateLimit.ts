import { rateLimit } from 'express-rate-limit'

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'rate_limited', message: 'Too many requests. Try again shortly.' } },
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'rate_limited', message: 'Too many sign-in attempts. Try again shortly.' } },
})

export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'rate_limited', message: 'Please wait before sending more messages.' } },
})
