import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/campusprojecthub'),
  ALLOW_INMEMORY_FALLBACK: z.enum(['true', 'false']).default('false'),
  JWT_SECRET: z.string().default('campusprojecthub-academic-jwt-secret-dev-2026'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  FACULTY_INVITE_CODE: z.string().optional(),
  ADMIN_PROVISION_SECRET: z.string().optional(),
  AI_PROVIDER: z.enum(['mock', 'gemini', 'openai']).default('mock'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 587)),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  REMINDER_INTERVAL_MINUTES: z.string().default('15').transform((v) => Math.max(1, parseInt(v, 10) || 15)),
})

export const config = envSchema.parse(process.env)

const INSECURE_PLACEHOLDER_SECRETS = new Set([
  'campusprojecthub-academic-jwt-secret-dev-2026',
  'your-super-secret-jwt-key-change-in-production',
  'secret',
  'changeme',
])

export function validateSecurityConfig(): void {
  const jwtSecret = config.JWT_SECRET.trim()
  const isWeakOrDefault = jwtSecret.length < 32 || INSECURE_PLACEHOLDER_SECRETS.has(jwtSecret)

  if (config.NODE_ENV === 'production') {
    if (isWeakOrDefault) {
      throw new Error(
        '[Security] Production startup aborted: JWT_SECRET must be set to a unique random secret of at least 32 characters.'
      )
    }
    if (config.ALLOW_INMEMORY_FALLBACK === 'true') {
      throw new Error(
        '[Security] Production startup aborted: ALLOW_INMEMORY_FALLBACK must be false in production.'
      )
    }
  } else if (isWeakOrDefault) {
    console.warn(
      '[Security Warning] Using a development/placeholder JWT_SECRET. Set a strong 32+ character JWT_SECRET before deploying.'
    )
  }
}
