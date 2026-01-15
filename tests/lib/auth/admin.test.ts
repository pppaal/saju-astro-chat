import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isAdminEmail } from '@/lib/auth/admin';

describe('admin', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isAdminEmail', () => {
    it('should return false for empty email', () => {
      expect(isAdminEmail('')).toBe(false);
      expect(isAdminEmail(null)).toBe(false);
      expect(isAdminEmail(undefined)).toBe(false);
    });

    it('should return false when ADMIN_EMAILS not set', () => {
      delete process.env.ADMIN_EMAILS;
      expect(isAdminEmail('test@example.com')).toBe(false);
    });

    it('should return true for admin email', () => {
      process.env.ADMIN_EMAILS = 'admin@example.com';
      expect(isAdminEmail('admin@example.com')).toBe(true);
    });

    it('should be case insensitive', () => {
      process.env.ADMIN_EMAILS = 'Admin@Example.COM';
      expect(isAdminEmail('admin@example.com')).toBe(true);
      expect(isAdminEmail('ADMIN@EXAMPLE.COM')).toBe(true);
    });

    it('should handle multiple admin emails', () => {
      process.env.ADMIN_EMAILS = 'admin1@example.com, admin2@example.com, admin3@example.com';
      expect(isAdminEmail('admin1@example.com')).toBe(true);
      expect(isAdminEmail('admin2@example.com')).toBe(true);
      expect(isAdminEmail('admin3@example.com')).toBe(true);
      expect(isAdminEmail('notadmin@example.com')).toBe(false);
    });

    it('should trim whitespace', () => {
      process.env.ADMIN_EMAILS = '  admin@example.com  ';
      expect(isAdminEmail('admin@example.com')).toBe(true);
      expect(isAdminEmail('  admin@example.com  ')).toBe(true);
    });

    it('should handle empty entries in list', () => {
      process.env.ADMIN_EMAILS = 'admin@example.com,,another@example.com,';
      expect(isAdminEmail('admin@example.com')).toBe(true);
      expect(isAdminEmail('another@example.com')).toBe(true);
    });
  });
});
