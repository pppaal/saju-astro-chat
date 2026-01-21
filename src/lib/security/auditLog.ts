/**
 * Security Audit Logging
 *
 * Comprehensive logging for security-sensitive operations:
 * - Authentication failures
 * - Admin actions
 * - Token operations
 * - Sensitive data access
 */

import { logger } from "@/lib/logger";
import { recordCounter } from "@/lib/metrics";

// Audit event categories
export type AuditCategory =
  | "auth"
  | "admin"
  | "token"
  | "data"
  | "security"
  | "api";

// Audit event severity
export type AuditSeverity = "info" | "warn" | "error" | "critical";

// Audit event structure
export interface AuditEvent {
  /** Unique event ID */
  id: string;
  /** Event timestamp */
  timestamp: string;
  /** Event category */
  category: AuditCategory;
  /** Specific action performed */
  action: string;
  /** Severity level */
  severity: AuditSeverity;
  /** Was the action successful */
  success: boolean;
  /** User ID if authenticated */
  userId?: string;
  /** User email if available */
  userEmail?: string;
  /** Client IP address */
  ip?: string;
  /** User agent string */
  userAgent?: string;
  /** Request path */
  path?: string;
  /** HTTP method */
  method?: string;
  /** Additional details */
  details?: Record<string, unknown>;
  /** Error message if failed */
  error?: string;
}

// In-memory audit log (use database/external service in production)
const auditEvents: AuditEvent[] = [];
const MAX_EVENTS = 10000;

/**
 * Generate unique event ID
 */
function generateEventId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `audit_${timestamp}_${random}`;
}

/**
 * Log an audit event
 */
export function audit(event: Omit<AuditEvent, "id" | "timestamp">): AuditEvent {
  const fullEvent: AuditEvent = {
    id: generateEventId(),
    timestamp: new Date().toISOString(),
    ...event,
  };

  // Add to in-memory log
  auditEvents.push(fullEvent);
  if (auditEvents.length > MAX_EVENTS) {
    auditEvents.shift();
  }

  // Log to standard logger based on severity
  const logMessage = `[Audit:${event.category}] ${event.action}`;
  const logMeta = {
    eventId: fullEvent.id,
    userId: event.userId,
    ip: event.ip,
    success: event.success,
    details: event.details,
    error: event.error,
  };

  switch (event.severity) {
    case "critical":
    case "error":
      logger.error(logMessage, logMeta);
      break;
    case "warn":
      logger.warn(logMessage, logMeta);
      break;
    default:
      logger.info(logMessage, logMeta);
  }

  // Record metrics
  recordCounter("audit.event", 1, {
    category: event.category,
    action: event.action,
    severity: event.severity,
    success: String(event.success),
  });

  return fullEvent;
}

/**
 * Get audit events with optional filtering
 */
export function getAuditEvents(options: {
  category?: AuditCategory;
  severity?: AuditSeverity;
  userId?: string;
  success?: boolean;
  since?: Date;
  limit?: number;
}): AuditEvent[] {
  let events = [...auditEvents];

  if (options.category) {
    events = events.filter((e) => e.category === options.category);
  }

  if (options.severity) {
    events = events.filter((e) => e.severity === options.severity);
  }

  if (options.userId) {
    events = events.filter((e) => e.userId === options.userId);
  }

  if (options.success !== undefined) {
    events = events.filter((e) => e.success === options.success);
  }

  if (options.since) {
    events = events.filter((e) => new Date(e.timestamp) >= options.since!);
  }

  // Return most recent first
  events.reverse();

  if (options.limit) {
    events = events.slice(0, options.limit);
  }

  return events;
}

// ============================================================
// Convenience functions for common audit events
// ============================================================

/**
 * Log authentication attempt
 */
export function auditAuth(params: {
  action: "login" | "logout" | "register" | "password_reset" | "token_refresh";
  success: boolean;
  userId?: string;
  userEmail?: string;
  ip?: string;
  userAgent?: string;
  method?: string; // e.g., "credentials", "google", "kakao"
  error?: string;
}): AuditEvent {
  return audit({
    category: "auth",
    action: params.action,
    severity: params.success ? "info" : "warn",
    success: params.success,
    userId: params.userId,
    userEmail: params.userEmail,
    ip: params.ip,
    userAgent: params.userAgent,
    details: { method: params.method },
    error: params.error,
  });
}

