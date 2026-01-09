/**
 * 구조화된 로깅 시스템
 * console.log를 대체하는 프로덕션급 로거
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: Error;
}

class Logger {
  private isDevelopment: boolean;
  private isTest: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isTest = process.env.NODE_ENV === 'test';
  }

  private shouldLog(level: LogLevel): boolean {
    // 테스트 환경에서는 error만 로깅
    if (this.isTest) {
      return level === 'error';
    }
    return true;
  }

  private formatMessage(entry: LogEntry): string {
    const { level, message, timestamp, context, error } = entry;

    // 개발 환경: 읽기 쉬운 형식
    if (this.isDevelopment) {
      const emoji = {
        debug: '🔍',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
      }[level];

      let output = `${emoji} [${level.toUpperCase()}] ${message}`;

      if (context && Object.keys(context).length > 0) {
        output += '\n  Context: ' + JSON.stringify(context, null, 2);
      }

      if (error) {
        output += '\n  Error: ' + error.message;
        if (error.stack) {
          output += '\n  Stack: ' + error.stack;
        }
      }

      return output;
    }

    // 프로덕션 환경: JSON 형식 (로그 수집 도구용)
    return JSON.stringify({
      level,
      message,
      timestamp,
      context,
      error: error ? {
        message: error.message,
        name: error.name,
        stack: error.stack,
      } : undefined,
    });
  }

  private log(level: LogLevel, message: string, contextOrError?: LogContext | Error) {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
    };

    if (contextOrError instanceof Error) {
      entry.error = contextOrError;
    } else if (contextOrError) {
      entry.context = contextOrError;
    }

    const formatted = this.formatMessage(entry);

    // 콘솔 출력
    switch (level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }

    // 프로덕션에서는 Sentry로 전송 (error, warn만)
    if (!this.isDevelopment && (level === 'error' || level === 'warn')) {
      this.sendToSentry(entry);
    }
  }

  private sendToSentry(entry: LogEntry) {
    // captureServerError 사용 (서버 환경)
    if (typeof window === 'undefined') {
      import('@/lib/telemetry').then(({ captureServerError }) => {
        if (entry.error) {
          captureServerError(entry.error, entry.context);
        }
      });
    }
  }

  /**
   * 디버그 로그 (개발 환경에서만)
   */
  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  /**
   * 정보성 로그
   */
  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  /**
   * 경고 로그
   */
  warn(message: string, contextOrError?: LogContext | Error) {
    this.log('warn', message, contextOrError);
  }

  /**
   * 에러 로그 (자동으로 Sentry 전송)
   */
  error(message: string, error?: Error, context?: LogContext) {
    const combined = error ? { ...context, error } : context;
    this.log('error', message, error || combined);
  }

  /**
   * 특정 도메인의 로거 생성 (예: logger.domain('auth'))
   */
  domain(name: string): DomainLogger {
    return new DomainLogger(name, this);
  }
}

/**
 * 도메인별 로거 (예: authLogger, paymentLogger)
 */
class DomainLogger {
  constructor(
    private domainName: string,
    private parentLogger: Logger
  ) {}

  private addDomain(message: string): string {
    return `[${this.domainName}] ${message}`;
  }

  debug(message: string, context?: LogContext) {
    this.parentLogger.debug(this.addDomain(message), context);
  }

  info(message: string, context?: LogContext) {
    this.parentLogger.info(this.addDomain(message), context);
  }

  warn(message: string, contextOrError?: LogContext | Error) {
    this.parentLogger.warn(this.addDomain(message), contextOrError);
  }

  error(message: string, error?: Error, context?: LogContext) {
    this.parentLogger.error(this.addDomain(message), error, context);
  }
}

// 싱글톤 인스턴스
export const logger = new Logger();

// 도메인별 로거들
export const authLogger = logger.domain('auth');
export const paymentLogger = logger.domain('payment');
export const apiLogger = logger.domain('api');
export const dbLogger = logger.domain('db');
export const sajuLogger = logger.domain('saju');
export const astroLogger = logger.domain('astro');
export const tarotLogger = logger.domain('tarot');

export default logger;
