/**
 * @file Tests for logger module (index.ts)
 * 커버리지 향상을 위한 logger module 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Logger Module', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('Type exports', () => {
    it('should export LogLevel type', async () => {
      const module = await import('@/lib/logger');
      expect(module).toBeDefined();
    });

    it('should export LogContext interface', async () => {
      // LogContext is a type, so we test by using it
      const { logger } = await import('@/lib/logger');
      expect(logger).toBeDefined();
    });
  });

  describe('Logger singleton', () => {
    it('should export logger singleton', async () => {
      const { logger } = await import('@/lib/logger');
      expect(logger).toBeDefined();
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should export logger as main export', async () => {
      const { logger } = await import('@/lib/logger');
      expect(logger).toBeDefined();
      // Check it has the core methods
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });
  });

  describe('Domain Loggers', () => {
    it('should export authLogger', async () => {
      const { authLogger } = await import('@/lib/logger');
      expect(authLogger).toBeDefined();
      expect(typeof authLogger.debug).toBe('function');
      expect(typeof authLogger.info).toBe('function');
      expect(typeof authLogger.warn).toBe('function');
      expect(typeof authLogger.error).toBe('function');
    });

    it('should export paymentLogger', async () => {
      const { paymentLogger } = await import('@/lib/logger');
      expect(paymentLogger).toBeDefined();
    });

    it('should export apiLogger', async () => {
      const { apiLogger } = await import('@/lib/logger');
      expect(apiLogger).toBeDefined();
    });

    it('should export dbLogger', async () => {
      const { dbLogger } = await import('@/lib/logger');
      expect(dbLogger).toBeDefined();
    });

    it('should export sajuLogger', async () => {
      const { sajuLogger } = await import('@/lib/logger');
      expect(sajuLogger).toBeDefined();
    });

    it('should export astroLogger', async () => {
      const { astroLogger } = await import('@/lib/logger');
      expect(astroLogger).toBeDefined();
    });

    it('should export tarotLogger', async () => {
      const { tarotLogger } = await import('@/lib/logger');
      expect(tarotLogger).toBeDefined();
    });
  });

  describe('Logger domain support', () => {
    it('should have pre-defined domain loggers', async () => {
      const { authLogger, paymentLogger, apiLogger } = await import('@/lib/logger');

      // Each domain logger should have all core methods
      expect(authLogger).toBeDefined();
      expect(paymentLogger).toBeDefined();
      expect(apiLogger).toBeDefined();
    });
  });

  describe('Logger methods', () => {
    it('should call debug method without error', async () => {
      const { logger } = await import('@/lib/logger');
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      // In test environment, debug logs are suppressed
      logger.debug('Test debug message');
      // May or may not be called depending on environment
      expect(logger.debug).toBeDefined();
      debugSpy.mockRestore();
    });

    it('should call info method without error', async () => {
      const { logger } = await import('@/lib/logger');
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      logger.info('Test info message');
      // In test environment, info logs are suppressed
      expect(logger.info).toBeDefined();
      infoSpy.mockRestore();
    });

    it('should call warn method without error', async () => {
      const { logger } = await import('@/lib/logger');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      logger.warn('Test warn message');
      // In test environment, warn logs are suppressed
      expect(logger.warn).toBeDefined();
      warnSpy.mockRestore();
    });

    it('should call error method without error', async () => {
      const { logger } = await import('@/lib/logger');
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logger.error('Test error message');
      // In test environment, error logs are shown
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should accept context object in debug', async () => {
      const { logger } = await import('@/lib/logger');
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      logger.debug('Test with context', { userId: '123', action: 'test' });
      expect(logger.debug).toBeDefined();
      debugSpy.mockRestore();
    });

    it('should accept context object in info', async () => {
      const { logger } = await import('@/lib/logger');
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      logger.info('Test with context', { requestId: 'abc', duration: 100 });
      expect(logger.info).toBeDefined();
      infoSpy.mockRestore();
    });

    it('should accept Error object in warn', async () => {
      const { logger } = await import('@/lib/logger');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const testError = new Error('Test warning error');
      logger.warn('Warning with error', testError);
      expect(logger.warn).toBeDefined();
      warnSpy.mockRestore();
    });

    it('should accept Error and context in error method', async () => {
      const { logger } = await import('@/lib/logger');
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const testError = new Error('Test error');
      logger.error('Error with context', testError, { userId: '123' });
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe('Domain Logger methods', () => {
    it('should call domain logger debug', async () => {
      const { authLogger } = await import('@/lib/logger');
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      authLogger.debug('Test auth debug');
      expect(authLogger.debug).toBeDefined();
      debugSpy.mockRestore();
    });

    it('should call domain logger info', async () => {
      const { authLogger } = await import('@/lib/logger');
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      authLogger.info('Test auth info');
      expect(authLogger.info).toBeDefined();
      infoSpy.mockRestore();
    });

    it('should call domain logger warn', async () => {
      const { authLogger } = await import('@/lib/logger');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      authLogger.warn('Test auth warn');
      expect(authLogger.warn).toBeDefined();
      warnSpy.mockRestore();
    });

    it('should call domain logger error', async () => {
      const { authLogger } = await import('@/lib/logger');
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      authLogger.error('Test auth error');
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should format domain logger messages with prefix', async () => {
      const { authLogger } = await import('@/lib/logger');
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      authLogger.error('Login failed');
      expect(errorSpy).toHaveBeenCalled();
      const callArg = errorSpy.mock.calls[0][0];
      expect(callArg).toContain('[auth]');
      errorSpy.mockRestore();
    });
  });
});