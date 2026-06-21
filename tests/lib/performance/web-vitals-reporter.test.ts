/**
 * Tests for src/lib/performance/web-vitals-reporter.ts
 * 웹 바이탈 리포터 테스트
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock web-vitals module
vi.mock('web-vitals', () => ({
  onCLS: vi.fn(),
  onFID: vi.fn(),
  onFCP: vi.fn(),
  onLCP: vi.fn(),
  onTTFB: vi.fn(),
  onINP: vi.fn(),
}))

import { reportWebVitals, PerformanceMonitor } from '@/lib/performance/web-vitals-reporter'
import { logger } from '@/lib/logger'

describe('web-vitals-reporter', () => {
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  describe('reportWebVitals', () => {
    const makeMetric = (name: string, value: number, rating = 'good') => ({
      name,
      value,
      rating,
      id: 'test-id',
      navigationType: 'navigate',
      entries: [],
      delta: value,
    })

    it('should log in development mode', () => {
      process.env.NODE_ENV = 'development'
      const metric = makeMetric('LCP', 2000)
      reportWebVitals(metric as any)
      expect(logger.debug).toHaveBeenCalled()
    })

    it('should not log in production mode via debug', () => {
      process.env.NODE_ENV = 'production'
      const metric = makeMetric('LCP', 2000)
      reportWebVitals(metric as any)
      expect(logger.debug).not.toHaveBeenCalled()
    })

    it('should warn on poor metrics in production', () => {
      process.env.NODE_ENV = 'production'
      const metric = makeMetric('LCP', 5000, 'poor')
      reportWebVitals(metric as any)
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Poor Web Vital'),
        expect.any(Object)
      )
    })

    it('should not warn on good metrics in production', () => {
      process.env.NODE_ENV = 'production'
      const metric = makeMetric('LCP', 1000, 'good')
      reportWebVitals(metric as any)
      expect(logger.warn).not.toHaveBeenCalled()
    })

    it('should use computed rating in development when name is a known vital', () => {
      process.env.NODE_ENV = 'development'
      // value 4500 > LCP poor(4000) → computed rating 'poor' overrides metric.rating
      const metric = makeMetric('LCP', 4500, 'good')
      reportWebVitals(metric as any)
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('LCP'),
        expect.objectContaining({ rating: 'poor' })
      )
    })

    it('should fall back to metric.rating for unknown vital names in development', () => {
      process.env.NODE_ENV = 'development'
      const metric = makeMetric('CUSTOM', 100, 'needs-improvement')
      reportWebVitals(metric as any)
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('CUSTOM'),
        expect.objectContaining({ rating: 'needs-improvement' })
      )
    })

    it('should send to Google Analytics (gtag) in production', () => {
      process.env.NODE_ENV = 'production'
      const gtag = vi.fn()
      ;(window as any).gtag = gtag
      try {
        reportWebVitals(makeMetric('CLS', 0.05, 'good') as any)
        expect(gtag).toHaveBeenCalledWith(
          'event',
          'CLS',
          expect.objectContaining({ event_category: 'Web Vitals', non_interaction: true })
        )
      } finally {
        delete (window as any).gtag
      }
    })

    it('should send to Vercel Analytics (va) in production', () => {
      process.env.NODE_ENV = 'production'
      const va = vi.fn()
      ;(window as any).va = va
      try {
        reportWebVitals(makeMetric('INP', 150, 'good') as any)
        expect(va).toHaveBeenCalledWith(
          'track',
          'Web Vitals',
          expect.objectContaining({ metric: 'INP' })
        )
      } finally {
        delete (window as any).va
      }
    })

    it('should swallow errors from analytics reporters', () => {
      process.env.NODE_ENV = 'production'
      ;(window as any).gtag = vi.fn(() => {
        throw new Error('gtag boom')
      })
      try {
        expect(() => reportWebVitals(makeMetric('FCP', 1000, 'good') as any)).not.toThrow()
        expect(logger.error).toHaveBeenCalledWith('Failed to report web vitals', expect.any(Error))
      } finally {
        delete (window as any).gtag
      }
    })
  })

  describe('PerformanceMonitor', () => {
    it('should return null for getDuration with unknown mark', () => {
      const result = PerformanceMonitor.getDuration('nonexistent')
      expect(result).toBeNull()
    })

    it('should handle mark when performance is undefined', () => {
      const origPerf = globalThis.performance
      // @ts-expect-error - temporarily remove performance
      delete globalThis.performance
      expect(() => PerformanceMonitor.mark('test')).not.toThrow()
      globalThis.performance = origPerf
    })

    it('should handle measure when performance is undefined', () => {
      const origPerf = globalThis.performance
      // @ts-expect-error - temporarily remove performance
      delete globalThis.performance
      const result = PerformanceMonitor.measure('test')
      expect(result).toBeNull()
      globalThis.performance = origPerf
    })

    it('should handle reportResourceTiming when performance is undefined', () => {
      const origPerf = globalThis.performance
      // @ts-expect-error - temporarily remove performance
      delete globalThis.performance
      expect(() => PerformanceMonitor.reportResourceTiming()).not.toThrow()
      globalThis.performance = origPerf
    })

    it('mark + getDuration tracks elapsed time for a known mark', () => {
      PerformanceMonitor.mark('op-a')
      const duration = PerformanceMonitor.getDuration('op-a')
      expect(typeof duration).toBe('number')
      expect(duration).toBeGreaterThanOrEqual(0)
    })

    it('measure returns a numeric duration for a started mark', () => {
      PerformanceMonitor.mark('op-b')
      const duration = PerformanceMonitor.measure('op-b', false)
      expect(typeof duration).toBe('number')
      // After measuring, the mark is cleared so getDuration returns null.
      expect(PerformanceMonitor.getDuration('op-b')).toBeNull()
    })

    it('measure returns null when the start mark does not exist', () => {
      // No matching start mark → performance.measure throws → caught → null.
      const result = PerformanceMonitor.measure('never-started')
      expect(result).toBeNull()
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('never-started'),
        expect.any(Error)
      )
    })

    it('reportResourceTiming runs without throwing when performance exists', () => {
      expect(() => PerformanceMonitor.reportResourceTiming()).not.toThrow()
    })
  })
})