/**
 * Log admin action
 */
export function auditAdmin(params: {
  action: string;
  success: boolean;
  userId: string;
  userEmail?: string;
  ip?: string;
  path?: string;
  details?: Record<string, unknown>;
  error?: string;
}): AuditEvent {
  return audit({
    category: "admin",
    action: params.action,
    severity: params.success ? "info" : "error",
    success: params.success,
    userId: params.userId,
    userEmail: params.userEmail,
    ip: params.ip,
    path: params.path,
    details: params.details,
    error: params.error,
  });
}

/**
 * Log token operation
 */
export function auditToken(params: {
  action: "validate" | "rotate" | "revoke" | "generate" | "expire";
  tokenType: string;
  success: boolean;
  ip?: string;
  version?: string;
  details?: Record<string, unknown>;
  error?: string;
}): AuditEvent {
  return audit({
    category: "token",
    action: `${params.tokenType}_${params.action}`,
    severity: params.success ? "info" : "warn",
    success: params.success,
    ip: params.ip,
    details: { version: params.version, ...params.details },
    error: params.error,
  });
}

/**
 * Log sensitive data access
 */
export function auditDataAccess(params: {
  action: "read" | "write" | "delete" | "export";
  resource: string;
  resourceId?: string;
  success: boolean;
  userId?: string;
  ip?: string;
  details?: Record<string, unknown>;
  error?: string;
}): AuditEvent {
  return audit({
    category: "data",
    action: `${params.resource}_${params.action}`,
    severity: params.action === "delete" ? "warn" : "info",
    success: params.success,
    userId: params.userId,
    ip: params.ip,
    details: { resourceId: params.resourceId, ...params.details },
    error: params.error,
  });
}

/**
 * Log security event
 */
export function auditSecurity(params: {
  action: string;
  severity: AuditSeverity;
  success: boolean;
  ip?: string;
  userId?: string;
  path?: string;
  details?: Record<string, unknown>;
  error?: string;
}): AuditEvent {
  return audit({
    category: "security",
    action: params.action,
    severity: params.severity,
    success: params.success,
    ip: params.ip,
    userId: params.userId,
    path: params.path,
    details: params.details,
    error: params.error,
  });
}

/**
 * Log rate limit violation
 */
export function auditRateLimit(params: {
  ip: string;
  path: string;
  limit: number;
  current: number;
  userId?: string;
}): AuditEvent {
  return audit({
    category: "security",
    action: "rate_limit_exceeded",
    severity: "warn",
    success: false,
    ip: params.ip,
    userId: params.userId,
    path: params.path,
    details: {
      limit: params.limit,
      current: params.current,
    },
  });
}

/**
 * Log suspicious activity
 */
export function auditSuspicious(params: {
  type: "injection_attempt" | "brute_force" | "scanner" | "anomaly";
  ip: string;
  path?: string;
  details?: Record<string, unknown>;
}): AuditEvent {
  return audit({
    category: "security",
    action: `suspicious_${params.type}`,
    severity: "critical",
    success: false,
    ip: params.ip,
    path: params.path,
    details: params.details,
  });
}

/**
 * Get audit summary for dashboard
 */
export function getAuditSummary(since?: Date): {
  total: number;
  byCategory: Record<AuditCategory, number>;
  bySeverity: Record<AuditSeverity, number>;
  failedAuth: number;
  suspiciousActivity: number;
} {
  const events = since
    ? auditEvents.filter((e) => new Date(e.timestamp) >= since)
    : auditEvents;

  const byCategory: Record<AuditCategory, number> = {
    auth: 0,
    admin: 0,
    token: 0,
    data: 0,
    security: 0,
    api: 0,
  };

  const bySeverity: Record<AuditSeverity, number> = {
    info: 0,
    warn: 0,
    error: 0,
    critical: 0,
  };

  let failedAuth = 0;
  let suspiciousActivity = 0;

  for (const event of events) {
    byCategory[event.category]++;
    bySeverity[event.severity]++;

    if (event.category === "auth" && !event.success) {
      failedAuth++;
    }

    if (event.action.startsWith("suspicious_")) {
      suspiciousActivity++;
    }
  }

  return {
    total: events.length,
    byCategory,
    bySeverity,
    failedAuth,
    suspiciousActivity,
  };
}
