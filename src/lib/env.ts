/**
 * Type-safe Environment Variables
 *
 * Provides a strongly-typed interface for accessing environment variables.
 * Uses Zod for runtime validation and TypeScript for compile-time type safety.
 *
 * @example
 * ```ts
 * import { env } from '@/lib/env';
 *
 * // Type-safe access - env.DATABASE_URL is guaranteed to be string
 * const db = await connectDatabase(env.DATABASE_URL);
 *
 * // Optional vars use ?? for defaults
 * const port = env.PORT ?? '3000';
 * ```
 */

import { z } from 'zod';

/**
 * Environment variable schema
 * Defines all environment variables with validation rules
 */
const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().url().min(1, 'DATABASE_URL is required'),

  // Authentication
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url().optional(),

  // Admin
  ADMIN_API_TOKEN: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // Redis (Upstash)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // OpenAI
  OPENAI_API_KEY: z.string().optional(),

  // Sentry
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // Firebase (Public)
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional(),

  // Firebase (Server)
  FIREBASE_SERVICE_ACCOUNT: z.string().optional(),

  // Web Push
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().email().optional(),

  // Analytics
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
  NEXT_PUBLIC_CLARITY_PROJECT_ID: z.string().optional(),

  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),

  // Replicate AI
  REPLICATE_API_TOKEN: z.string().optional(),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Kakao OAuth
  KAKAO_CLIENT_ID: z.string().optional(),
  KAKAO_CLIENT_SECRET: z.string().optional(),
});

/**
 * Server-only environment variables schema
 * These are required in production server environments
 */
const serverEnvSchema = envSchema.refine(
  (env) => {
    if (env.NODE_ENV === 'production') {
      return (
        env.ADMIN_API_TOKEN &&
        env.STRIPE_SECRET_KEY &&
        env.STRIPE_WEBHOOK_SECRET &&
        env.UPSTASH_REDIS_REST_URL &&
        env.UPSTASH_REDIS_REST_TOKEN
      );
    }
    return true;
  },
  {
    message: 'Production environment requires ADMIN_API_TOKEN, STRIPE_*, and UPSTASH_REDIS_* variables',
  }
);

/**
 * Parse and validate environment variables
 * Throws if validation fails in production
 */
function parseEnv() {
  const isServer = typeof window === 'undefined';
  const schema = isServer ? serverEnvSchema : envSchema;

  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);

    // Only throw in production to prevent breaking development
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Invalid environment variables - check console for details');
    }

    // In development, return partial env with defaults
    return envSchema.parse({
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'development',
      DATABASE_URL: process.env.DATABASE_URL || '',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'development-secret-min-32-chars-long!',
    });
  }

  return parsed.data;
}

/**
 * Validated and typed environment variables
 *
 * @example
 * ```ts
 * import { env } from '@/lib/env';
 *
 * // All required vars are guaranteed to exist
 * const dbUrl = env.DATABASE_URL; // string
 *
 * // Optional vars are string | undefined
 * const apiKey = env.OPENAI_API_KEY; // string | undefined
 *
 * // Use ?? for defaults
 * const port = env.PORT ?? '3000';
 * ```
 */
export const env = parseEnv();

/**
 * Type-safe environment variable type
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Check if running in production
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Check if running in development
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Check if running in test
 */
export const isTest = env.NODE_ENV === 'test';

/**
 * Get required environment variable
 * Throws if variable is not set
 *
 * @param key - Environment variable name
 * @returns The environment variable value
 * @throws Error if variable is not set
 *
 * @deprecated Use `env` object directly instead
 */
export function getRequiredEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const value = env[key];
  if (value === undefined || value === null || value === '') {
    throw new Error(`Missing required environment variable: ${String(key)}`);
  }
  return value as NonNullable<Env[K]>;
}

/**
 * Get optional environment variable with default
 *
 * @param key - Environment variable name
 * @param defaultValue - Default value if not set
 * @returns The environment variable value or default
 *
 * @deprecated Use `env.VAR ?? 'default'` instead
 */
export function getOptionalEnv<K extends keyof Env>(
  key: K,
  defaultValue: string
): string {
  return (env[key] as string | undefined) ?? defaultValue;
}
