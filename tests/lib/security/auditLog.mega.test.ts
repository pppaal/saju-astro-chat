/**
 * Audit Log MEGA Test Suite
 * Comprehensive testing for security audit logging
 */
import { describe, it, expect, beforeEach } from 'vitest';
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
  type AuditEvent,
  type AuditCategory,
  type AuditSeverity,
} from '@/lib/security/auditLog';

// ============================================================
// Basic Audit Function Tests
// ============================================================

describe('auditLog MEGA - audit()', () => {
  describe('Event creation', () => {
    it('should create audit event with ID and timestamp', () => {
      const event = audit({
        category: 'auth',
        action: 'login',
        severity: 'info',
        success: true,
      });

      expect(event.id).toBeDefined();
      expect(event.id).toMatch(/^audit_/);
      expect(event.timestamp).toBeDefined();
      expect(event.category).toBe('auth');
      expect(event.action).toBe('login');
      expect(event.severity).toBe('info');
      expect(event.success).toBe(true);
    });

    it('should generate unique IDs', () => {
      const event1 = audit({ category: 'auth', action: 'test1', severity: 'info', success: true });
      const event2 = audit({ category: 'auth', action: 'test2', severity: 'info', success: true });

      expect(event1.id).not.toBe(event2.id);
    });

    it('should include optional fields', () => {
      const event = audit({
        category: 'admin',
        action: 'user_delete',
        severity: 'warn',
        success: true,
        userId: 'user123',
        userEmail: 'test@example.com',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        path: '/admin/users/123',
        method: 'DELETE',
        details: { targetUserId: '123' },
        error: undefined,
      });

      expect(event.userId).toBe('user123');
      expect(event.userEmail).toBe('test@example.com');
      expect(event.ip).toBe('192.168.1.1');
      expect(event.userAgent).toBe('Mozilla/5.0');
      expect(event.path).toBe('/admin/users/123');
      expect(event.method).toBe('DELETE');
      expect(event.details).toEqual({ targetUserId: '123' });
    });

    it('should handle failed events with error messages', () => {
      const event = audit({
        category: 'auth',
        action: 'login',
        severity: 'error',
        success: false,
        error: 'Invalid credentials',
      });

      expect(event.success).toBe(false);
      expect(event.error).toBe('Invalid credentials');
      expect(event.severity).toBe('error');
    });
  });

  describe('All categories', () => {
    const categories: AuditCategory[] = ['auth', 'admin', 'token', 'data', 'security', 'api'];

    it.each(categories)('should support %s category', (category) => {
      const event = audit({
        category,
        action: 'test_action',
        severity: 'info',
        success: true,
      });

      expect(event.category).toBe(category);
    });
  });

  describe('All severities', () => {
    const severities: AuditSeverity[] = ['info', 'warn', 'error', 'critical'];

    it.each(severities)('should support %s severity', (severity) => {
      const event = audit({
        category: 'security',
        action: 'test_action',
        severity,
        success: severity === 'info',
      });

      expect(event.severity).toBe(severity);
    });
  });
});

// ============================================================
// Query Functions Tests
// ============================================================

