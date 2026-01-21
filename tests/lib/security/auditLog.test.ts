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

    it("should include all provided fields", () => {
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
      expect(event.userId).toBe("admin1");
      expect(event.userEmail).toBe("admin@test.com");
      expect(event.ip).toBe("192.168.1.1");
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
});
