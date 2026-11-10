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
})

export const config = envSchema.parse(process.env)
