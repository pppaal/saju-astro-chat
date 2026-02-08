/**
 * Security Audit Logging
 *
 * Comprehensive logging for security-sensitive operations:
 * - Authentication failures
 * - Admin actions
 * - Token operations
 * - Sensitive data access
 *
 * Supports both in-memory caching and database persistence.
 *
 * 개선사항:
 * - IP 주소 마스킹 (GDPR 준수)
 * - userId 해시 처리 (프라이버시 보호)
 * - 이메일 마스킹
 */

import { logger } from "@/lib/logger";
import { recordCounter } from "@/lib/metrics";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import crypto from "crypto";

// ============================================================
// Privacy Masking Utilities
// ============================================================

/**
 * IP 주소 마스킹
 * IPv4: 마지막 옥텟 마스킹 (예: 192.168.1.100 → 192.168.1.xxx)
 * IPv6: 마지막 4개 그룹 마스킹
 *
 * @param ip 원본 IP 주소
 * @returns 마스킹된 IP 주소
 */
export function maskIp(ip: string | undefined | null): string | undefined {
  if (!ip) return undefined;

  // IPv4
  if (ip.includes(".") && !ip.includes(":")) {
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
  }

  // IPv6
  if (ip.includes(":")) {
    const parts = ip.split(":");
    if (parts.length >= 4) {
      // 앞 4개 그룹만 유지, 나머지는 마스킹
      return parts.slice(0, 4).join(":") + ":xxxx:xxxx:xxxx:xxxx";
    }
  }

  // 알 수 없는 형식은 부분 마스킹
  if (ip.length > 4) {
    return ip.slice(0, -4) + "xxxx";
  }

  return "masked";
}

/**
 * userId 해시 처리
 * 원본 userId를 복원할 수 없는 단방향 해시로 변환
 * 동일 userId는 동일 해시를 생성하여 추적 가능
 *
 * @param userId 원본 사용자 ID
 * @returns 해시된 userId (앞 12자)
 */
export function hashUserId(userId: string | undefined | null): string | undefined {
  if (!userId) return undefined;

  // 환경 변수에서 솔트 가져오기 (없으면 기본값)
  const salt = process.env.AUDIT_LOG_SALT || "audit-log-default-salt";

  const hash = crypto
    .createHmac("sha256", salt)
    .update(userId)
    .digest("hex")
    .slice(0, 12);

  return `usr_${hash}`;
}

/**
 * 이메일 마스킹
 * 예: john.doe@example.com → j***e@e***e.com
 *
 * @param email 원본 이메일
 * @returns 마스킹된 이메일
 */
export function maskEmail(email: string | undefined | null): string | undefined {
  if (!email) return undefined;

  const atIndex = email.indexOf("@");
  if (atIndex === -1) return "***@***";

  const localPart = email.slice(0, atIndex);
  const domainPart = email.slice(atIndex + 1);

  // 로컬 파트 마스킹: 첫 글자와 마지막 글자만 유지
  const maskedLocal =
    localPart.length <= 2
      ? "*".repeat(localPart.length)
      : localPart[0] + "*".repeat(localPart.length - 2) + localPart[localPart.length - 1];

  // 도메인 마스킹: 첫 글자와 TLD만 유지
  const dotIndex = domainPart.lastIndexOf(".");
  if (dotIndex === -1) {
    return `${maskedLocal}@***`;
  }

  const domainName = domainPart.slice(0, dotIndex);
  const tld = domainPart.slice(dotIndex);

  const maskedDomain =
    domainName.length <= 2
      ? "*".repeat(domainName.length)
      : domainName[0] + "*".repeat(domainName.length - 2) + domainName[domainName.length - 1];

  return `${maskedLocal}@${maskedDomain}${tld}`;
}

/**
 * 개인정보 마스킹 설정
 * 환경 변수로 마스킹 활성화/비활성화 가능
 */
const MASKING_ENABLED = process.env.AUDIT_LOG_MASKING !== "false";

// Type for SecurityAuditLog model (will be available after prisma generate)
type SecurityAuditLogCreateInput = {
  id: string;
  createdAt: Date;
  category: string;
  action: string;
  severity: string;
  success: boolean;
  userId: string | null;
  userEmail: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  path: string | null;
  method: string | null;
  details: Prisma.InputJsonValue | null;
  errorMessage: string | null;
};

type SecurityAuditLogRecord = {
  id: string;
  createdAt: Date;
  category: string;
  action: string;
  severity: string;
  success: boolean;
  userId: string | null;
  userEmail: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  path: string | null;
  method: string | null;
  details: Prisma.JsonValue | null;
  errorMessage: string | null;
};