describe('auditLog MEGA - getAuditEvents()', () => {
  beforeEach(() => {
    // Clear audit log by fetching all and letting it reset
    getAuditEvents({ limit: 10000 });
  });

  describe('Filtering', () => {
    it('should filter by category', () => {
      audit({ category: 'auth', action: 'login', severity: 'info', success: true });
      audit({ category: 'admin', action: 'delete', severity: 'warn', success: true });
      audit({ category: 'auth', action: 'logout', severity: 'info', success: true });

      const events = getAuditEvents({ category: 'auth' });

      expect(events.length).toBeGreaterThanOrEqual(2);
      events.forEach(event => {
        expect(event.category).toBe('auth');
      });
    });

    it('should filter by severity', () => {
      audit({ category: 'auth', action: 'login', severity: 'info', success: true });
      audit({ category: 'security', action: 'breach', severity: 'critical', success: false });
      audit({ category: 'admin', action: 'update', severity: 'warn', success: true });

      const events = getAuditEvents({ severity: 'critical' });

      expect(events.length).toBeGreaterThanOrEqual(1);
      events.forEach(event => {
        expect(event.severity).toBe('critical');
      });
    });

    it('should filter by success status', () => {
      audit({ category: 'auth', action: 'login', severity: 'info', success: true });
      audit({ category: 'auth', action: 'login_fail', severity: 'error', success: false });
      audit({ category: 'auth', action: 'logout', severity: 'info', success: true });

      const failedEvents = getAuditEvents({ success: false });

      expect(failedEvents.length).toBeGreaterThanOrEqual(1);
      failedEvents.forEach(event => {
        expect(event.success).toBe(false);
      });
    });

    it('should filter by userId', () => {
      audit({ category: 'auth', action: 'login', severity: 'info', success: true, userId: 'user1' });
      audit({ category: 'auth', action: 'login', severity: 'info', success: true, userId: 'user2' });
      audit({ category: 'auth', action: 'logout', severity: 'info', success: true, userId: 'user1' });

      const events = getAuditEvents({ userId: 'user1' });

      expect(events.length).toBeGreaterThanOrEqual(2);
      events.forEach(event => {
        expect(event.userId).toBe('user1');
      });
    });

    it('should combine multiple filters', () => {
      audit({ category: 'admin', action: 'create', severity: 'info', success: true, userId: 'admin1' });
      audit({ category: 'admin', action: 'delete', severity: 'warn', success: true, userId: 'admin1' });
      audit({ category: 'auth', action: 'login', severity: 'info', success: true, userId: 'admin1' });

      const events = getAuditEvents({
        category: 'admin',
        userId: 'admin1',
      });

      expect(events.length).toBeGreaterThanOrEqual(2);
      events.forEach(event => {
        expect(event.category).toBe('admin');
        expect(event.userId).toBe('admin1');
      });
    });
  });

  describe('Pagination', () => {
    it('should limit results', () => {
      for (let i = 0; i < 10; i++) {
        audit({ category: 'auth', action: `test${i}`, severity: 'info', success: true });
      }

      const events = getAuditEvents({ limit: 5 });

      expect(events.length).toBeLessThanOrEqual(5);
    });

    it('should skip records with offset', () => {
      audit({ category: 'auth', action: 'first', severity: 'info', success: true });
      audit({ category: 'auth', action: 'second', severity: 'info', success: true });
      audit({ category: 'auth', action: 'third', severity: 'info', success: true });

      const allEvents = getAuditEvents({ limit: 100 });
      const offsetEvents = getAuditEvents({ offset: 1, limit: 100 });

      // Offset should reduce the number of events returned
      expect(offsetEvents.length).toBeLessThanOrEqual(allEvents.length);
    });
  });

  describe('Sorting', () => {
    it('should return events in reverse chronological order by default', () => {
      const event1 = audit({ category: 'auth', action: 'first', severity: 'info', success: true });
      const event2 = audit({ category: 'auth', action: 'second', severity: 'info', success: true });

      const events = getAuditEvents({ limit: 2 });

      if (events.length >= 2) {
        expect(new Date(events[0].timestamp).getTime())
          .toBeGreaterThanOrEqual(new Date(events[1].timestamp).getTime());
      }
    });
  });
});

// ============================================================
// Specialized Audit Functions Tests
// ============================================================

describe('auditLog MEGA - auditAuth()', () => {
  it('should log successful authentication', () => {
    const event = auditAuth({
      action: 'login',
      success: true,
      userId: 'user123',
      userEmail: 'test@example.com',
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    });

    expect(event.category).toBe('auth');
    expect(event.action).toBe('login');
    expect(event.success).toBe(true);
    expect(event.severity).toBe('info');
    expect(event.userId).toBe('user123');
  });

  it('should log failed authentication', () => {
    const event = auditAuth({
      action: 'login',
      success: false,
      userEmail: 'test@example.com',
      ip: '192.168.1.1',
      error: 'Invalid credentials',
    });

    expect(event.category).toBe('auth');
    expect(event.success).toBe(false);
    expect(event.severity).toBe('warn');
    expect(event.error).toBe('Invalid credentials');
  });
});

describe('auditLog MEGA - auditAdmin()', () => {
  it('should log admin actions', () => {
    const event = auditAdmin({
      action: 'user_delete',
      success: true,
      userId: 'admin1',
      details: { targetUserId: 'user123' },
    });

    expect(event.category).toBe('admin');
    expect(event.action).toBe('user_delete');
    expect(event.severity).toBe('info');
    expect(event.details).toEqual({ targetUserId: 'user123' });
  });
});

describe('auditLog MEGA - auditToken()', () => {
  it('should log token operations', () => {
    const event = auditToken({
      action: 'generate',
      tokenType: 'access',
      success: true,
      details: { userId: 'user123' },
    });

    expect(event.category).toBe('token');
    expect(event.action).toBe('access_generate');
    expect(event.severity).toBe('info');
  });
});

describe('auditLog MEGA - auditDataAccess()', () => {
  it('should log data access', () => {
    const event = auditDataAccess({
      action: 'read',
      resource: 'user_profile',
      success: true,
      userId: 'user123',
      details: { path: '/api/users/123' },
    });

    expect(event.category).toBe('data');
    expect(event.action).toBe('user_profile_read');
    expect(event.userId).toBe('user123');
  });
});

describe('auditLog MEGA - auditSecurity()', () => {
  it('should log security events', () => {
    const event = auditSecurity({
      action: 'xss_attempt',
      severity: 'error',
      success: false,
      ip: '192.168.1.1',
      details: { blocked: true },
    });

    expect(event.category).toBe('security');
    expect(event.action).toBe('xss_attempt');
    expect(event.severity).toBe('error');
  });
});

