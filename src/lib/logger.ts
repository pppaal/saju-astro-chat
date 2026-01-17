/* eslint-disable no-console */
// Type definitions for logger metadata
export interface LogMetadata {
  [key: string]: unknown;
}

export interface LogError {
  message?: string;
  stack?: string;
  [key: string]: unknown;
}

// Helper to convert any value to LogMetadata
function toMeta(value: unknown): LogMetadata | undefined {
  if (value === undefined || value === null) return undefined;
  if (value instanceof Error) {
    return { message: value.message, stack: value.stack };
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as LogMetadata;
  }
  return { value };
}

// Simple logger that works in both browser and server
export const logger = {
  info: (message: string, meta?: unknown) => {
    console.log(`[INFO] ${message}`, toMeta(meta) || '');
  },
  warn: (message: string, meta?: unknown) => {
    console.warn(`[WARN] ${message}`, toMeta(meta) || '');
  },
  error: (message: string, meta?: unknown) => {
    console.error(`[ERROR] ${message}`, toMeta(meta) || '');
  },
  debug: (message: string, meta?: unknown) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${message}`, toMeta(meta) || '');
    }
  },
};

// Export convenience methods
export const logInfo = (message: string, meta?: LogMetadata) => logger.info(message, meta);
export const logError = (message: string, error?: Error | LogError | unknown, meta?: LogMetadata) => {
  const errorObj = error instanceof Error
    ? { message: error.message, stack: error.stack }
    : typeof error === 'object' && error !== null
    ? { message: (error as LogError).message || String(error), stack: (error as LogError).stack }
    : { message: String(error) };

  logger.error(message, { error: errorObj.message, stack: errorObj.stack, ...meta });
};
export const logWarn = (message: string, meta?: LogMetadata) => logger.warn(message, meta);
export const logDebug = (message: string, meta?: LogMetadata) => logger.debug(message, meta);

// Re-export domain loggers from structured logger module
export {
  authLogger,
  paymentLogger,
  apiLogger,
  dbLogger,
  sajuLogger,
  astroLogger,
  tarotLogger,
} from './logger/index';
