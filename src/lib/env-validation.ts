import { z } from 'zod'
import { logger } from '@/lib/logger'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Authentication
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),

  // APIs
  OPENAI_API_KEY: z.string().startsWith('sk-').optional(),
  GOOGLE_GEMINI_API_KEY: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  STRIPE_WEBHOOK_SECRET: z.string().min(20).optional(),

  // OAuth
  GOOGLE_OAUTH_ID: z.string().optional(),
  GOOGLE_OAUTH_SECRET: z.string().optional(),
  KAKAO_OAUTH_ID: z.string().optional(),
  KAKAO_OAUTH_SECRET: z.string().optional(),

  // Admin
  ADMIN_EMAILS: z.string(),
  ADMIN_API_TOKEN: z.string().min(20).optional(),

  // Redis (optional)
  REDIS_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
})

export function validateEnv() {
  try {
    envSchema.parse(process.env)
    logger.info('✅ Environment variables validated successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues || []
      logger.error('Environment variable validation failed', {
        errors: issues.map((e: z.ZodIssue) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      })

      process.exit(1)
    }
    throw error
  }
}

export type Env = z.infer<typeof envSchema>
