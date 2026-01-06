// Type definitions for logger metadata
export interface LogMetadata {
  [key: string]: unknown;
}

export interface LogError {
  message?: string;
  stack?: string;
  [key: string]: unknown;
}

// Simple logger that works in both browser and server
export const logger = {
  info: (message: string, meta?: LogMetadata) => {
    console.log(`[INFO] ${message}`, meta || '');
  },
  warn: (message: string, meta?: LogMetadata) => {
    console.warn(`[WARN] ${message}`, meta || '');
  },
  error: (message: string, meta?: LogMetadata) => {
    console.error(`[ERROR] ${message}`, meta || '');
  },
  debug: (message: string, meta?: LogMetadata) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${message}`, meta || '');
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
