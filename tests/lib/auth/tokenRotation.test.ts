/**
 * Tests for Token Rotation Service
 * src/lib/auth/tokenRotation.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildTokenConfig,
  validateToken,
  generateSecureToken,
  hashToken,
  shouldRotate,
  logTokenAudit,
  getAuditLog,
  validatePublicToken,
  validateAdminToken,
  getTokenStatus,
  type TokenConfig,
} from '@/lib/auth/tokenRotation';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock metrics
vi.mock('@/lib/metrics', () => ({
  recordCounter: vi.fn(),
}));

describe('tokenRotation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('buildTokenConfig', () => {
    it('should build config from environment variables', () => {
      process.env.TEST_TOKEN = 'current-token-123';
      process.env.TEST_TOKEN_LEGACY = 'legacy-token-456';
      process.env.TEST_TOKEN_VERSION = '2';
      process.env.TEST_TOKEN_EXPIRES_AT = '1700000000000';

      const config = buildTokenConfig('TEST_TOKEN');

      expect(config.current).toBe('current-token-123');
      expect(config.legacy).toBe('legacy-token-456');
      expect(config.version).toBe(2);
      expect(config.expiresAt).toBe(1700000000000);
    });

    it('should handle missing optional values', () => {
      process.env.TEST_TOKEN = 'current-token';

      const config = buildTokenConfig('TEST_TOKEN');

      expect(config.current).toBe('current-token');
      expect(config.legacy).toBeUndefined();
      expect(config.version).toBe(1);
      expect(config.expiresAt).toBeUndefined();
    });

    it('should return empty string for missing token', () => {
      const config = buildTokenConfig('NONEXISTENT_TOKEN');

      expect(config.current).toBe('');
    });
  });

  describe('validateToken', () => {
    const baseConfig: TokenConfig = {
      current: 'valid-token-123',
      legacy: 'legacy-token-456',
      version: 1,
    };

    it('should return invalid for missing token', () => {
      const result = validateToken(null, baseConfig, 'test');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Token not provided');
    });

    it('should validate current token', () => {
      const result = validateToken('valid-token-123', baseConfig, 'test');

      expect(result.valid).toBe(true);
      expect(result.version).toBe('current');
    });

    it('should validate legacy token', () => {
      const result = validateToken('legacy-token-456', baseConfig, 'test');

      expect(result.valid).toBe(true);
      expect(result.version).toBe('legacy');
    });

    it('should return invalid for wrong token', () => {
      const result = validateToken('wrong-token', baseConfig, 'test');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid token');
    });

    it('should return invalid for expired token', () => {
      const expiredConfig: TokenConfig = {
        current: 'valid-token',
        expiresAt: Date.now() - 1000, // Expired 1 second ago
      };

      const result = validateToken('valid-token', expiredConfig, 'test');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Token expired');
    });

    it('should include expiresIn for valid non-expired token', () => {
      const futureExpiry = Date.now() + 3600000; // 1 hour from now
      const configWithExpiry: TokenConfig = {
        current: 'valid-token',
        expiresAt: futureExpiry,
      };

      const result = validateToken('valid-token', configWithExpiry, 'test');

      expect(result.valid).toBe(true);
      expect(result.expiresIn).toBeGreaterThan(0);
      expect(result.expiresIn).toBeLessThanOrEqual(3600000);
    });

    it('should log IP address in audit', () => {
      validateToken('valid-token-123', baseConfig, 'test', '192.168.1.1');

      const logs = getAuditLog(1);
      expect(logs[0].ip).toBe('192.168.1.1');
    });
  });

  describe('generateSecureToken', () => {
    it('should generate a base64url encoded token', () => {
      const token = generateSecureToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate tokens of correct length', () => {
      const token16 = generateSecureToken(16);
      const token32 = generateSecureToken(32);
      const token64 = generateSecureToken(64);

      // base64url encoding produces ~1.33x the input bytes
      expect(token16.length).toBeLessThan(token32.length);
      expect(token32.length).toBeLessThan(token64.length);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSecureToken());
      }

      expect(tokens.size).toBe(100);
    });
  });

  describe('hashToken', () => {
    it('should hash token using SHA-256', () => {
      const token = 'test-token-123';
      const hash = hashToken(token);

      expect(hash).toBeDefined();
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex chars
    });

    it('should produce consistent hashes', () => {
      const token = 'consistent-token';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different tokens', () => {
      const hash1 = hashToken('token-a');
      const hash2 = hashToken('token-b');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('shouldRotate', () => {
    it('should recommend rotation when expiring soon', () => {
      const config: TokenConfig = {
        current: 'token',
        expiresAt: Date.now() + 3 * 24 * 60 * 60 * 1000, // 3 days
      };

      const result = shouldRotate(config);

      expect(result.shouldRotate).toBe(true);
      expect(result.reason).toContain('expires in');
    });

    it('should not recommend rotation when far from expiry', () => {
      const config: TokenConfig = {
        current: 'token',
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      };

      const result = shouldRotate(config);

      expect(result.shouldRotate).toBe(false);
    });

    it('should not recommend rotation when legacy token exists', () => {
      const config: TokenConfig = {
        current: 'token',
        legacy: 'old-token',
      };

      const result = shouldRotate(config);

      expect(result.shouldRotate).toBe(false);
      expect(result.reason).toContain('Legacy token still active');
    });

    it('should handle config without expiry', () => {
      const config: TokenConfig = {
        current: 'token',
      };

      const result = shouldRotate(config);

      expect(result.shouldRotate).toBe(false);
    });
  });

  describe('logTokenAudit', () => {
    it('should add entry to audit log', () => {
      const initialLength = getAuditLog().length;

      logTokenAudit({
        action: 'validate',
        tokenType: 'test',
        success: true,
      });

      const logs = getAuditLog();
      expect(logs.length).toBe(initialLength + 1);
      expect(logs[logs.length - 1].action).toBe('validate');
    });

    it('should include timestamp', () => {
      logTokenAudit({
        action: 'rotate',
        tokenType: 'admin',
        success: true,
      });

      const logs = getAuditLog(1);
      expect(logs[0].timestamp).toBeDefined();
      expect(new Date(logs[0].timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should limit audit log size', () => {
      // Add many entries to exceed limit
      for (let i = 0; i < 1100; i++) {
        logTokenAudit({
          action: 'validate',
          tokenType: 'test',
          success: true,
        });
      }

      const logs = getAuditLog(2000);
      expect(logs.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('getAuditLog', () => {
    it('should return limited entries', () => {
      // Add some entries
      for (let i = 0; i < 50; i++) {
        logTokenAudit({
          action: 'validate',
          tokenType: 'test',
          success: true,
        });
      }

      const logs = getAuditLog(10);
      expect(logs.length).toBe(10);
    });

    it('should return most recent entries', () => {
      logTokenAudit({ action: 'validate', tokenType: 'first', success: true });
      logTokenAudit({ action: 'rotate', tokenType: 'second', success: true });
      logTokenAudit({ action: 'revoke', tokenType: 'third', success: false });

      const logs = getAuditLog(2);
      expect(logs[0].action).toBe('rotate');
      expect(logs[1].action).toBe('revoke');
    });
  });

  describe('validatePublicToken', () => {
    it('should validate in development without token', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.PUBLIC_API_TOKEN;

      const mockRequest = new Request('https://test.com', {
        headers: {},
      });

      const result = validatePublicToken(mockRequest);

      expect(result.valid).toBe(true);
    });

    it('should fail in production without configured token', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.PUBLIC_API_TOKEN;

      const mockRequest = new Request('https://test.com', {
        headers: {},
      });

      const result = validatePublicToken(mockRequest);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Token not configured');
    });

    it('should validate x-api-token header', () => {
      process.env.PUBLIC_API_TOKEN = 'public-token-123';

      const mockRequest = new Request('https://test.com', {
        headers: {
          'x-api-token': 'public-token-123',
        },
      });

      const result = validatePublicToken(mockRequest);

      expect(result.valid).toBe(true);
    });
  });

  describe('validateAdminToken', () => {
    it('should validate Bearer token', () => {
      process.env.ADMIN_API_TOKEN = 'admin-secret-123';

      const mockRequest = new Request('https://test.com', {
        headers: {
          authorization: 'Bearer admin-secret-123',
        },
      });

      const result = validateAdminToken(mockRequest);

      expect(result.valid).toBe(true);
    });

    it('should validate x-api-key header', () => {
      process.env.ADMIN_API_TOKEN = 'admin-secret-123';

      const mockRequest = new Request('https://test.com', {
        headers: {
          'x-api-key': 'admin-secret-123',
        },
      });

      const result = validateAdminToken(mockRequest);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid admin token', () => {
      process.env.ADMIN_API_TOKEN = 'admin-secret-123';

      const mockRequest = new Request('https://test.com', {
        headers: {
          authorization: 'Bearer wrong-token',
        },
      });

      const result = validateAdminToken(mockRequest);

      expect(result.valid).toBe(false);
    });
  });

  describe('getTokenStatus', () => {
    it('should return status for all token types', () => {
      process.env.PUBLIC_API_TOKEN = 'public-token';
      process.env.ADMIN_API_TOKEN = 'admin-token';
      process.env.ADMIN_API_TOKEN_LEGACY = 'admin-legacy';
      process.env.ADMIN_API_TOKEN_VERSION = '2';
      process.env.CRON_SECRET = 'cron-secret';
      process.env.PUBLIC_METRICS_TOKEN = 'metrics-token';

      const status = getTokenStatus();

      expect(status.public.configured).toBe(true);
      expect(status.public.hasLegacy).toBe(false);
      expect(status.admin.configured).toBe(true);
      expect(status.admin.hasLegacy).toBe(true);
      expect(status.admin.version).toBe(2);
      expect(status.cron.configured).toBe(true);
      expect(status.metrics.configured).toBe(true);
    });

    it('should handle missing tokens', () => {
      delete process.env.PUBLIC_API_TOKEN;
      delete process.env.ADMIN_API_TOKEN;
      delete process.env.CRON_SECRET;
      delete process.env.PUBLIC_METRICS_TOKEN;

      const status = getTokenStatus();

      expect(status.public.configured).toBe(false);
      expect(status.admin.configured).toBe(false);
      expect(status.cron.configured).toBe(false);
      expect(status.metrics.configured).toBe(false);
    });
  });
});
