import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// 테스트 환경에서는 NODE_ENV가 'test'로 설정되어 있으므로
// error만 로깅됩니다.

describe('Logger', () => {
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    // Mock console methods
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic logging in test environment', () => {
    it('should not log debug in test environment', async () => {
      const { logger } = await import('@/lib/logger');
      logger.debug('Debug message');
      // In test env, only errors are logged
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('should not log info in test environment', async () => {
      const { logger } = await import('@/lib/logger');
      logger.info('Info message');
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('should not log warn in test environment', async () => {
      const { logger } = await import('@/lib/logger');
      logger.warn('Warn message');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should log error in test environment', async () => {
      const { logger } = await import('@/lib/logger');
      logger.error('Error message');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('error() method', () => {
    it('should log error with Error object', async () => {
      const { logger } = await import('@/lib/logger');
      const error = new Error('Something went wrong');
      logger.error('Failed to process', error);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('Failed to process');
      expect(loggedMessage).toContain('Something went wrong');
    });

    it('should log error with context object', async () => {
      const { logger } = await import('@/lib/logger');
      const context = { userId: '456', action: 'payment' };
      logger.error('Payment failed', context);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];

      // JSON 형식으로 로깅되는지 확인
      expect(() => JSON.parse(loggedMessage)).not.toThrow();
      const parsed = JSON.parse(loggedMessage);
      expect(parsed.message).toBe('Payment failed');
      expect(parsed.context).toEqual(context);
    });

    it('should log error with primitive value', async () => {
      const { logger } = await import('@/lib/logger');
      logger.error('Error with value', 'some string');
      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];

      const parsed = JSON.parse(loggedMessage);
      expect(parsed.message).toBe('Error with value');
      expect(parsed.context.value).toBe('some string');
    });

    it('should log error without context', async () => {
      const { logger } = await import('@/lib/logger');
      logger.error('Simple error');
      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];

      const parsed = JSON.parse(loggedMessage);
      expect(parsed.message).toBe('Simple error');
      expect(parsed.level).toBe('error');
    });

    it('should handle number value as context', async () => {
      const { logger } = await import('@/lib/logger');
      logger.error('Error with number', 42);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];

      const parsed = JSON.parse(loggedMessage);
      expect(parsed.context.value).toBe(42);
    });
  });

  describe('JSON formatting in test/production', () => {
    it('should format as JSON', async () => {
      const { logger } = await import('@/lib/logger');
      logger.error('JSON log');
      expect(consoleErrorSpy).toHaveBeenCalled();
      const message = consoleErrorSpy.mock.calls[0][0];

      // Should be valid JSON
      expect(() => JSON.parse(message)).not.toThrow();
      const parsed = JSON.parse(message);
      expect(parsed.level).toBe('error');
      expect(parsed.message).toBe('JSON log');
      expect(parsed.timestamp).toBeDefined();
    });

    it('should include context in JSON format', async () => {
      const { logger } = await import('@/lib/logger');
      logger.error('Log with context', { userId: '789' });
      const message = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(message);
      expect(parsed.context).toEqual({ userId: '789' });
    });

    it('should include error in JSON format', async () => {
      const { logger } = await import('@/lib/logger');
      const error = new Error('JSON error');
      logger.error('Error log', error);
      const message = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(message);
      expect(parsed.error).toBeDefined();
      expect(parsed.error.message).toBe('JSON error');
      expect(parsed.error.name).toBe('Error');
      expect(parsed.error.stack).toBeDefined();
    });
  });

  describe('DomainLogger', () => {
    it('should prefix messages with domain name', async () => {
      const { authLogger } = await import('@/lib/logger');
      authLogger.error('User authentication error');
      expect(consoleErrorSpy).toHaveBeenCalled();
      const message = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(message);
      expect(parsed.message).toContain('[auth]');
      expect(parsed.message).toContain('User authentication error');
    });

    it('should work with payment logger', async () => {
      const { paymentLogger } = await import('@/lib/logger');
      paymentLogger.error('Payment error');
      expect(consoleErrorSpy).toHaveBeenCalled();
      const message = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(message);
      expect(parsed.message).toContain('[payment]');
      expect(parsed.message).toContain('Payment error');
    });

    it('should pass context correctly', async () => {
      const { authLogger } = await import('@/lib/logger');
      authLogger.error('Login error', { userId: '123' });
      expect(consoleErrorSpy).toHaveBeenCalled();
      const message = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(message);
      expect(parsed.message).toContain('[auth]');
      expect(parsed.context.userId).toBe('123');
    });

    it('should create custom domain logger', async () => {
      const { logger } = await import('@/lib/logger');
      const customLogger = logger.domain('custom');
      customLogger.error('Custom log');
      expect(consoleErrorSpy).toHaveBeenCalled();
      const message = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(message);
      expect(parsed.message).toContain('[custom]');
    });
  });

  describe('Exported domain loggers', () => {
    it('should export apiLogger', async () => {
      const { apiLogger } = await import('@/lib/logger');
      expect(apiLogger).toBeDefined();
      apiLogger.error('API error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should export dbLogger', async () => {
      const { dbLogger } = await import('@/lib/logger');
      expect(dbLogger).toBeDefined();
      dbLogger.error('DB error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should export sajuLogger', async () => {
      const { sajuLogger } = await import('@/lib/logger');
      expect(sajuLogger).toBeDefined();
      sajuLogger.error('Saju error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should export astroLogger', async () => {
      const { astroLogger } = await import('@/lib/logger');
      expect(astroLogger).toBeDefined();
      astroLogger.error('Astro error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should export tarotLogger', async () => {
      const { tarotLogger } = await import('@/lib/logger');
      expect(tarotLogger).toBeDefined();
      tarotLogger.error('Tarot error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Timestamp', () => {
    it('should include ISO timestamp', async () => {
      const { logger } = await import('@/lib/logger');
      logger.error('Test timestamp');
      const message = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(message);

      expect(parsed.timestamp).toBeDefined();
      expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined context', async () => {
      const { logger } = await import('@/lib/logger');
      logger.error('Message', undefined);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const message = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(message);
      expect(parsed.message).toBe('Message');
    });

    it('should handle empty string message', async () => {
      const { logger } = await import('@/lib/logger');
      logger.error('');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle error without stack', async () => {
      const { logger } = await import('@/lib/logger');
      const error = new Error('No stack');
      delete error.stack;
      logger.error('Error without stack', error);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const message = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(message);
      expect(parsed.error.message).toBe('No stack');
    });

    it('should handle complex nested context', async () => {
      const { logger } = await import('@/lib/logger');
      const context = {
        user: { id: '123', name: 'Test' },
        meta: { timestamp: Date.now(), nested: { deep: true } }
      };
      logger.error('Complex context', context);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const message = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(message);
      expect(parsed.context.user.id).toBe('123');
      expect(parsed.context.meta.nested.deep).toBe(true);
    });

    it('should handle null as primitive value', async () => {
      const { logger } = await import('@/lib/logger');
      logger.error('Null value', null as unknown as undefined);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle boolean value', async () => {
      const { logger } = await import('@/lib/logger');
      logger.error('Boolean value', false);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const message = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(message);
      expect(parsed.context.value).toBe(false);
    });
  });

  describe('Module exports', () => {
    it('should export logger as named export', async () => {
      const { logger } = await import('@/lib/logger');
      expect(logger).toBeDefined();
      expect(logger.error).toBeTypeOf('function');
      expect(logger.warn).toBeTypeOf('function');
      expect(logger.info).toBeTypeOf('function');
      expect(logger.debug).toBeTypeOf('function');
      expect(logger.domain).toBeTypeOf('function');
    });
  });

  describe('Error object handling', () => {
    it('should handle error with custom properties', async () => {
      const { logger } = await import('@/lib/logger');
      const error = new Error('Custom error') as Error & { code: string };
      error.code = 'ERR_CUSTOM';
      logger.error('Error with code', error);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const message = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(message);
      expect(parsed.error.message).toBe('Custom error');
    });

    it('should handle TypeError', async () => {
      const { logger } = await import('@/lib/logger');
      const error = new TypeError('Type error');
      logger.error('Type error occurred', error);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const message = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(message);
      expect(parsed.error.name).toBe('TypeError');
      expect(parsed.error.message).toBe('Type error');
    });

    it('should handle RangeError', async () => {
      const { logger } = await import('@/lib/logger');
      const error = new RangeError('Range error');
      logger.error('Range error occurred', error);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const message = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(message);
      expect(parsed.error.name).toBe('RangeError');
    });
  });
});
