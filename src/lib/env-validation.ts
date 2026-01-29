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

  // Admin
  ADMIN_EMAILS: z.string(),

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
      logger.error('❌ Environment variable validation failed:', {
        errors: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      })

      console.error('\n🚨 Missing or invalid environment variables:\n')
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
      console.error('\nPlease check your .env file.\n')

      process.exit(1)
    }
    throw error
  }
}

export type Env = z.infer<typeof envSchema>
