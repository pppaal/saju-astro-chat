import { describe, it, expect } from 'vitest';

describe('Logger Module', () => {
  it('should export logger object', async () => {
    const { logger } = await import('@/lib/logger');

    expect(logger).toBeDefined();
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('should export convenience functions', async () => {
    const { logInfo, logError, logWarn, logDebug } = await import('@/lib/logger');

    expect(typeof logInfo).toBe('function');
    expect(typeof logError).toBe('function');
    expect(typeof logWarn).toBe('function');
    expect(typeof logDebug).toBe('function');
  });

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

  it('should export LogLevel type', async () => {
    const module = await import('@/lib/logger');
    expect(module).toBeDefined();
  });

  it('should export LogContext type', async () => {
    const module = await import('@/lib/logger');
    expect(module).toBeDefined();
  });
});

describe('Logger Index Domain', () => {
  it('should create domain logger from index', async () => {
    const { logger } = await import('@/lib/logger/index');

    const customLogger = logger.domain('custom');
    expect(customLogger).toBeDefined();
    expect(typeof customLogger.debug).toBe('function');
    expect(typeof customLogger.info).toBe('function');
    expect(typeof customLogger.warn).toBe('function');
    expect(typeof customLogger.error).toBe('function');
  });
});

describe('Domain Loggers Methods', () => {
  it('should have all methods on authLogger', async () => {
    const { authLogger } = await import('@/lib/logger');

    expect(typeof authLogger.debug).toBe('function');
    expect(typeof authLogger.info).toBe('function');
    expect(typeof authLogger.warn).toBe('function');
    expect(typeof authLogger.error).toBe('function');
  });

  it('should have all methods on paymentLogger', async () => {
    const { paymentLogger } = await import('@/lib/logger');

    expect(typeof paymentLogger.debug).toBe('function');
    expect(typeof paymentLogger.info).toBe('function');
    expect(typeof paymentLogger.warn).toBe('function');
    expect(typeof paymentLogger.error).toBe('function');
  });

  it('should have all methods on apiLogger', async () => {
    const { apiLogger } = await import('@/lib/logger');

    expect(typeof apiLogger.debug).toBe('function');
    expect(typeof apiLogger.info).toBe('function');
    expect(typeof apiLogger.warn).toBe('function');
    expect(typeof apiLogger.error).toBe('function');
  });
});