/**
 * Check if SecurityAuditLog model is available
 * Returns false if migration hasn't been run yet
 */
function isSecurityAuditLogAvailable(): boolean {
  return 'securityAuditLog' in prisma;
}

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

// In-memory audit log (cache for recent events + fallback)
const auditEvents: AuditEvent[] = [];
const MAX_EVENTS = 10000;

// Database write queue for batching
const writeQueue: AuditEvent[] = [];
const BATCH_SIZE = 50;
const BATCH_INTERVAL_MS = 5000;
let batchTimer: NodeJS.Timeout | null = null;

/**
 * Generate unique event ID
 */
function generateEventId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `audit_${timestamp}_${random}`;
}

/**
 * Persist audit events to database in batches
 */
async function flushToDatabase(): Promise<void> {
  if (writeQueue.length === 0) return;

  // Skip DB persistence if model is not available yet
  if (!isSecurityAuditLogAvailable()) {
    // Clear queue to prevent memory growth - events are still in memory cache
    writeQueue.length = 0;
    return;
  }

  const eventsToWrite = writeQueue.splice(0, BATCH_SIZE);

  try {
    const data: SecurityAuditLogCreateInput[] = eventsToWrite.map((event) => ({
      id: event.id,
      createdAt: new Date(event.timestamp),
      category: event.category,
      action: event.action,
      severity: event.severity,
      success: event.success,
      userId: event.userId || null,
      userEmail: event.userEmail || null,
      ipAddress: event.ip || null,
      userAgent: event.userAgent || null,
      path: event.path || null,
      method: event.method || null,
      details: (event.details as Prisma.InputJsonValue) || null,
      errorMessage: event.error || null,
    }));

    // Use dynamic access to handle missing model gracefully
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).securityAuditLog.createMany({
      data,
      skipDuplicates: true,
    });

    recordCounter("audit.db_write.success", eventsToWrite.length);
  } catch (error) {
    // On failure, put events back in queue (at the front)
    writeQueue.unshift(...eventsToWrite);
    logger.error("[AuditLog] Failed to persist to database:", error);
    recordCounter("audit.db_write.error", 1);
  }

  // Schedule next flush if there are more events
  if (writeQueue.length > 0) {
    scheduleBatchFlush();
  }
}

/**
 * Schedule a batch flush
 */
function scheduleBatchFlush(): void {
  if (batchTimer) return;

  batchTimer = setTimeout(() => {
    batchTimer = null;
    flushToDatabase().catch((err) => {
      logger.error("[AuditLog] Batch flush error:", err);
    });
  }, BATCH_INTERVAL_MS);
}

/**
 * Queue an event for database persistence
 */
function queueForPersistence(event: AuditEvent): void {
  writeQueue.push(event);

  // Immediate flush if queue is large or event is critical
  if (writeQueue.length >= BATCH_SIZE || event.severity === "critical") {
    if (batchTimer) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }
    flushToDatabase().catch((err) => {
      logger.error("[AuditLog] Immediate flush error:", err);
    });
  } else {
    scheduleBatchFlush();
  }
}

/**
 * Log an audit event
 *
 * 개인정보 마스킹:
 * - IP 주소: 마지막 옥텟 마스킹
 * - userId: 해시 처리
 * - userEmail: 부분 마스킹
 *
 * 마스킹은 AUDIT_LOG_MASKING=false로 비활성화 가능
 */
