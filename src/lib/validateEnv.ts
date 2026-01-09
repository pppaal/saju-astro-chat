/**
 * Environment Variable Validation
 * Ensures required environment variables are present at runtime
 */

type EnvRequirement = boolean | (() => boolean);

interface EnvConfig {
  [key: string]: EnvRequirement;
}

interface ValidationResult {
  isValid: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * Validates environment variables based on configuration
 * @param config - Object with env var names as keys and requirements as values
 * @returns Validation result with missing variables
 */
export function validateEnv(config: EnvConfig): ValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const [key, requirement] of Object.entries(config)) {
    const isRequired = typeof requirement === "function" ? requirement() : requirement;
    const value = process.env[key];

    if (isRequired && !value) {
      missing.push(key);
    }
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Validates and throws if critical env vars are missing
 * Use this at application startup
 */
export function validateRequiredEnv(): void {
  const isProduction = process.env.NODE_ENV === "production";

  const result = validateEnv({
    // Always required
    DATABASE_URL: true,
    NEXTAUTH_SECRET: true,

    // Required in production
    ADMIN_API_TOKEN: isProduction,
    STRIPE_SECRET_KEY: isProduction,
    STRIPE_WEBHOOK_SECRET: isProduction,

    // Required for premium features
    UPSTASH_REDIS_REST_URL: isProduction,
    UPSTASH_REDIS_REST_TOKEN: isProduction,

    // AI features (at least one required)
    OPENAI_API_KEY: false, // Optional if using alternative
  });

  if (!result.isValid) {
    const errorMsg = `[ENV] Missing required environment variables: ${result.missing.join(", ")}`;

    if (isProduction) {
      throw new Error(errorMsg);
    } else {
      console.warn(errorMsg);
    }
  }
}

/**
 * Get required environment variable or throw
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`[ENV] Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Get optional environment variable with default
 */
export function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Validate API token for backend calls
 * Returns token or throws in production
 */
export function getApiToken(): string | null {
  const token = process.env.ADMIN_API_TOKEN;

  if (!token && isProduction()) {
    throw new Error("[SECURITY] ADMIN_API_TOKEN is required in production");
  }

  return token || null;
}
