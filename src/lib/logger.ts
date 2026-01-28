/**
 * Unified logger entry point
 * Re-exports the structured logger from ./logger/index
 * All imports of '@/lib/logger' use the production-grade logger
 * with environment-aware formatting and Sentry integration.
 */

// Re-export the structured logger and domain loggers
export {
  logger,
  authLogger,
  paymentLogger,
  apiLogger,
  dbLogger,
  sajuLogger,
  astroLogger,
  tarotLogger,
} from './logger/index';

export type { LogLevel, LogContext } from './logger/index';

// Type definitions for backward compatibility
export interface LogMetadata {
  [key: string]: unknown;
}

export interface LogError {
  message?: string;
  stack?: string;
  [key: string]: unknown;
}

// Re-import for convenience methods
import { logger as structuredLogger } from './logger/index';

// Export convenience methods (backward compatible)
export const logInfo = (message: string, meta?: LogMetadata) => structuredLogger.info(message, meta);
export const logError = (message: string, error?: Error | LogError | unknown, meta?: LogMetadata) => {
  if (error instanceof Error) {
    structuredLogger.error(message, { ...meta, errorMessage: error.message, stack: error.stack });
  } else if (error && typeof error === 'object') {
    const errObj = error as LogError;
    structuredLogger.error(message, { ...meta, errorMessage: errObj.message, stack: errObj.stack });
  } else if (error !== undefined) {
    structuredLogger.error(message, { ...meta, errorMessage: String(error) });
  } else {
    structuredLogger.error(message, meta);
  }
};
export const logWarn = (message: string, meta?: LogMetadata) => structuredLogger.warn(message, meta);
export const logDebug = (message: string, meta?: LogMetadata) => structuredLogger.debug(message, meta);