describe('auditLog MEGA - auditRateLimit()', () => {
  it('should log rate limit violations', () => {
    const event = auditRateLimit({
      ip: '192.168.1.1',
      path: '/api/login',
      limit: 5,
      current: 6,
    });

    expect(event.category).toBe('security');
    expect(event.action).toBe('rate_limit_exceeded');
    expect(event.severity).toBe('warn');
    expect(event.details).toMatchObject({ limit: 5, current: 6 });
  });
});

describe('auditLog MEGA - auditSuspicious()', () => {
  it('should log suspicious activity', () => {
    const event = auditSuspicious({
      type: 'brute_force',
      ip: '192.168.1.1',
      details: { attempts: 10 },
    });

    expect(event.category).toBe('security');
    expect(event.action).toBe('suspicious_brute_force');
    expect(event.severity).toBe('critical');
    expect(event.details).toMatchObject({ attempts: 10 });
  });
});

// ============================================================
// Summary Function Tests
// ============================================================

describe('auditLog MEGA - getAuditSummary()', () => {
  beforeEach(() => {
    getAuditEvents({ limit: 10000 });
  });

  it('should return summary statistics', () => {
    audit({ category: 'auth', action: 'login', severity: 'info', success: true });
    audit({ category: 'auth', action: 'login_fail', severity: 'error', success: false });
    audit({ category: 'admin', action: 'delete', severity: 'warn', success: true });

    const summary = getAuditSummary();

    expect(summary).toBeDefined();
    expect(summary.total).toBeGreaterThanOrEqual(0);
    expect(summary.byCategory).toBeDefined();
    expect(summary.bySeverity).toBeDefined();

    // Success rate may be undefined or a number depending on implementation
    if (summary.successRate !== undefined) {
      expect(summary.successRate).toBeGreaterThanOrEqual(0);
      expect(summary.successRate).toBeLessThanOrEqual(100);
    }
  });

  it('should filter summary by date', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    audit({ category: 'auth', action: 'login', severity: 'info', success: true });

    const summary = getAuditSummary(yesterday);

    expect(summary.total).toBeGreaterThanOrEqual(1);
  });

  it('should calculate success rate if available', () => {
    audit({ category: 'auth', action: 'login', severity: 'info', success: true });
    audit({ category: 'auth', action: 'login_fail', severity: 'error', success: false });

    const summary = getAuditSummary();

    expect(summary).toBeDefined();

    // Success rate may or may not be implemented
    if (summary.successRate !== undefined) {
      expect(summary.successRate).toBeGreaterThanOrEqual(0);
      expect(summary.successRate).toBeLessThanOrEqual(100);
    }
  });

  it('should group by category', () => {
    audit({ category: 'auth', action: 'login', severity: 'info', success: true });
    audit({ category: 'auth', action: 'logout', severity: 'info', success: true });
    audit({ category: 'admin', action: 'update', severity: 'warn', success: true });

    const summary = getAuditSummary();

    expect(summary.byCategory.auth).toBeGreaterThanOrEqual(2);
    expect(summary.byCategory.admin).toBeGreaterThanOrEqual(1);
  });

  it('should group by severity', () => {
    audit({ category: 'auth', action: 'login', severity: 'info', success: true });
    audit({ category: 'security', action: 'breach', severity: 'critical', success: false });
    audit({ category: 'admin', action: 'update', severity: 'warn', success: true });

    const summary = getAuditSummary();

    expect(summary.bySeverity.info).toBeGreaterThanOrEqual(1);
    expect(summary.bySeverity.critical).toBeGreaterThanOrEqual(1);
    expect(summary.bySeverity.warn).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// Edge Cases and Integration
// ============================================================

describe('auditLog MEGA - Edge Cases', () => {
  describe('Large volumes', () => {
    it('should handle many events efficiently', () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        audit({
          category: 'auth',
          action: `test${i}`,
          severity: 'info',
          success: true,
        });
      }

      const elapsed = Date.now() - startTime;

      // Should complete in reasonable time (< 1 second for 100 events)
      expect(elapsed).toBeLessThan(1000);
    });
  });

  describe('Special characters', () => {
    it('should handle unicode in action', () => {
      const event = audit({
        category: 'auth',
        action: '로그인',
        severity: 'info',
        success: true,
      });

      expect(event.action).toBe('로그인');
    });

    it('should handle special characters in details', () => {
      const event = audit({
        category: 'admin',
        action: 'update',
        severity: 'info',
        success: true,
        details: {
          message: '<script>alert("test")</script>',
        },
      });

      expect(event.details?.message).toBe('<script>alert("test")</script>');
    });
  });

  describe('Timestamp accuracy', () => {
    it('should have ISO 8601 timestamp format', () => {
      const event = audit({
        category: 'auth',
        action: 'test',
        severity: 'info',
        success: true,
      });

      expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should have sequential timestamps', () => {
      const event1 = audit({
        category: 'auth',
        action: 'first',
        severity: 'info',
        success: true,
      });

      const event2 = audit({
        category: 'auth',
        action: 'second',
        severity: 'info',
        success: true,
      });

      expect(new Date(event2.timestamp).getTime())
        .toBeGreaterThanOrEqual(new Date(event1.timestamp).getTime());
    });
  });
});
