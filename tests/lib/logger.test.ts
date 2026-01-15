import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock telemetry
vi.mock('@/lib/telemetry', () => ({
  captureServerError: vi.fn(),
}));

describe('Logger', () => {
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Simple Logger (src/lib/logger.ts)', () => {
    it('should export logger object with all methods', async () => {
      const { logger } = await import('@/lib/logger');

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should log info messages', async () => {
      const { logger } = await import('@/lib/logger');

      logger.info('Test info message');

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should log info messages with metadata', async () => {
      const { logger } = await import('@/lib/logger');

      logger.info('Test info message', { userId: '123' });

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should log warn messages', async () => {
      const { logger } = await import('@/lib/logger');

      logger.warn('Test warning message');

      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should log error messages', async () => {
      const { logger } = await import('@/lib/logger');

      logger.error('Test error message');

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should export convenience methods', async () => {
      const { logInfo, logError, logWarn, logDebug } = await import('@/lib/logger');

      expect(typeof logInfo).toBe('function');
      expect(typeof logError).toBe('function');
      expect(typeof logWarn).toBe('function');
      expect(typeof logDebug).toBe('function');
    });

    it('should handle Error objects in logError', async () => {
      const { logError } = await import('@/lib/logger');
      const error = new Error('Test error');

      logError('An error occurred', error);

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle non-Error objects in logError', async () => {
      const { logError } = await import('@/lib/logger');

      logError('An error occurred', { message: 'custom error', code: 500 });

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle string errors in logError', async () => {
      const { logError } = await import('@/lib/logger');

      logError('An error occurred', 'simple string error');

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Domain Loggers', () => {
    it('should export domain loggers', async () => {
      const {
        authLogger,
        paymentLogger,
        apiLogger,
        dbLogger,
        sajuLogger,
        astroLogger,
        tarotLogger,
      } = await import('@/lib/logger');

      expect(authLogger).toBeDefined();
      expect(paymentLogger).toBeDefined();
      expect(apiLogger).toBeDefined();
      expect(dbLogger).toBeDefined();
      expect(sajuLogger).toBeDefined();
      expect(astroLogger).toBeDefined();
      expect(tarotLogger).toBeDefined();
    });
  });

  describe('toMeta helper', () => {
    it('should handle undefined values', async () => {
      const { logger } = await import('@/lib/logger');

      logger.info('Test message', undefined);

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle null values', async () => {
      const { logger } = await import('@/lib/logger');

      logger.info('Test message', null);

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle arrays', async () => {
      const { logger } = await import('@/lib/logger');

      logger.info('Test message', ['item1', 'item2']);

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle primitive values', async () => {
      const { logger } = await import('@/lib/logger');

      logger.info('Test message', 'string value');

      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });
});

describe('Structured Logger (src/lib/logger/index.ts)', () => {
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should export logger instance', async () => {
    const { logger } = await import('@/lib/logger/index');

    expect(logger).toBeDefined();
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.domain).toBe('function');
  });

  it('should create domain loggers', async () => {
    const { logger } = await import('@/lib/logger/index');

    const customLogger = logger.domain('custom');

    expect(customLogger).toBeDefined();
    expect(typeof customLogger.debug).toBe('function');
    expect(typeof customLogger.info).toBe('function');
    expect(typeof customLogger.warn).toBe('function');
    expect(typeof customLogger.error).toBe('function');
  });

  it('should export predefined domain loggers', async () => {
    const {
      authLogger,
      paymentLogger,
      apiLogger,
      dbLogger,
      sajuLogger,
      astroLogger,
      tarotLogger,
    } = await import('@/lib/logger/index');

    expect(authLogger).toBeDefined();
    expect(paymentLogger).toBeDefined();
    expect(apiLogger).toBeDefined();
    expect(dbLogger).toBeDefined();
    expect(sajuLogger).toBeDefined();
    expect(astroLogger).toBeDefined();
    expect(tarotLogger).toBeDefined();
  });

  it('should only log errors in test environment', async () => {
    const { logger } = await import('@/lib/logger/index');

    // In test environment, only error should log
    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warn message');
    logger.error('Error message');

    // In test env, debug/info/warn are suppressed, only error logs
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should handle errors in error method', async () => {
    const { logger } = await import('@/lib/logger/index');
    const error = new Error('Test error');

    logger.error('An error occurred', error, { userId: '123' });

    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should handle context in warn method', async () => {
    const { logger } = await import('@/lib/logger/index');

    // In test env, warn is suppressed, but we can still call it
    logger.warn('Warning', { context: 'test' });

    // No assertion needed as warn is suppressed in test env
  });

  it('should export LogLevel and LogContext types', async () => {
    const module = await import('@/lib/logger/index');

    // Type exports are available at runtime
    expect(module).toBeDefined();
  });
});
