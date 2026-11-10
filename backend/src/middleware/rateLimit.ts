import rateLimit from 'express-rate-limit'

// Conversation creation / messaging rate limiter: 60 requests per 10 minutes per IP
export const aiRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests to AI Project Mentor. Please pause for a moment before continuing.',
    },
  },
})
