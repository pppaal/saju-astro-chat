/**
 * API Token Rotation Service
 *
 * Supports gradual key rotation with grace period for zero-downtime migration.
 *
 * Features:
 * - Multiple active tokens (current + legacy)
 * - Token versioning
 * - Audit logging
 * - Expiration tracking
 */

import { logger } from "@/lib/logger";
import { recordCounter } from "@/lib/metrics";
import crypto from "crypto";

// Token configuration
export interface TokenConfig {
  /** Current active token */
  current: string;
  /** Legacy token (still valid during rotation) */
  legacy?: string;
  /** Token version for tracking */
  version?: number;
  /** Expiration time in milliseconds (optional) */
  expiresAt?: number;
}

// Token validation result with version info
export interface TokenValidationResultV2 {
  valid: boolean;
  version?: "current" | "legacy";
  reason?: string;
  expiresIn?: number;
}

// Audit log entry
export interface TokenAuditEntry {
  action: "validate" | "rotate" | "revoke" | "expire";
  tokenType: string;
  version?: string;
  success: boolean;
  ip?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

// In-memory audit log (for development, use database in production)
const auditLog: TokenAuditEntry[] = [];
const MAX_AUDIT_ENTRIES = 1000;

/**
 * Log token audit event
 */
export function logTokenAudit(entry: Omit<TokenAuditEntry, "timestamp">): void {
  const fullEntry: TokenAuditEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  auditLog.push(fullEntry);

  // Limit in-memory log size
  if (auditLog.length > MAX_AUDIT_ENTRIES) {
    auditLog.shift();
  }

  // Log to standard logger
  if (entry.action === "rotate" || entry.action === "revoke") {
    logger.info(`[TokenAudit] ${entry.action}`, fullEntry);
  } else if (!entry.success) {
    logger.warn(`[TokenAudit] ${entry.action} failed`, fullEntry);
  }

  // Record metrics
  recordCounter(`api.token.${entry.action}`, 1, {
    tokenType: entry.tokenType,
    success: String(entry.success),
    version: entry.version || "unknown",
  });
}

/**
 * Get recent audit log entries
 */
export function getAuditLog(limit = 100): TokenAuditEntry[] {
  return auditLog.slice(-limit);
}

/**
 * Build token config from environment variables
 * Supports both current and legacy tokens for rotation
 */
export function buildTokenConfig(tokenName: string): TokenConfig {
  const current = process.env[tokenName] || "";
  const legacy = process.env[`${tokenName}_LEGACY`];
  const version = process.env[`${tokenName}_VERSION`]
    ? parseInt(process.env[`${tokenName}_VERSION`], 10)
    : 1;
  const expiresAt = process.env[`${tokenName}_EXPIRES_AT`]
    ? parseInt(process.env[`${tokenName}_EXPIRES_AT`], 10)
    : undefined;

  return { current, legacy, version, expiresAt };
}

/**
 * Validate token against config (supports rotation)
 */
export function validateToken(
  providedToken: string | null,
  config: TokenConfig,
  tokenType: string,
  ip?: string
): TokenValidationResultV2 {
  // Check if token is provided
  if (!providedToken) {
    logTokenAudit({
      action: "validate",
      tokenType,
      success: false,
      ip,
      details: { reason: "missing" },
    });
    return { valid: false, reason: "Token not provided" };
  }

  // Check expiration
  if (config.expiresAt && Date.now() > config.expiresAt) {
    logTokenAudit({
      action: "expire",
      tokenType,
      success: false,
      ip,
      version: String(config.version),
      details: { expiredAt: config.expiresAt },
    });
    return { valid: false, reason: "Token expired" };
  }

  // Check current token (timing-safe comparison)
  if (config.current && timingSafeEqual(providedToken, config.current)) {
    logTokenAudit({
      action: "validate",
      tokenType,
      version: "current",
      success: true,
      ip,
    });

    const expiresIn = config.expiresAt
      ? config.expiresAt - Date.now()
      : undefined;

    return { valid: true, version: "current", expiresIn };
  }

  // Check legacy token (for rotation grace period)
  if (config.legacy && timingSafeEqual(providedToken, config.legacy)) {
    logTokenAudit({
      action: "validate",
      tokenType,
      version: "legacy",
      success: true,
      ip,
      details: { warning: "Using legacy token, please update" },
    });
    return { valid: true, version: "legacy" };
  }

  // Invalid token
  logTokenAudit({
    action: "validate",
    tokenType,
    success: false,
    ip,
    details: { reason: "invalid" },
  });
  return { valid: false, reason: "Invalid token" };
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a comparison to keep timing consistent
    crypto.timingSafeEqual(Buffer.from(a), Buffer.from(a));
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Generate a new secure token
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

/**
 * Hash a token for storage (don't store plaintext)
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Check if token rotation is recommended
 */
export function shouldRotate(config: TokenConfig): {
  shouldRotate: boolean;
  reason?: string;
} {
  // Check if approaching expiration (within 7 days)
  if (config.expiresAt) {
    const daysUntilExpiry = (config.expiresAt - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysUntilExpiry < 7) {
      return {
        shouldRotate: true,
        reason: `Token expires in ${Math.ceil(daysUntilExpiry)} days`,
      };
    }
  }

  // Check if legacy token is still in use (should be phased out)
  if (config.legacy) {
    return {
      shouldRotate: false, // Don't rotate again until legacy is removed
      reason: "Legacy token still active - remove before next rotation",
    };
  }

  return { shouldRotate: false };
}

/**
 * Enhanced public token validation with rotation support
 */
export function validatePublicToken(
  req: Request,
  ip?: string
): TokenValidationResultV2 {
  const config = buildTokenConfig("PUBLIC_API_TOKEN");

  // Development mode without token configured
  if (!config.current && process.env.NODE_ENV !== "production") {
    return { valid: true, version: "current" };
  }

  // Production without token = security error
  if (!config.current && process.env.NODE_ENV === "production") {
    logger.error("[SECURITY] PUBLIC_API_TOKEN not configured in production");
    recordCounter("api.auth.misconfig", 1, { env: "prod" });
    return { valid: false, reason: "Token not configured" };
  }

  const providedToken = req.headers.get("x-api-token");
  return validateToken(providedToken, config, "public", ip);
}

/**
 * Enhanced admin token validation with rotation support
 */
export function validateAdminToken(
  req: Request,
  ip?: string
): TokenValidationResultV2 {
  const config = buildTokenConfig("ADMIN_API_TOKEN");

  // Development mode without token configured
  if (!config.current && process.env.NODE_ENV !== "production") {
    return { valid: true, version: "current" };
  }

  // Production without token = security error
  if (!config.current && process.env.NODE_ENV === "production") {
    logger.error("[SECURITY] ADMIN_API_TOKEN not configured in production");
    recordCounter("api.auth.misconfig", 1, { env: "prod" });
    return { valid: false, reason: "Token not configured" };
  }

  // Support multiple header formats
  const authHeader = req.headers.get("authorization");
  const apiKeyHeader = req.headers.get("x-api-key");

  let providedToken: string | null = null;

  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    providedToken = authHeader.slice(7).trim();
  } else if (apiKeyHeader) {
    providedToken = apiKeyHeader;
  }

  return validateToken(providedToken, config, "admin", ip);
}

/**
 * Get token status for admin dashboard
 */
export function getTokenStatus(): {
  public: { configured: boolean; hasLegacy: boolean; version: number };
  admin: { configured: boolean; hasLegacy: boolean; version: number };
  cron: { configured: boolean };
  metrics: { configured: boolean };
} {
  const publicConfig = buildTokenConfig("PUBLIC_API_TOKEN");
  const adminConfig = buildTokenConfig("ADMIN_API_TOKEN");

  return {
    public: {
      configured: !!publicConfig.current,
      hasLegacy: !!publicConfig.legacy,
      version: publicConfig.version || 1,
    },
    admin: {
      configured: !!adminConfig.current,
      hasLegacy: !!adminConfig.legacy,
      version: adminConfig.version || 1,
    },
    cron: {
      configured: !!process.env.CRON_SECRET,
    },
    metrics: {
      configured: !!process.env.PUBLIC_METRICS_TOKEN,
    },
  };
}