export function audit(event: Omit<AuditEvent, "id" | "timestamp">): AuditEvent {
  // 개인정보 마스킹 적용 (GDPR 준수)
  const maskedEvent: Omit<AuditEvent, "id" | "timestamp"> = MASKING_ENABLED
    ? {
        ...event,
        ip: maskIp(event.ip),
        userId: hashUserId(event.userId),
        userEmail: maskEmail(event.userEmail),
      }
    : event;

  const fullEvent: AuditEvent = {
    id: generateEventId(),
    timestamp: new Date().toISOString(),
    ...maskedEvent,
  };

  // Add to in-memory log (for fast reads)
  auditEvents.push(fullEvent);
  if (auditEvents.length > MAX_EVENTS) {
    auditEvents.shift();
  }

  // Queue for database persistence (non-blocking)
  queueForPersistence(fullEvent);

  // Log to standard logger based on severity
  // 로그에도 마스킹된 데이터만 사용
  const logMessage = `[Audit:${event.category}] ${event.action}`;
  const logMeta = {
    eventId: fullEvent.id,
    userId: fullEvent.userId,
    ip: fullEvent.ip,
    success: fullEvent.success,
    details: fullEvent.details,
    error: fullEvent.error,
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

  // Record metrics (개인정보 미포함)
  recordCounter("audit.event", 1, {
    category: event.category,
    action: event.action,
    severity: event.severity,
    success: String(event.success),
  });

  return fullEvent;
}

/**
 * Get audit events with optional filtering (from in-memory cache)
 * For historical data, use getAuditEventsFromDb
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

/**
 * Get audit events from database (for historical queries)
 */
export async function getAuditEventsFromDb(options: {
  category?: AuditCategory;
  severity?: AuditSeverity;
  userId?: string;
  success?: boolean;
  since?: Date;
  until?: Date;
  limit?: number;
  offset?: number;
}): Promise<AuditEvent[]> {
  // Return empty if model is not available yet
  if (!isSecurityAuditLogAvailable()) {
    return [];
  }

  const where: Record<string, unknown> = {};

  if (options.category) where.category = options.category;
  if (options.severity) where.severity = options.severity;
  if (options.userId) where.userId = options.userId;
  if (options.success !== undefined) where.success = options.success;

  if (options.since || options.until) {
    where.createdAt = {};
    if (options.since) (where.createdAt as Record<string, Date>).gte = options.since;
    if (options.until) (where.createdAt as Record<string, Date>).lte = options.until;
  }

  // Use dynamic access to handle missing model gracefully
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const records: SecurityAuditLogRecord[] = await (prisma as any).securityAuditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options.limit || 100,
    skip: options.offset || 0,
  });

  return records.map((r) => ({
    id: r.id,
    timestamp: r.createdAt.toISOString(),
    category: r.category as AuditCategory,
    action: r.action,
    severity: r.severity as AuditSeverity,
    success: r.success,
    userId: r.userId || undefined,
    userEmail: r.userEmail || undefined,
    ip: r.ipAddress || undefined,
    userAgent: r.userAgent || undefined,
    path: r.path || undefined,
    method: r.method || undefined,
    details: (r.details as Record<string, unknown>) || undefined,
    error: r.errorMessage || undefined,
  }));
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
 * Get audit summary for dashboard (from in-memory cache)
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

/**
 * Get audit summary from database (for historical analysis)
 */
export async function getAuditSummaryFromDb(since?: Date): Promise<{
  total: number;
  byCategory: Record<AuditCategory, number>;
  bySeverity: Record<AuditSeverity, number>;
  failedAuth: number;
  suspiciousActivity: number;
}> {
  const emptyResult = {
    total: 0,
    byCategory: { auth: 0, admin: 0, token: 0, data: 0, security: 0, api: 0 },
    bySeverity: { info: 0, warn: 0, error: 0, critical: 0 },
    failedAuth: 0,
    suspiciousActivity: 0,
  };

  // Return empty if model is not available yet
  if (!isSecurityAuditLogAvailable()) {
    return emptyResult;
  }

  const where = since ? { createdAt: { gte: since } } : {};

  try {
    // Use dynamic access to handle missing model gracefully
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;

    const [
      total,
      categoryGroups,
      severityGroups,
      failedAuth,
      suspiciousActivity,
    ] = await Promise.all([
      db.securityAuditLog.count({ where }),
      db.securityAuditLog.groupBy({
        by: ["category"],
        where,
        _count: true,
      }),
      db.securityAuditLog.groupBy({
        by: ["severity"],
        where,
        _count: true,
      }),
      db.securityAuditLog.count({
        where: { ...where, category: "auth", success: false },
      }),
      db.securityAuditLog.count({
        where: { ...where, action: { startsWith: "suspicious_" } },
      }),
    ]);

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

    for (const g of categoryGroups) {
      if (g.category in byCategory) {
        byCategory[g.category as AuditCategory] = g._count;
      }
    }

    for (const g of severityGroups) {
      if (g.severity in bySeverity) {
        bySeverity[g.severity as AuditSeverity] = g._count;
      }
    }

    return {
      total,
      byCategory,
      bySeverity,
      failedAuth,
      suspiciousActivity,
    };
  } catch (error) {
    logger.error("[AuditLog] Failed to get summary from database:", error);
    return emptyResult;
  }
}

/**
 * Flush pending audit events to database (for graceful shutdown)
 */
export async function flushAuditLogs(): Promise<void> {
  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }

  while (writeQueue.length > 0) {
    await flushToDatabase();
  }
}
