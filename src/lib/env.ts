/**
 * Runtime environment validation
 * This module validates critical environment variables at runtime
 * and provides type-safe access to them.
 */

import { logger } from "@/lib/logger";

// Required environment variables that must be present for the app to function
const REQUIRED_SERVER_ENV = [
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'DATABASE_URL',
  'TOKEN_ENCRYPTION_KEY',
] as const;

// Required in production only
const REQUIRED_PRODUCTION_ENV = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
] as const;

// Warning-level: recommended but not strictly required
const RECOMMENDED_ENV = [
  'OPENAI_API_KEY',
  'AI_BACKEND_URL',
] as const;

interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * Validates environment variables at runtime
 * Call this early in app initialization to catch misconfigurations
 */
export function validateEnv(): EnvValidationResult {
  const isProduction = process.env.NODE_ENV === 'production';
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required env vars
  for (const key of REQUIRED_SERVER_ENV) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  // Check production-only env vars
  if (isProduction) {
    for (const key of REQUIRED_PRODUCTION_ENV) {
      if (!process.env[key]) {
        missing.push(key);
      }
    }
  }

  // Check recommended env vars (non-blocking)
  for (const key of RECOMMENDED_ENV) {
    if (!process.env[key]) {
      warnings.push(key);
    }
  }

  // Validate specific formats
  const authSecret = process.env.NEXTAUTH_SECRET;
  if (authSecret && authSecret.length < 32) {
    missing.push('NEXTAUTH_SECRET (must be at least 32 characters)');
  }

  const tokenKey = process.env.TOKEN_ENCRYPTION_KEY;
  if (tokenKey && tokenKey.length < 32) {
    missing.push('TOKEN_ENCRYPTION_KEY (must be at least 32 characters)');
  }

  // Validate URLs in production
  if (isProduction) {
    const authUrl = process.env.NEXTAUTH_URL;
    if (authUrl && !authUrl.startsWith('https://')) {
      missing.push('NEXTAUTH_URL (must use HTTPS in production)');
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Logs environment validation results
 * Use this in server initialization
 */
export function logEnvValidation(): void {
  const result = validateEnv();

  if (result.warnings.length > 0) {
    logger.warn('[env] Recommended environment variables missing:', result.warnings.join(', '));
  }

  if (!result.valid) {
    logger.error('[env] CRITICAL: Required environment variables missing:', result.missing.join(', '));
    if (process.env.NODE_ENV === 'production') {
      // In production, fail fast if critical env vars are missing
      throw new Error(`Missing required environment variables: ${result.missing.join(', ')}`);
    }
  } else {
    logger.info('[env] Environment validation passed');
  }
}

/**
 * Type-safe environment variable access
 * Provides default values for development
 */
export const env = {
  // Auth
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || '',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',

  // Database
  DATABASE_URL: process.env.DATABASE_URL || '',

  // API
  ADMIN_API_TOKEN: process.env.ADMIN_API_TOKEN || '',
  PUBLIC_API_TOKEN: process.env.PUBLIC_API_TOKEN || '',

  // AI Backend
  AI_BACKEND_URL: process.env.AI_BACKEND_URL || process.env.NEXT_PUBLIC_AI_BACKEND || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',

  // Redis (Rate Limiting)
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || '',
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || '',

  // Security
  TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY || '',

  // Feature flags
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
} as const;
