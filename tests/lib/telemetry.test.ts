/**
 * Tests for src/lib/telemetry.ts
 * Telemetry and error capture utilities
 *
 * 주의: captureServerError/captureException 은 logger.error 를 부르면 안 된다 —
 * logger.error(프로덕션) → sendToSentry → captureServerError → logger.error →
 * … 무한 상호 재귀로 인스턴스가 wedge 된다. 그래서 콘솔 직행이 계약이고,
 * 아래 회귀 테스트가 이를 고정한다. 스크럽 검증은 console.error 에 넘긴
 * JSON payload 를 파싱해 수행한다.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { captureServerError, captureException, trackMetric } from '@/lib/telemetry'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setMeasurement: vi.fn(),
}))

let consoleErrorSpy: ReturnType<typeof vi.spyOn>

/** captureServerError 가 console.error 로 넘긴 JSON payload 를 파싱 */
function lastServerErrorPayload(): Record<string, unknown> {
  const call = consoleErrorSpy.mock.calls.find((c) => c[0] === '[telemetry] Server error:')
  expect(call).toBeDefined()
  return JSON.parse(String(call![1]))
}

describe('Telemetry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  describe('captureServerError', () => {
    it('should capture Error instance', () => {
      captureServerError(new Error('Test error'))
      expect(lastServerErrorPayload().message).toBe('Test error')
    })

    it('should capture string error', () => {
      captureServerError('String error')
      expect(lastServerErrorPayload().message).toBe('String error')
    })

    it('should scrub sensitive context data', () => {
      const context = {
        userId: '123',
        authorization: 'Bearer token123',
        apiKey: 'secret-key',
        safeData: 'visible',
      }

      captureServerError(new Error('Test'), context)

      const payload = lastServerErrorPayload()
      expect(payload.safeData).toBe('visible')
      expect(payload.authorization).toBe('[redacted]')
    })

    it('should handle nested context objects', () => {
      captureServerError(new Error('Test'), { user: { id: '123', password: 'secret123' } })
      const payload = lastServerErrorPayload()
      expect((payload.user as Record<string, unknown>).password).toBe('[redacted]')
    })

    it('should handle context with arrays', () => {
      captureServerError(new Error('Test'), { items: ['item1', 'item2'] })
      expect(lastServerErrorPayload().items).toEqual(['item1', 'item2'])
    })

    it('무한 상호 재귀 방지 — logger.error 를 절대 재호출하지 않는다', async () => {
      // 회귀 배경: captureServerError → logger.error → sendToSentry →
      // captureServerError … 순환으로 이벤트 루프가 고정돼 프로덕션 인스턴스가
      // 통째로 wedge 됐다(cron 라우트가 영영 안 끝나던 CI 실패의 근본 원인).
      captureServerError(new Error('Test'), { any: 'ctx' })
      captureException(new Error('Test2'))

      const { logger } = await import('@/lib/logger')
      expect(logger.error).not.toHaveBeenCalled()
      expect(logger.warn).not.toHaveBeenCalled()
    })
  })

  describe('captureException', () => {
    it('should capture Error instance', () => {
      captureException(new Error('Test exception'))
      const call = consoleErrorSpy.mock.calls.find(
        (c) => c[0] === '[telemetry] Exception captured:'
      )
      expect(call).toBeDefined()
      expect(call![1]).toBe('Test exception')
    })

    it('should capture non-Error values', () => {
      captureException('String exception')
      const call = consoleErrorSpy.mock.calls.find(
        (c) => c[0] === '[telemetry] Exception captured:'
      )
      expect(call![1]).toBe('String exception')
    })

    it('should scrub sensitive context', () => {
      captureException(new Error('Test'), { token: 'secret', safe: 'value' })
      const call = consoleErrorSpy.mock.calls.find(
        (c) => c[0] === '[telemetry] Exception captured:'
      )
      const ctx = JSON.parse(String(call![2]))
      expect(ctx.token).toBe('[redacted]')
      expect(ctx.safe).toBe('value')
    })

    it('should handle undefined context', () => {
      captureException(new Error('Test'))
      const call = consoleErrorSpy.mock.calls.find(
        (c) => c[0] === '[telemetry] Exception captured:'
      )
      expect(call).toBeDefined()
    })
  })

  describe('trackMetric', () => {
    it('should log metric with value', async () => {
      trackMetric('api.latency', 150)

      const { logger } = await import('@/lib/logger')
      expect(logger.debug).toHaveBeenCalledWith('[Metric] api.latency: 150', '')
    })

    it('should log metric with tags', async () => {
      trackMetric('api.latency', 150, { endpoint: '/api/tarot' })

      const { logger } = await import('@/lib/logger')
      expect(logger.debug).toHaveBeenCalledWith('[Metric] api.latency: 150', {
        endpoint: '/api/tarot',
      })
    })
  })

  describe('Sensitive data scrubbing', () => {
    const sensitiveKeys = [
      'authorization',
      'cookie',
      'x-api-key',
      'token',
      'secret',
      'password',
      'apikey',
      'access_key',
      'refresh_token',
    ]

    sensitiveKeys.forEach((key) => {
      it(`should redact "${key}" field`, () => {
        const context = { [key]: 'sensitive-value', safe: 'visible' }
        captureServerError(new Error('Test'), context)

        const payload = lastServerErrorPayload()
        expect(payload[key]).toBe('[redacted]')
        expect(payload.safe).toBe('visible')
      })
    })

    it('should redact birth/location PII fields', () => {
      const context = {
        name: '홍길동',
        birthDate: '1990-01-01',
        birthTime: '13:30',
        latitude: 37.5,
        longitude: 127.0,
        userEmail: 'user@example.com',
        // 무해한 키는 'name' 정확일치 규칙에 안 걸려야 한다.
        eventName: 'checkout',
        fileName: 'report.pdf',
      }
      captureServerError(new Error('Test'), context)

      const payload = lastServerErrorPayload()
      expect(payload.name).toBe('[redacted]')
      expect(payload.birthDate).toBe('[redacted]')
      expect(payload.birthTime).toBe('[redacted]')
      expect(payload.latitude).toBe('[redacted]')
      expect(payload.longitude).toBe('[redacted]')
      expect(payload.userEmail).toBe('[redacted]')
      // 과도 마스킹 방지: name 을 substring 으로 쓰지 않으므로 보존.
      expect(payload.eventName).toBe('checkout')
      expect(payload.fileName).toBe('report.pdf')
    })

    it('should redact secrets embedded in the error message', () => {
      // 'sk_live_' 리터럴이 소스에 박히면 GitHub 시크릿 스캐너가 막으므로 런타임 결합.
      const fakeKey = ['sk', 'live', 'abcdefghijklmnopqrstuvwx12'].join('_')
      captureServerError(new Error(`db error postgresql://u:p@host:5432/db and ${fakeKey}`))

      const payload = lastServerErrorPayload()
      expect(payload.message).not.toContain(fakeKey)
      expect(payload.message).not.toContain('p@host')
      expect(payload.message).toContain('[REDACTED]')
    })

    it('should handle case-insensitive key matching', () => {
      const context = {
        AUTHORIZATION: 'bearer token',
        Authorization: 'bearer token',
        PASSWORD: 'secret',
      }

      captureServerError(new Error('Test'), context)

      const payload = lastServerErrorPayload()
      expect(payload.AUTHORIZATION).toBe('[redacted]')
      expect(payload.Authorization).toBe('[redacted]')
      expect(payload.PASSWORD).toBe('[redacted]')
    })
  })
})
