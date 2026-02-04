/**
 * Admin Metrics Dashboard API
 *
 * GET /api/admin/metrics - Get metrics dashboard data
 * GET /api/admin/metrics?format=prometheus - Get Prometheus format
 * GET /api/admin/metrics?format=otlp - Get OTLP JSON format
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import {
  getMetricsSnapshot,
  toPrometheus,
  toOtlp,
  DashboardRequestSchema,
  type DashboardSummary,
  type DashboardTimeRange,
} from '@/lib/metrics/index'
import { logger } from '@/lib/logger'

// Helper to check if user is admin (via database role + env fallback)
async function isUserAdmin(userId: string, email: string): Promise<boolean> {
  try {
    const { prisma } = await import('@/lib/db/prisma')
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (user?.role === 'admin' || user?.role === 'superadmin') {
      return true
    }

    const adminEmails =
      process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim().toLowerCase()) || []
    return adminEmails.includes(email.toLowerCase())
  } catch (error) {
    logger.error('[Metrics] Failed to check admin status', { error, userId })
    return false
  }
}

export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      const userEmail = context.session?.user?.email
      if (!userEmail || !context.userId) {
        return apiError(ErrorCodes.UNAUTHORIZED, 'Unauthorized')
      }

      const adminCheck = await isUserAdmin(context.userId, userEmail)
      if (!adminCheck) {
        logger.warn('[Metrics] Unauthorized access attempt', {
          email: userEmail,
          userId: context.userId,
        })
        return apiError(ErrorCodes.FORBIDDEN, 'Forbidden')
      }

      const { searchParams } = new URL(req.url)
      const format = searchParams.get('format') || 'json'
      const timeRange = (searchParams.get('timeRange') || '24h') as DashboardTimeRange

      const validationResult = DashboardRequestSchema.safeParse({
        timeRange,
        includeRaw: searchParams.get('includeRaw') === 'true',
      })

      if (!validationResult.success) {
        return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid parameters')
      }

      // Return raw formats (these need NextResponse directly for custom content types)
      if (format === 'prometheus') {
        const prometheusData = toPrometheus()
        return new NextResponse(prometheusData, {
          status: 200,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        }) as unknown as ReturnType<typeof apiError>
      }

      if (format === 'otlp') {
        const otlpData = toOtlp()
        return NextResponse.json(otlpData) as unknown as ReturnType<typeof apiError>
      }

      const snapshot = getMetricsSnapshot()
      const summary = generateDashboardSummary(snapshot, timeRange)

      const response: {
        success: boolean
        data: DashboardSummary
        raw?: ReturnType<typeof getMetricsSnapshot>
      } = {
        success: true,
        data: summary,
      }

      if (validationResult.data.includeRaw) {
        response.raw = snapshot
      }

      return NextResponse.json(response) as unknown as ReturnType<typeof apiError>
    } catch (err) {
      logger.error('[Metrics API Error]', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal server error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/admin/metrics',
    limit: 30,
    windowSeconds: 60,
  })
)

// Metric names for accurate filtering
const REQUEST_METRICS = [
  'api.request.total',
  'http.request.total',
  'destiny.report.total',
  'tarot.reading.total',
  'dream.analysis.total',
  'astrology.chart.total',
]

const ERROR_METRICS = ['api.error.total']

const CREDIT_METRICS = ['credits.usage.total']

function matchesMetricName(name: string, allowed: string[]): boolean {
  return allowed.includes(name)
}

function generateDashboardSummary(
  snapshot: ReturnType<typeof getMetricsSnapshot>,
  timeRange: DashboardTimeRange
): DashboardSummary {
  const { counters, timings, gauges } = snapshot

  let totalRequests = 0
  let totalErrors = 0
  let totalLatencySum = 0
  let totalLatencyCount = 0

  const serviceMetrics: Record<
    string,
    {
      requests: number
      errors: number
      latencySum: number
      latencyCount: number
      p95Samples: number[]
    }
  > = {}
  const allLatencySamples: number[] = []
  const errorCounts: Record<string, number> = {}
  const creditsByService: Record<string, number> = {}

  for (const counter of counters) {
    const name = counter.name
    const labels = counter.labels || {}
    const service = String(labels.service || labels.theme || 'unknown')

    if (matchesMetricName(name, REQUEST_METRICS)) {
      totalRequests += counter.value

      if (!serviceMetrics[service]) {
        serviceMetrics[service] = {
          requests: 0,
          errors: 0,
          latencySum: 0,
          latencyCount: 0,
          p95Samples: [],
        }
      }
      serviceMetrics[service].requests += counter.value
    }

    if (matchesMetricName(name, ERROR_METRICS)) {
      totalErrors += counter.value

      if (serviceMetrics[service]) {
        serviceMetrics[service].errors += counter.value
      } else {
        serviceMetrics[service] = {
          requests: 0,
          errors: counter.value,
          latencySum: 0,
          latencyCount: 0,
          p95Samples: [],
        }
      }

      const errorKey = `${service}:${labels.error_category || 'unknown'}`
      errorCounts[errorKey] = (errorCounts[errorKey] || 0) + counter.value
    }

    if (matchesMetricName(name, CREDIT_METRICS)) {
      creditsByService[service] = (creditsByService[service] || 0) + counter.value
    }
  }

  for (const timing of timings) {
    const labels = timing.labels || {}
    const service = String(labels.service || labels.theme || 'unknown')

    totalLatencySum += timing.sum
    totalLatencyCount += timing.count

    if (timing.p95 !== undefined) {
      allLatencySamples.push(timing.p95)
    }

    if (serviceMetrics[service]) {
      serviceMetrics[service].latencySum += timing.sum
      serviceMetrics[service].latencyCount += timing.count
      if (timing.p95 !== undefined) {
        serviceMetrics[service].p95Samples.push(timing.p95)
      }
    }
  }

  const overallP95 = allLatencySamples.length > 0 ? Math.max(...allLatencySamples) : 0

  let activeUsers = 0
  for (const gauge of gauges) {
    if (gauge.name.includes('session') || gauge.name.includes('active')) {
      activeUsers += gauge.value
    }
  }

  const services: DashboardSummary['services'] = {}
  for (const [service, metrics] of Object.entries(serviceMetrics)) {
    if (service === 'unknown') {
      continue
    }
    services[service] = {
      requests: metrics.requests,
      errors: metrics.errors,
      avgLatencyMs:
        metrics.latencyCount > 0 ? Math.round(metrics.latencySum / metrics.latencyCount) : 0,
      p95LatencyMs: metrics.p95Samples.length > 0 ? Math.max(...metrics.p95Samples) : undefined,
    }
  }

  const topErrors: DashboardSummary['topErrors'] = Object.entries(errorCounts)
    .map(([key, count]) => {
      const [service, category] = key.split(':')
      return { service, category, count }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    timeRange,
    timestamp: new Date().toISOString(),
    overview: {
      totalRequests,
      errorRate: totalRequests > 0 ? Number(((totalErrors / totalRequests) * 100).toFixed(2)) : 0,
      avgLatencyMs: totalLatencyCount > 0 ? Math.round(totalLatencySum / totalLatencyCount) : 0,
      p95LatencyMs: overallP95,
      activeUsers,
    },
    services,
    topErrors,
    credits: {
      totalUsed: Object.values(creditsByService).reduce((sum, v) => sum + v, 0),
      byService: creditsByService,
    },
  }
}
