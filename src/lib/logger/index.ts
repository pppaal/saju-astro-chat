/* eslint-disable no-console */
/**
 * 구조화된 로깅 시스템
 * console.log를 대체하는 프로덕션급 로거
 */

import { redactSecrets } from '@/lib/security/logRedaction'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  [key: string]: unknown
}

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: LogContext
  error?: Error
}

class Logger {
  private isDevelopment: boolean
  private isTest: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
    this.isTest = process.env.NODE_ENV === 'test'
  }

  private shouldLog(level: LogLevel): boolean {
    // 테스트 환경에서는 error만 로깅
    if (this.isTest) {
      return level === 'error'
    }
    return true
  }

  /**
   * context 객체 안에 담긴 Error 를 직렬화 가능한 형태로 변환한다.
   *
   * 대부분의 호출부는 `logger.error('..', { err })` 처럼 Error 를 context
   * 프로퍼티로 넘기는데, Error 의 message/name/stack 은 non-enumerable own
   * property 라 `JSON.stringify({ err: new Error('x') })` === `{"err":{}}` 로
   * 소실된다("환불 실패" 같은 최중요 경보가 프로덕션에서 무음이 되던 원인).
   * 여기서 top-level Error 값을 `{ name, message, stack }`(redact)로 펼쳐
   * 로그·Sentry 에 실제 내용이 남게 한다.
   */
  private normalizeContext(context?: LogContext): LogContext | undefined {
    if (!context) return context
    let changed = false
    const out: LogContext = {}
    for (const [k, v] of Object.entries(context)) {
      if (v instanceof Error) {
        changed = true
        out[k] = {
          name: v.name,
          message: redactSecrets(v.message),
          stack: v.stack ? redactSecrets(v.stack) : undefined,
        }
      } else {
        out[k] = v
      }
    }
    return changed ? out : context
  }

  /** context 프로퍼티에 담겨 온 첫 Error 를 찾아 반환(Sentry 라우팅용). */
  private firstErrorInContext(context?: LogContext): Error | undefined {
    if (!context) return undefined
    for (const v of Object.values(context)) {
      if (v instanceof Error) return v
    }
    return undefined
  }

  private formatMessage(entry: LogEntry): string {
    const { level, message, timestamp, context, error } = entry

    // 개발 환경: 읽기 쉬운 형식
    if (this.isDevelopment) {
      const emoji = {
        debug: '🔍',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
      }[level]

      let output = `${emoji} [${level.toUpperCase()}] ${message}`

      if (context && Object.keys(context).length > 0) {
        output += '\n  Context: ' + JSON.stringify(this.normalizeContext(context), null, 2)
      }

      if (error) {
        output += '\n  Error: ' + redactSecrets(error.message)
        if (error.stack) {
          output += '\n  Stack: ' + redactSecrets(error.stack)
        }
      }

      return output
    }

    // 프로덕션 환경: JSON 형식 (로그 수집 도구용). error.message/stack 에 박힌
    // 시크릿(연결 문자열·토큰·키)·이메일을 콘솔/로그 수집기로 새지 않게 redact.
    return JSON.stringify({
      level,
      message,
      timestamp,
      context: this.normalizeContext(context),
      error: error
        ? {
            message: redactSecrets(error.message),
            name: error.name,
            stack: error.stack ? redactSecrets(error.stack) : undefined,
          }
        : undefined,
    })
  }

  private log(level: LogLevel, message: string, contextOrError?: LogContext | Error | unknown) {
    if (!this.shouldLog(level)) {
      return
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
    }

    if (contextOrError instanceof Error) {
      entry.error = contextOrError
    } else if (contextOrError && typeof contextOrError === 'object') {
      entry.context = contextOrError as LogContext
    } else if (contextOrError !== undefined) {
      entry.context = { value: contextOrError }
    }

    const formatted = this.formatMessage(entry)

    // 콘솔 출력
    switch (level) {
      case 'debug':
        console.debug(formatted)
        break
      case 'info':
        console.info(formatted)
        break
      case 'warn':
        console.warn(formatted)
        break
      case 'error':
        console.error(formatted)
        break
    }

    // 프로덕션에서는 Sentry로 전송 (error, warn만)
    if (!this.isDevelopment && (level === 'error' || level === 'warn')) {
      this.sendToSentry(entry)
    }
  }

  private sendToSentry(entry: LogEntry) {
    // captureServerError 사용 (서버 환경)
    if (typeof window === 'undefined') {
      // Error 가 2번째 인자로 왔으면 entry.error, context 프로퍼티(`{ err }`)로
      // 왔으면 거기서 추출한다. 둘 다 없어도 error 레벨이면 message 로 합성 Error 를
      // 만들어 반드시 Sentry 에 도달하게 한다(무음 방지). warn 은 Error 가 있을
      // 때만 — 순수 정보성 warn 으로 Sentry 를 오염시키지 않게.
      const err = entry.error ?? this.firstErrorInContext(entry.context)
      const toCapture = err ?? (entry.level === 'error' ? new Error(entry.message) : undefined)
      import('@/lib/telemetry')
        .then(({ captureServerError }) => {
          if (toCapture) {
            captureServerError(toCapture, entry.context)
          }
        })
        .catch(() => {
          // Sentry 전송 실패는 무시 (로깅 루프 방지)
        })
    }
  }

  /**
   * 디버그 로그 (개발 환경에서만)
   */
  debug(message: string, context?: LogContext | unknown) {
    this.log('debug', message, context)
  }

  /**
   * 정보성 로그
   */
  info(message: string, context?: LogContext | unknown) {
    this.log('info', message, context)
  }

  /**
   * 경고 로그
   */
  warn(message: string, contextOrError?: LogContext | Error | unknown) {
    this.log('warn', message, contextOrError)
  }

  /**
   * 에러 로그 (자동으로 Sentry 전송)
   * Accepts Error, LogContext, or any value as second argument
   */
  error(message: string, contextOrError?: LogContext | Error | unknown) {
    if (contextOrError instanceof Error) {
      this.log('error', message, contextOrError)
    } else if (contextOrError && typeof contextOrError === 'object') {
      this.log('error', message, contextOrError as LogContext)
    } else if (contextOrError !== undefined) {
      this.log('error', message, { value: contextOrError })
    } else {
      this.log('error', message)
    }
  }

  /**
   * 특정 도메인의 로거 생성 (예: logger.domain('auth'))
   */
  domain(name: string): DomainLogger {
    return new DomainLogger(name, this)
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
    return `[${this.domainName}] ${message}`
  }

  debug(message: string, context?: LogContext | unknown) {
    this.parentLogger.debug(this.addDomain(message), context)
  }

  info(message: string, context?: LogContext | unknown) {
    this.parentLogger.info(this.addDomain(message), context)
  }

  warn(message: string, contextOrError?: LogContext | Error | unknown) {
    this.parentLogger.warn(this.addDomain(message), contextOrError)
  }

  error(message: string, contextOrError?: LogContext | Error | unknown) {
    this.parentLogger.error(this.addDomain(message), contextOrError)
  }
}

// 싱글톤 인스턴스
export const logger = new Logger()

// 도메인별 로거들
export const authLogger = logger.domain('auth')
export const paymentLogger = logger.domain('payment')
export const apiLogger = logger.domain('api')
export const dbLogger = logger.domain('db')
export const sajuLogger = logger.domain('saju')
export const astroLogger = logger.domain('astro')
export const tarotLogger = logger.domain('tarot')

export default logger
