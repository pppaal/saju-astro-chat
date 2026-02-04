/**
 * SLA Monitoring API
 *
 * GET /api/admin/metrics/sla - Check SLA compliance
 *
 * Acceptance Criteria:
 * - p95 API < 700ms
 * - Error rate < 0.5%
 */

import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { getMetricsSnapshot } from '@/lib/metrics'
import { SLA_THRESHOLDS } from '@/lib/metrics/schema'
import { logger } from '@/lib/logger'
import { isAdminUser } from '@/lib/auth/admin'

const API_REQUEST_METRICS = [
  'api.request.total',
  'http.request.total',
  'destiny.report.total',
  'tarot.reading.total',
  'dream.analysis.total',
  'astrology.chart.total',
]

const API_ERROR_METRICS = ['api.error.total']

const API_LATENCY_METRICS = ['api.request.duration', 'http.request.duration']

const EXCLUDED_LATENCY_PATTERNS = ['external', 'openai', 'report.generation', 'third_party']

function matchesName(name: string, allowed: string[]): boolean {
  return allowed.includes(name)
}

function isApiLatencyMetric(name: string): boolean {
  const isMatch = API_LATENCY_METRICS.some((pattern) => name === pattern)
  if (!isMatch) {
    return false
  }
  const isExcluded = EXCLUDED_LATENCY_PATTERNS.some((excl) => name.toLowerCase().includes(excl))
  return !isExcluded
}

interface SLAStatus {
  metric: string
  current: number
  threshold: number
  unit: string
  status: 'pass' | 'warning' | 'fail'
  message: string
}

interface SLAReport {
  timestamp: string
  overallStatus: 'healthy' | 'degraded' | 'critical'
  metrics: SLAStatus[]
  summary: {
    totalChecks: number
    passed: number
    warnings: number
    failed: number
  }
}

export const GET = withApiMiddleware(
  async (_req: NextRequest, context: ApiContext) => {
    try {
      if (!context.userId || !context.session?.user?.email) {
        logger.warn('[SLA] No session or userId', {
          hasSession: !!context.session,
          hasUserId: !!context.userId,
        })
        return apiError(ErrorCodes.UNAUTHORIZED, 'Unauthorized')
      }

      const isAdmin = await isAdminUser(context.userId)
      if (!isAdmin) {
        logger.warn('[SLA] Unauthorized access attempt', {
          email: context.session.user.email,
          userId: context.userId,
        })
        return apiError(ErrorCodes.FORBIDDEN, 'Forbidden')
      }

      const snapshot = getMetricsSnapshot()

      const allP95Values: number[] = []
      let totalRequests = 0
      let totalErrors = 0

      for (const timing of snapshot.timings) {
        if (isApiLatencyMetric(timing.name)) {
          if (timing.p95 > 0) {
            allP95Values.push(timing.p95)
          }
        }
      }

      for (const counter of snapshot.counters) {
        const name = counter.name

        if (matchesName(name, API_REQUEST_METRICS)) {
          totalRequests += counter.value
        }

        if (matchesName(name, API_ERROR_METRICS)) {
          totalErrors += counter.value
        }
      }

      const overallP95 = allP95Values.length > 0 ? Math.max(...allP95Values) : 0

      const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0

      const metrics: SLAStatus[] = []

      const p95Status: SLAStatus = {
        metric: 'p95_latency',
        current: Math.round(overallP95),
        threshold: SLA_THRESHOLDS.P95_LATENCY_MS,
        unit: 'ms',
        status:
          overallP95 <= SLA_THRESHOLDS.P95_LATENCY_MS
            ? 'pass'
            : overallP95 <= SLA_THRESHOLDS.P95_LATENCY_MS * 1.2
              ? 'warning'
              : 'fail',
        message:
          overallP95 <= SLA_THRESHOLDS.P95_LATENCY_MS
            ? `p95 latency (${Math.round(overallP95)}ms) is within threshold`
            : `p95 latency (${Math.round(overallP95)}ms) exceeds ${SLA_THRESHOLDS.P95_LATENCY_MS}ms threshold`,
      }
      metrics.push(p95Status)

      const errorRateStatus: SLAStatus = {
        metric: 'error_rate',
        current: Number(errorRate.toFixed(3)),
        threshold: SLA_THRESHOLDS.ERROR_RATE_PERCENT,
        unit: '%',
        status:
          errorRate <= SLA_THRESHOLDS.ERROR_RATE_PERCENT
            ? 'pass'
            : errorRate <= SLA_THRESHOLDS.ERROR_RATE_PERCENT * 2
              ? 'warning'
              : 'fail',
        message:
          errorRate <= SLA_THRESHOLDS.ERROR_RATE_PERCENT
            ? `Error rate (${errorRate.toFixed(3)}%) is within threshold`
            : `Error rate (${errorRate.toFixed(3)}%) exceeds ${SLA_THRESHOLDS.ERROR_RATE_PERCENT}% threshold`,
      }
      metrics.push(errorRateStatus)

      const passed = metrics.filter((m) => m.status === 'pass').length
      const warnings = metrics.filter((m) => m.status === 'warning').length
      const failed = metrics.filter((m) => m.status === 'fail').length

      let overallStatus: SLAReport['overallStatus'] = 'healthy'
      if (failed > 0) {
        overallStatus = 'critical'
      } else if (warnings > 0) {
        overallStatus = 'degraded'
      }

      const report: SLAReport = {
        timestamp: new Date().toISOString(),
        overallStatus,
        metrics,
        summary: {
          totalChecks: metrics.length,
          passed,
          warnings,
          failed,
        },
      }

      if (overallStatus !== 'healthy') {
        logger.warn('[SLA] SLA violation detected', {
          status: overallStatus,
          violations: metrics.filter((m) => m.status !== 'pass'),
        })
      }

      return apiSuccess({ data: report } as Record<string, unknown>)
    } catch (err) {
      logger.error('[SLA API Error]', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal server error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/admin/metrics/sla',
    limit: 60,
    windowSeconds: 60,
  })
)
