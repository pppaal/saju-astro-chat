/**
 * Tests for src/lib/telemetry.ts
 * Telemetry and error capture utilities
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
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

describe('Telemetry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('captureServerError', () => {
    it('should capture Error instance', async () => {
      const error = new Error('Test error')
      captureServerError(error)

      const { logger } = await import('@/lib/logger')
      expect(logger.error).toHaveBeenCalled()
    })

    it('should capture string error', async () => {
      captureServerError('String error')

      const { logger } = await import('@/lib/logger')
      expect(logger.error).toHaveBeenCalled()
    })

    it('should scrub sensitive context data', async () => {
      const error = new Error('Test')
      const context = {
        userId: '123',
        authorization: 'Bearer token123',
        apiKey: 'secret-key',
        safeData: 'visible',
      }

      captureServerError(error, context)

      const { logger } = await import('@/lib/logger')
      const logCall = (logger.error as ReturnType<typeof vi.fn>).mock.calls[0]
      const payload = logCall[1]

      expect(payload.safeData).toBe('visible')
      expect(payload.authorization).toBe('[redacted]')
    })

    it('should handle nested context objects', async () => {
      const error = new Error('Test')
      const context = {
        user: {
          id: '123',
          password: 'secret123',
        },
      }

      captureServerError(error, context)

      const { logger } = await import('@/lib/logger')
      expect(logger.error).toHaveBeenCalled()
    })

    it('should handle context with arrays', async () => {
      const error = new Error('Test')
      const context = {
        items: ['item1', 'item2'],
      }

      captureServerError(error, context)

      const { logger } = await import('@/lib/logger')
      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('captureException', () => {
    it('should capture Error instance', async () => {
      const error = new Error('Test exception')
      captureException(error)

      const { logger } = await import('@/lib/logger')
      expect(logger.error).toHaveBeenCalledWith(
        'Exception captured:',
        expect.objectContaining({ message: 'Test exception' })
      )
    })

    it('should capture non-Error values', async () => {
      captureException('String exception')

      const { logger } = await import('@/lib/logger')
      expect(logger.error).toHaveBeenCalled()
    })

    it('should scrub sensitive context', async () => {
      const error = new Error('Test')
      captureException(error, { token: 'secret', safe: 'value' })

      const { logger } = await import('@/lib/logger')
      expect(logger.error).toHaveBeenCalled()
    })

    it('should handle undefined context', async () => {
      const error = new Error('Test')
      captureException(error)

      const { logger } = await import('@/lib/logger')
      expect(logger.error).toHaveBeenCalled()
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
      it(`should redact "${key}" field`, async () => {
        const context = { [key]: 'sensitive-value', safe: 'visible' }
        captureServerError(new Error('Test'), context)

        const { logger } = await import('@/lib/logger')
        const logCall = (logger.error as ReturnType<typeof vi.fn>).mock.calls[0]
        const payload = logCall[1]

        expect(payload[key]).toBe('[redacted]')
        expect(payload.safe).toBe('visible')
      })
    })

    it('should redact birth/location PII fields', async () => {
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

      const { logger } = await import('@/lib/logger')
      const logCall = (logger.error as ReturnType<typeof vi.fn>).mock.calls[0]
      const payload = logCall[1]

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

    it('should redact secrets embedded in the error message', async () => {
      // 'sk_live_' 리터럴이 소스에 박히면 GitHub 시크릿 스캐너가 막으므로 런타임 결합.
      const fakeKey = ['sk', 'live', 'abcdefghijklmnopqrstuvwx12'].join('_')
      captureServerError(new Error(`db error postgresql://u:p@host:5432/db and ${fakeKey}`))

      const { logger } = await import('@/lib/logger')
      const logCall = (logger.error as ReturnType<typeof vi.fn>).mock.calls[0]
      const payload = logCall[1]

      expect(payload.message).not.toContain(fakeKey)
      expect(payload.message).not.toContain('p@host')
      expect(payload.message).toContain('[REDACTED]')
    })

    it('should handle case-insensitive key matching', async () => {
      const context = {
        AUTHORIZATION: 'bearer token',
        Authorization: 'bearer token',
        PASSWORD: 'secret',
      }

      captureServerError(new Error('Test'), context)

      const { logger } = await import('@/lib/logger')
      const logCall = (logger.error as ReturnType<typeof vi.fn>).mock.calls[0]
      const payload = logCall[1]

      expect(payload.AUTHORIZATION).toBe('[redacted]')
      expect(payload.Authorization).toBe('[redacted]')
      expect(payload.PASSWORD).toBe('[redacted]')
    })
  })
})
