/**
 * Tests for Security Audit Logging
 * src/lib/security/auditLog.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  audit,
  getAuditEvents,
  auditAuth,
  auditAdmin,
  auditToken,
  auditDataAccess,
  auditSecurity,
  auditRateLimit,
  auditSuspicious,
  getAuditSummary,
  // Privacy masking utilities
  maskIp,
  hashUserId,
  maskEmail,
} from "@/lib/security/auditLog";

// Mock dependencies
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/metrics", () => ({
  recordCounter: vi.fn(),
}));

describe("Audit Logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("audit function", () => {
    it("should create audit event with generated id and timestamp", () => {
      const event = audit({
        category: "auth",
        action: "login",
        severity: "info",
        success: true,
        userId: "user123",
      });

      expect(event.id).toMatch(/^audit_[a-z0-9]+_[a-z0-9]+$/);
      expect(event.timestamp).toBeDefined();
      expect(new Date(event.timestamp).getTime()).not.toBeNaN();
    });

    it("should include all provided fields (with masking applied)", () => {
      const event = audit({
        category: "admin",
        action: "delete_user",
        severity: "warn",
        success: true,
        userId: "admin1",
        userEmail: "admin@test.com",
        ip: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        path: "/api/admin/users",
        method: "DELETE",
        details: { targetUserId: "user456" },
      });

      expect(event.category).toBe("admin");
      expect(event.action).toBe("delete_user");
      expect(event.severity).toBe("warn");
      expect(event.success).toBe(true);
      // userId is now hashed for privacy
      expect(event.userId).toMatch(/^usr_[a-f0-9]{12}$/);
      // userEmail is now masked
      expect(event.userEmail).not.toBe("admin@test.com");
      expect(event.userEmail).toContain("@");
      // IP is now masked
      expect(event.ip).toBe("192.168.1.xxx");
      expect(event.details).toEqual({ targetUserId: "user456" });
    });

    it("should include error message for failed events", () => {
      const event = audit({
        category: "auth",
        action: "login",
        severity: "error",
        success: false,
        error: "Invalid credentials",
      });

      expect(event.success).toBe(false);
      expect(event.error).toBe("Invalid credentials");
    });
  });

  describe("getAuditEvents", () => {
    beforeEach(() => {
      // Create some test events
      audit({ category: "auth", action: "login", severity: "info", success: true, userId: "user1" });
      audit({ category: "auth", action: "login", severity: "warn", success: false, userId: "user2" });
      audit({ category: "admin", action: "update", severity: "info", success: true, userId: "admin1" });
      audit({ category: "security", action: "suspicious_scan", severity: "critical", success: false });
    });

    it("should filter by category", () => {
      const events = getAuditEvents({ category: "auth" });
      expect(events.every((e) => e.category === "auth")).toBe(true);
    });

    it("should filter by severity", () => {
      const events = getAuditEvents({ severity: "critical" });
      expect(events.every((e) => e.severity === "critical")).toBe(true);
    });

    it("should filter by userId", () => {
      const events = getAuditEvents({ userId: "user1" });
      expect(events.every((e) => e.userId === "user1")).toBe(true);
    });

    it("should filter by success status", () => {
      const successEvents = getAuditEvents({ success: true });
      expect(successEvents.every((e) => e.success === true)).toBe(true);

      const failedEvents = getAuditEvents({ success: false });
      expect(failedEvents.every((e) => e.success === false)).toBe(true);
    });

    it("should limit results", () => {
      const events = getAuditEvents({ limit: 2 });
      expect(events.length).toBeLessThanOrEqual(2);
    });

    it("should return most recent first", () => {
      const events = getAuditEvents({ limit: 10 });
      for (let i = 1; i < events.length; i++) {
        expect(new Date(events[i - 1].timestamp).getTime())
          .toBeGreaterThanOrEqual(new Date(events[i].timestamp).getTime());
      }
    });
  });

  describe("auditAuth", () => {
    it("should log successful login", () => {
      const event = auditAuth({
        action: "login",
        success: true,
        userId: "user123",
        userEmail: "user@test.com",
        ip: "192.168.1.1",
        method: "google",
      });

      expect(event.category).toBe("auth");
      expect(event.action).toBe("login");
      expect(event.severity).toBe("info");
      expect(event.success).toBe(true);
      expect(event.details).toEqual({ method: "google" });
    });

    it("should log failed login with warning severity", () => {
      const event = auditAuth({
        action: "login",
        success: false,
        userEmail: "user@test.com",
        ip: "192.168.1.1",
        method: "credentials",
        error: "Invalid password",
      });

      expect(event.severity).toBe("warn");
      expect(event.success).toBe(false);
      expect(event.error).toBe("Invalid password");
    });

    it("should log logout event", () => {
      const event = auditAuth({
        action: "logout",
        success: true,
        userId: "user123",
      });

      expect(event.action).toBe("logout");
    });

    it("should log password reset", () => {
      const event = auditAuth({
        action: "password_reset",
        success: true,
        userEmail: "user@test.com",
      });

      expect(event.action).toBe("password_reset");
    });
  });

  describe("auditAdmin", () => {
    it("should log admin action with info severity on success", () => {
      const event = auditAdmin({
        action: "create_user",
        success: true,
        userId: "admin123",
        userEmail: "admin@test.com",
        path: "/api/admin/users",
        details: { newUserId: "user456" },
      });

      expect(event.category).toBe("admin");
      expect(event.severity).toBe("info");
    });

    it("should log admin action with error severity on failure", () => {
      const event = auditAdmin({
        action: "delete_user",
        success: false,
        userId: "admin123",
        error: "User not found",
      });

      expect(event.severity).toBe("error");
      expect(event.error).toBe("User not found");
    });
  });

  describe("auditToken", () => {
    it("should log token validation", () => {
      const event = auditToken({
        action: "validate",
        tokenType: "api_key",
        success: true,
        ip: "192.168.1.1",
        version: "v2",
      });

      expect(event.category).toBe("token");
      expect(event.action).toBe("api_key_validate");
      expect(event.details).toEqual({ version: "v2" });
    });

    it("should log token rotation", () => {
      const event = auditToken({
        action: "rotate",
        tokenType: "refresh_token",
        success: true,
      });

      expect(event.action).toBe("refresh_token_rotate");
    });

    it("should log token revocation", () => {
      const event = auditToken({
        action: "revoke",
        tokenType: "access_token",
        success: true,
        details: { reason: "user_logout" },
      });

      expect(event.action).toBe("access_token_revoke");
    });
  });

  describe("auditDataAccess", () => {
    it("should log data read with info severity", () => {
      const event = auditDataAccess({
        action: "read",
        resource: "user_profile",
        resourceId: "user123",
        success: true,
        userId: "admin1",
      });

      expect(event.category).toBe("data");
      expect(event.action).toBe("user_profile_read");
      expect(event.severity).toBe("info");
    });

    it("should log data delete with warn severity", () => {
      const event = auditDataAccess({
        action: "delete",
        resource: "reading_history",
        resourceId: "reading456",
        success: true,
        userId: "user123",
      });

      expect(event.action).toBe("reading_history_delete");
      expect(event.severity).toBe("warn");
    });

    it("should log data export", () => {
      const event = auditDataAccess({
        action: "export",
        resource: "user_data",
        success: true,
        userId: "user123",
        details: { format: "json" },
      });

      expect(event.action).toBe("user_data_export");
    });
  });

  describe("auditSecurity", () => {
    it("should log security event with custom severity", () => {
      const event = auditSecurity({
        action: "failed_2fa",
        severity: "warn",
        success: false,
        userId: "user123",
        ip: "192.168.1.1",
      });

      expect(event.category).toBe("security");
      expect(event.severity).toBe("warn");
    });

    it("should log critical security event", () => {
      const event = auditSecurity({
        action: "privilege_escalation_attempt",
        severity: "critical",
        success: false,
        userId: "user123",
        path: "/api/admin",
      });

      expect(event.severity).toBe("critical");
    });
  });

  describe("auditRateLimit", () => {
    it("should log rate limit violation", () => {
      const event = auditRateLimit({
        ip: "192.168.1.1",
        path: "/api/chat",
        limit: 60,
        current: 65,
        userId: "user123",
      });

      expect(event.category).toBe("security");
      expect(event.action).toBe("rate_limit_exceeded");
      expect(event.severity).toBe("warn");
      expect(event.success).toBe(false);
      expect(event.details).toEqual({ limit: 60, current: 65 });
    });
  });

  describe("auditSuspicious", () => {
    it("should log injection attempt with critical severity", () => {
      const event = auditSuspicious({
        type: "injection_attempt",
        ip: "10.0.0.1",
        path: "/api/search",
        details: { payload: "<script>alert(1)</script>" },
      });

      expect(event.action).toBe("suspicious_injection_attempt");
      expect(event.severity).toBe("critical");
    });

    it("should log brute force attempt", () => {
      const event = auditSuspicious({
        type: "brute_force",
        ip: "10.0.0.1",
        details: { attempts: 100, timeWindow: "5m" },
      });

      expect(event.action).toBe("suspicious_brute_force");
    });

    it("should log scanner activity", () => {
      const event = auditSuspicious({
        type: "scanner",
        ip: "10.0.0.1",
        details: { userAgent: "nikto" },
      });

      expect(event.action).toBe("suspicious_scanner");
    });

    it("should log anomaly detection", () => {
      const event = auditSuspicious({
        type: "anomaly",
        ip: "10.0.0.1",
        details: { reason: "unusual_access_pattern" },
      });

      expect(event.action).toBe("suspicious_anomaly");
    });
  });

  describe("getAuditSummary", () => {
    beforeEach(() => {
      // Create varied events for summary
      auditAuth({ action: "login", success: true, userId: "u1" });
      auditAuth({ action: "login", success: false, userId: "u2" });
      auditAuth({ action: "login", success: false, userId: "u3" });
      auditAdmin({ action: "update", success: true, userId: "admin1" });
      auditSuspicious({ type: "injection_attempt", ip: "10.0.0.1" });
      auditSuspicious({ type: "brute_force", ip: "10.0.0.2" });
    });

    it("should count total events", () => {
      const summary = getAuditSummary();
      expect(summary.total).toBeGreaterThanOrEqual(6);
    });

    it("should count events by category", () => {
      const summary = getAuditSummary();
      expect(summary.byCategory.auth).toBeGreaterThanOrEqual(3);
      expect(summary.byCategory.admin).toBeGreaterThanOrEqual(1);
      expect(summary.byCategory.security).toBeGreaterThanOrEqual(2);
    });

    it("should count events by severity", () => {
      const summary = getAuditSummary();
      expect(summary.bySeverity.info).toBeGreaterThanOrEqual(1);
      expect(summary.bySeverity.warn).toBeGreaterThanOrEqual(2);
      expect(summary.bySeverity.critical).toBeGreaterThanOrEqual(2);
    });

    it("should count failed auth attempts", () => {
      const summary = getAuditSummary();
      expect(summary.failedAuth).toBeGreaterThanOrEqual(2);
    });

    it("should count suspicious activity", () => {
      const summary = getAuditSummary();
      expect(summary.suspiciousActivity).toBeGreaterThanOrEqual(2);
    });

    it("should filter by since date", () => {
      const futureDate = new Date(Date.now() + 86400000); // Tomorrow
      const summary = getAuditSummary(futureDate);
      expect(summary.total).toBe(0);
    });
  });

  // ============================================================
  // Privacy Masking Utilities Tests
  // ============================================================

  describe("maskIp", () => {
    it("should mask IPv4 addresses", () => {
      expect(maskIp("192.168.1.100")).toBe("192.168.1.xxx");
      expect(maskIp("10.0.0.1")).toBe("10.0.0.xxx");
      expect(maskIp("172.16.254.1")).toBe("172.16.254.xxx");
    });

    it("should mask IPv6 addresses", () => {
      const result = maskIp("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
      expect(result).toContain("2001:0db8:85a3:0000");
      expect(result).toContain("xxxx");
    });

    it("should handle null/undefined", () => {
      expect(maskIp(null)).toBeUndefined();
      expect(maskIp(undefined)).toBeUndefined();
    });

    it("should handle empty string", () => {
      expect(maskIp("")).toBeUndefined();
    });

    it("should handle unknown formats", () => {
      // "localhost" has 9 chars, so last 4 are replaced: "local" + "xxxx"
      expect(maskIp("localhost")).toBe("localxxxx");
      expect(maskIp("abc")).toBe("masked");
    });
  });

  describe("hashUserId", () => {
    it("should hash userId consistently", () => {
      const hash1 = hashUserId("user123");
      const hash2 = hashUserId("user123");
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different userIds", () => {
      const hash1 = hashUserId("user123");
      const hash2 = hashUserId("user456");
      expect(hash1).not.toBe(hash2);
    });

    it("should prefix with usr_", () => {
      const hash = hashUserId("user123");
      expect(hash).toMatch(/^usr_[a-f0-9]{12}$/);
    });

    it("should handle null/undefined", () => {
      expect(hashUserId(null)).toBeUndefined();
      expect(hashUserId(undefined)).toBeUndefined();
    });

    it("should handle empty string", () => {
      expect(hashUserId("")).toBeUndefined();
    });
  });

  describe("maskEmail", () => {
    it("should mask email addresses", () => {
      const masked = maskEmail("john.doe@example.com");
      expect(masked).not.toBe("john.doe@example.com");
      expect(masked).toContain("@");
      expect(masked).toContain(".com");
    });

    it("should keep first and last character of local part", () => {
      const masked = maskEmail("john@example.com");
      expect(masked).toMatch(/^j\*+n@/);
    });

    it("should handle short email parts", () => {
      const masked = maskEmail("ab@cd.com");
      expect(masked).toContain("@");
      expect(masked).toContain(".com");
    });

    it("should handle null/undefined", () => {
      expect(maskEmail(null)).toBeUndefined();
      expect(maskEmail(undefined)).toBeUndefined();
    });

    it("should handle invalid email format", () => {
      expect(maskEmail("notanemail")).toBe("***@***");
    });
  });

  describe("audit with masking", () => {
    it("should mask IP address in audit events", () => {
      const event = audit({
        category: "auth",
        action: "login",
        severity: "info",
        success: true,
        ip: "192.168.1.100",
      });

      // IP should be masked
      expect(event.ip).toBe("192.168.1.xxx");
    });

    it("should hash userId in audit events", () => {
      const event = audit({
        category: "auth",
        action: "login",
        severity: "info",
        success: true,
        userId: "user123",
      });

      // userId should be hashed
      expect(event.userId).toMatch(/^usr_[a-f0-9]{12}$/);
      expect(event.userId).not.toBe("user123");
    });

    it("should mask email in audit events", () => {
      const event = audit({
        category: "auth",
        action: "login",
        severity: "info",
        success: true,
        userEmail: "john.doe@example.com",
      });

      // Email should be masked
      expect(event.userEmail).not.toBe("john.doe@example.com");
      expect(event.userEmail).toContain("@");
    });
  });
});
