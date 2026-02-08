/**
 * Admin Comprehensive Metrics API
 *
 * GET /api/admin/metrics/comprehensive?section=<key>&timeRange=<range>
 * Returns section-specific data for the admin dashboard tabs.
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
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { isAdminUser } from '@/lib/auth/admin'
import { DashboardTimeRangeSchema, type DashboardTimeRange } from '@/lib/metrics/schema'

const VALID_SECTIONS = [
  'users',
  'revenue',
  'matching',
  'notifications',
  'content',
  'moderation',
  'audit',
  'system',
  'performance',
  'behavior',
] as const

type Section = (typeof VALID_SECTIONS)[number]

function getDateRange(timeRange: DashboardTimeRange): { start: Date; end: Date } {
  const end = new Date()
  const start = new Date()

  switch (timeRange) {
    case '1h':
      start.setHours(start.getHours() - 1)
      break
    case '6h':
      start.setHours(start.getHours() - 6)
      break
    case '24h':
      start.setDate(start.getDate() - 1)
      break
    case '7d':
      start.setDate(start.getDate() - 7)
      break
    case '30d':
      start.setDate(start.getDate() - 30)
      break
  }

  return { start, end }
}

async function fetchUsersData(start: Date, end: Date) {
  const [totalUsers, recentSignups, roleDistribution, planDistribution] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    }),
    prisma.userCredits.groupBy({
      by: ['plan'],
      _count: { id: true },
    }),
  ])

  return {
    totalUsers,
    recentSignups: recentSignups.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
    })),
    roleDistribution: roleDistribution.map((r) => ({
      role: r.role,
      count: r._count.id,
    })),
    planDistribution: planDistribution.map((p) => ({
      plan: p.plan,
      count: p._count.id,
    })),
  }
}

async function fetchRevenueData(start: Date, end: Date) {
  const [
    activeSubscriptions,
    subscriptionsByPlan,
    creditUsageByService,
    bonusCreditStats,
    recentRefunds,
  ] = await Promise.all([
    prisma.subscription.count({
      where: { status: { in: ['active', 'trialing'] } },
    }),
    prisma.subscription.groupBy({
      by: ['plan'],
      where: { status: { in: ['active', 'trialing'] } },
      _count: { id: true },
    }),
    prisma.premiumContentAccess.groupBy({
      by: ['service'],
      where: { createdAt: { gte: start, lte: end } },
      _sum: { creditUsed: true },
      _count: { id: true },
    }),
    prisma.bonusCreditPurchase.aggregate({
      where: { createdAt: { gte: start, lte: end } },
      _sum: { amount: true, remaining: true },
      _count: { id: true },
    }),
    prisma.creditRefundLog.findMany({
      where: { createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])

  return {
    activeSubscriptions,
    subscriptionsByPlan: subscriptionsByPlan.map((s) => ({
      plan: s.plan,
      count: s._count.id,
    })),
    creditUsageByService: creditUsageByService.map((c) => ({
      service: c.service,
      totalCredits: c._sum.creditUsed || 0,
      accessCount: c._count.id,
    })),
    bonusCreditStats: {
      totalAmount: bonusCreditStats._sum.amount || 0,
      totalRemaining: bonusCreditStats._sum.remaining || 0,
      purchaseCount: bonusCreditStats._count.id,
    },
    recentRefunds: recentRefunds.map((r) => ({
      id: r.id,
      userId: r.userId,
      creditType: r.creditType,
      amount: r.amount,
      reason: r.reason,
      apiRoute: r.apiRoute,
      createdAt: r.createdAt.toISOString(),
    })),
  }
}

async function fetchMatchingData(start: Date, end: Date) {
  const [
    totalProfiles,
    activeProfiles,
    verifiedProfiles,
    swipeStats,
    connectionStats,
    chatStartedCount,
    messageStats,
  ] = await Promise.all([
    prisma.matchProfile.count(),
    prisma.matchProfile.count({ where: { isActive: true } }),
    prisma.matchProfile.count({ where: { verified: true } }),
    prisma.matchSwipe.groupBy({
      by: ['action'],
      where: { createdAt: { gte: start, lte: end } },
      _count: { id: true },
    }),
    prisma.matchConnection.aggregate({
      where: { createdAt: { gte: start, lte: end } },
      _count: { id: true },
      _avg: { compatibilityScore: true },
    }),
    prisma.matchConnection.count({
      where: { createdAt: { gte: start, lte: end }, chatStarted: true },
    }),
    prisma.matchMessage.aggregate({
      where: { createdAt: { gte: start, lte: end } },
      _count: { id: true },
    }),
  ])

  return {
    totalProfiles,
    activeProfiles,
    verifiedProfiles,
    swipeStats: swipeStats.map((s) => ({
      action: s.action,
      count: s._count.id,
    })),
    connections: {
      count: connectionStats._count.id,
      avgCompatibility: connectionStats._avg.compatibilityScore,
    },
    chatStartedCount,
    messageCount: messageStats._count.id,
  }
}

async function fetchNotificationsData(start: Date, end: Date) {
  const [
    emailByStatus,
    emailByType,
    recentEmails,
    activePushSubscriptions,
    totalPushSubscriptions,
  ] = await Promise.all([
    prisma.emailLog.groupBy({
      by: ['status'],
      where: { createdAt: { gte: start, lte: end } },
      _count: { id: true },
    }),
    prisma.emailLog.groupBy({
      by: ['type'],
      where: { createdAt: { gte: start, lte: end } },
      _count: { id: true },
    }),
    prisma.emailLog.findMany({
      where: { createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.pushSubscription.count({ where: { isActive: true } }),
    prisma.pushSubscription.count(),
  ])

  return {
    emailByStatus: emailByStatus.map((e) => ({
      status: e.status,
      count: e._count.id,
    })),
    emailByType: emailByType.map((e) => ({
      type: e.type,
      count: e._count.id,
    })),
    recentEmails: recentEmails.map((e) => ({
      id: e.id,
      email: e.email,
      type: e.type,
      status: e.status,
      subject: e.subject,
      errorMsg: e.errorMsg,
      provider: e.provider,
      createdAt: e.createdAt.toISOString(),
    })),
    activePushSubscriptions,
    totalPushSubscriptions,
  }
}

async function fetchContentData(start: Date, end: Date) {
  const [
    consultationCount,
    consultationByTheme,
    destinyMatrixCount,
    destinyMatrixByType,
    pdfGeneratedCount,
    tarotReadingCount,
    tarotByTheme,
    readingsByType,
    pastLifeCount,
    compatibilityCount,
  ] = await Promise.all([
    prisma.consultationHistory.count({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.consultationHistory.groupBy({
      by: ['theme'],
      where: { createdAt: { gte: start, lte: end } },
      _count: { id: true },
    }),
    prisma.destinyMatrixReport.count({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.destinyMatrixReport.groupBy({
      by: ['reportType'],
      where: { createdAt: { gte: start, lte: end } },
      _count: { id: true },
    }),
    prisma.destinyMatrixReport.count({
      where: { createdAt: { gte: start, lte: end }, pdfGenerated: true },
    }),
    prisma.tarotReading.count({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.tarotReading.groupBy({
      by: ['theme'],
      where: { createdAt: { gte: start, lte: end } },
      _count: { id: true },
    }),
    prisma.reading.groupBy({
      by: ['type'],
      where: { createdAt: { gte: start, lte: end } },
      _count: { id: true },
    }),
    prisma.pastLifeResult.count({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.compatibilityResult.count({ where: { createdAt: { gte: start, lte: end } } }),
  ])

  return {
    consultations: {
      count: consultationCount,
      byTheme: consultationByTheme.map((c) => ({ theme: c.theme, count: c._count.id })),
    },
    destinyMatrix: {
      count: destinyMatrixCount,
      byType: destinyMatrixByType.map((d) => ({ reportType: d.reportType, count: d._count.id })),
      pdfGenerated: pdfGeneratedCount,
    },
    tarotReadings: {
      count: tarotReadingCount,
      byTheme: tarotByTheme.map((t) => ({ theme: t.theme, count: t._count.id })),
    },
    readingsByType: readingsByType.map((r) => ({ type: r.type, count: r._count.id })),
    pastLifeCount,
    compatibilityCount,
  }
}

async function fetchModerationData(start: Date, end: Date) {
  const [
    reportsByStatus,
    recentReports,
    totalBlocks,
    recentBlocks,
    referralStats,
    referralByStatus,
  ] = await Promise.all([
    prisma.userReport.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.userReport.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: {
        id: true,
        category: true,
        status: true,
        description: true,
        createdAt: true,
        reporter: { select: { email: true } },
        reported: { select: { email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.userBlock.count(),
    prisma.userBlock.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: {
        id: true,
        reason: true,
        createdAt: true,
        blocker: { select: { email: true } },
        blocked: { select: { email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.referralReward.aggregate({
      where: { createdAt: { gte: start, lte: end } },
      _sum: { creditsAwarded: true },
      _count: { id: true },
    }),
    prisma.referralReward.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
  ])

  return {
    reportsByStatus: reportsByStatus.map((r) => ({ status: r.status, count: r._count.id })),
    recentReports: recentReports.map((r) => ({
      id: r.id,
      category: r.category,
      status: r.status,
      description: r.description,
      createdAt: r.createdAt.toISOString(),
      reporterEmail: r.reporter.email,
      reportedEmail: r.reported.email,
    })),
    totalBlocks,
    recentBlocks: recentBlocks.map((b) => ({
      id: b.id,
      reason: b.reason,
      createdAt: b.createdAt.toISOString(),
      blockerEmail: b.blocker.email,
      blockedEmail: b.blocked.email,
    })),
    referralStats: {
      totalCredits: referralStats._sum.creditsAwarded || 0,
      totalRewards: referralStats._count.id,
    },
    referralByStatus: referralByStatus.map((r) => ({ status: r.status, count: r._count.id })),
  }
}

async function fetchAuditData(start: Date, end: Date) {
  const [recentLogs, actionBreakdown, totalLogs] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where: { createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.adminAuditLog.groupBy({
      by: ['action'],
      where: { createdAt: { gte: start, lte: end } },
      _count: { id: true },
    }),
    prisma.adminAuditLog.count({
      where: { createdAt: { gte: start, lte: end } },
    }),
  ])

  return {
    totalLogs,
    recentLogs: recentLogs.map((l) => ({
      id: l.id,
      adminEmail: l.adminEmail,
      action: l.action,
      targetType: l.targetType,
      targetId: l.targetId,
      success: l.success,
      errorMessage: l.errorMessage,
      createdAt: l.createdAt.toISOString(),
      metadata: l.metadata,
    })),
    actionBreakdown: actionBreakdown.map((a) => ({ action: a.action, count: a._count.id })),
  }
}

async function fetchSystemData(start: Date, end: Date) {
  const [
    creditRefundsByType,
    creditRefundsByReason,
    recentCreditRefunds,
    stripeEventsByType,
    stripeFailures,
    recentStripeEvents,
    sharedResultStats,
  ] = await Promise.all([
    prisma.creditRefundLog.groupBy({
      by: ['creditType'],
      where: { createdAt: { gte: start, lte: end } },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.creditRefundLog.groupBy({
      by: ['reason'],
      where: { createdAt: { gte: start, lte: end } },
      _count: { id: true },
    }),
    prisma.creditRefundLog.findMany({
      where: { createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.stripeEventLog.groupBy({
      by: ['type'],
      where: { processedAt: { gte: start, lte: end } },
      _count: { id: true },
    }),
    prisma.stripeEventLog.count({
      where: { processedAt: { gte: start, lte: end }, success: false },
    }),
    prisma.stripeEventLog.findMany({
      where: { processedAt: { gte: start, lte: end } },
      orderBy: { processedAt: 'desc' },
      take: 20,
    }),
    prisma.sharedResult.groupBy({
      by: ['resultType'],
      _count: { id: true },
      _sum: { viewCount: true },
    }),
  ])

  return {
    creditRefunds: {
      byType: creditRefundsByType.map((c) => ({
        creditType: c.creditType,
        totalAmount: c._sum.amount || 0,
        count: c._count.id,
      })),
      byReason: creditRefundsByReason.map((c) => ({
        reason: c.reason,
        count: c._count.id,
      })),
      recent: recentCreditRefunds.map((r) => ({
        id: r.id,
        userId: r.userId,
        creditType: r.creditType,
        amount: r.amount,
        reason: r.reason,
        apiRoute: r.apiRoute,
        createdAt: r.createdAt.toISOString(),
      })),
    },
    stripeEvents: {
      byType: stripeEventsByType.map((s) => ({
        type: s.type,
        count: s._count.id,
      })),
      failureCount: stripeFailures,
      recent: recentStripeEvents.map((s) => ({
        id: s.id,
        eventId: s.eventId,
        type: s.type,
        success: s.success,
        errorMsg: s.errorMsg,
        processedAt: s.processedAt.toISOString(),
      })),
    },
    sharedResults: sharedResultStats.map((s) => ({
      resultType: s.resultType,
      count: s._count.id,
      totalViews: s._sum.viewCount || 0,
    })),
  }
}

async function fetchPerformanceData(start: Date, end: Date) {
  const backendUrl = process.env.BACKEND_AI_URL || 'http://localhost:5000'
  try {
    const response = await fetch(
      `${backendUrl}/api/analytics/performance?start=${start.toISOString()}&end=${end.toISOString()}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': process.env.ADMIN_API_TOKEN || '',
        },
      }
    )

    if (!response.ok) {
      logger.warn('[Comprehensive] Performance backend error', { status: response.status })
      return getDefaultPerformanceData()
    }

    const result = await response.json()
    return result.data || getDefaultPerformanceData()
  } catch (_error) {
    logger.warn('[Comprehensive] Performance fetch failed, using defaults')
    return getDefaultPerformanceData()
  }
}

function getDefaultPerformanceData() {
  return {
    apiMetrics: [],
    bottlenecks: [],
    ragMetrics: {
      totalTraces: 0,
      avgDurationMs: 0,
      p50DurationMs: 0,
      p95DurationMs: 0,
      maxDurationMs: 0,
      errorRate: 0,
      sourceMetrics: {},
    },
    cacheMetrics: {
      hitRate: 0,
      hits: 0,
      misses: 0,
      errors: 0,
      backend: 'memory' as const,
      memoryEntries: 0,
    },
    distributedTraces: [],
    systemHealth: {
      status: 'healthy' as const,
      memoryMb: 0,
      totalRequests: 0,
      errorRatePercent: 0,
    },
  }
}

async function fetchBehaviorData(start: Date, end: Date) {
  const [cohortData, funnelData, engagementData, activityData] = await Promise.allSettled([
    fetchCohortAnalysis(),
    fetchRetentionFunnel(start, end),
    fetchEngagementByService(start, end),
    fetchUserActivitySummary(),
  ])

  // Get churn prediction from backend
  let churnData = { atRiskUsers: [], totalAtRisk: 0, predictedChurnNext30Days: 0 }
  try {
    const backendUrl = process.env.BACKEND_AI_URL || 'http://localhost:5000'
    const response = await fetch(`${backendUrl}/api/analytics/behavior`, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.ADMIN_API_TOKEN || '',
      },
    })
    if (response.ok) {
      const result = await response.json()
      churnData = result.data?.churnPrediction || churnData
    }
  } catch {
    // Use fallback
  }

  return {
    cohortAnalysis: cohortData.status === 'fulfilled' ? cohortData.value : { cohorts: [], avgRetentionRate: 0 },
    retentionFunnel: funnelData.status === 'fulfilled' ? funnelData.value : { stages: [], overallConversion: 0 },
    churnPrediction: churnData,
    engagementByService: engagementData.status === 'fulfilled' ? engagementData.value : [],
    userActivitySummary: activityData.status === 'fulfilled' ? activityData.value : {
      totalActiveToday: 0, totalActiveThisWeek: 0, totalActiveThisMonth: 0, newUsersToday: 0,
    },
  }
}

async function fetchCohortAnalysis() {
  const cohorts = []
  const now = new Date()

  for (let i = 0; i < 6; i++) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    const period = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`

    const totalUsers = await prisma.user.count({
      where: { createdAt: { gte: monthStart, lte: monthEnd } },
    })

    const retentionByWeek = [100]
    for (let week = 1; week <= 4; week++) {
      const weekStart = new Date(monthStart)
      weekStart.setDate(weekStart.getDate() + week * 7)
      if (weekStart > now) {
        retentionByWeek.push(0)
        continue
      }
      const activeInWeek = await prisma.reading.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: weekStart },
          user: { createdAt: { gte: monthStart, lte: monthEnd } },
        },
      })
      const retention = totalUsers > 0 ? (activeInWeek.length / totalUsers) * 100 : 0
      retentionByWeek.push(Math.round(retention * 10) / 10)
    }

    cohorts.push({ period, totalUsers, retentionByWeek })
  }

  const week4Rates = cohorts.map((c) => c.retentionByWeek[4] || 0).filter((r) => r > 0)
  const avgRetentionRate = week4Rates.length > 0 ? week4Rates.reduce((a, b) => a + b, 0) / week4Rates.length : 0

  return { cohorts, avgRetentionRate: Math.round(avgRetentionRate * 10) / 10 }
}

async function fetchRetentionFunnel(start: Date, end: Date) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [signups, firstReadingUsers, paidUsers, retained7dUsers, retained30dUsers] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.reading.groupBy({ by: ['userId'], where: { createdAt: { gte: start, lte: end } } }),
    prisma.subscription.count({ where: { createdAt: { gte: start, lte: end }, status: { in: ['active', 'trialing'] } } }),
    // Users who signed up in range and had activity (reading) in last 7 days
    prisma.reading.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: sevenDaysAgo },
        user: { createdAt: { gte: start, lte: end } },
      },
    }),
    // Users who signed up in range and had activity (reading) in last 30 days
    prisma.reading.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: thirtyDaysAgo },
        user: { createdAt: { gte: start, lte: end } },
      },
    }),
  ])

  const retained7d = retained7dUsers.length
  const retained30d = retained30dUsers.length

  const stages = [
    { name: 'signup', label: '가입', count: signups, conversionRate: 100, dropoffRate: 0 },
    {
      name: 'first_reading', label: '첫 리딩', count: firstReadingUsers.length,
      conversionRate: signups > 0 ? Math.round((firstReadingUsers.length / signups) * 1000) / 10 : 0,
      dropoffRate: signups > 0 ? Math.round(((signups - firstReadingUsers.length) / signups) * 1000) / 10 : 0,
    },
    {
      name: 'paid', label: '첫 결제', count: paidUsers,
      conversionRate: signups > 0 ? Math.round((paidUsers / signups) * 1000) / 10 : 0,
      dropoffRate: firstReadingUsers.length > 0 ? Math.round(((firstReadingUsers.length - paidUsers) / firstReadingUsers.length) * 1000) / 10 : 0,
    },
    {
      name: 'retained_7d', label: '7일 유지', count: retained7d,
      conversionRate: signups > 0 ? Math.round((retained7d / signups) * 1000) / 10 : 0,
      dropoffRate: paidUsers > 0 ? Math.round(((paidUsers - retained7d) / paidUsers) * 1000) / 10 : 0,
    },
    {
      name: 'retained_30d', label: '30일 유지', count: retained30d,
      conversionRate: signups > 0 ? Math.round((retained30d / signups) * 1000) / 10 : 0,
      dropoffRate: retained7d > 0 ? Math.round(((retained7d - retained30d) / retained7d) * 1000) / 10 : 0,
    },
  ]

  return { stages, overallConversion: signups > 0 ? Math.round((retained30d / signups) * 1000) / 10 : 0 }
}

async function fetchEngagementByService(start: Date, end: Date) {
  const readingsByType = await prisma.reading.groupBy({
    by: ['type'],
    where: { createdAt: { gte: start, lte: end } },
    _count: { id: true },
  })

  const now = new Date()
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const services = []
  for (const reading of readingsByType) {
    const [dau, wau, mau] = await Promise.all([
      prisma.reading.groupBy({ by: ['userId'], where: { type: reading.type, createdAt: { gte: dayAgo } } }),
      prisma.reading.groupBy({ by: ['userId'], where: { type: reading.type, createdAt: { gte: weekAgo } } }),
      prisma.reading.groupBy({ by: ['userId'], where: { type: reading.type, createdAt: { gte: monthAgo } } }),
    ])
    services.push({
      service: reading.type,
      dailyActiveUsers: dau.length,
      weeklyActiveUsers: wau.length,
      monthlyActiveUsers: mau.length,
      totalReadings: reading._count.id,
    })
  }

  return services
}

async function fetchUserActivitySummary() {
  const now = new Date()
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Get active users based on reading activity instead of lastActiveAt
  const [activeTodayUsers, activeWeekUsers, activeMonthUsers, newToday] = await Promise.all([
    prisma.reading.groupBy({ by: ['userId'], where: { createdAt: { gte: dayAgo } } }),
    prisma.reading.groupBy({ by: ['userId'], where: { createdAt: { gte: weekAgo } } }),
    prisma.reading.groupBy({ by: ['userId'], where: { createdAt: { gte: monthAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: dayAgo } } }),
  ])

  return {
    totalActiveToday: activeTodayUsers.length,
    totalActiveThisWeek: activeWeekUsers.length,
    totalActiveThisMonth: activeMonthUsers.length,
    newUsersToday: newToday,
  }
}

export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      if (!context.userId || !context.session?.user?.email) {
        return apiError(ErrorCodes.UNAUTHORIZED, 'Unauthorized')
      }

      const isAdmin = await isAdminUser(context.userId)
      if (!isAdmin) {
        logger.warn('[Comprehensive] Unauthorized access attempt', {
          email: context.session.user.email,
          userId: context.userId,
        })
        return apiError(ErrorCodes.FORBIDDEN, 'Forbidden')
      }

      const { searchParams } = new URL(req.url)
      const section = searchParams.get('section') as Section
      const timeRangeParam = searchParams.get('timeRange') || '24h'

      if (!section || !VALID_SECTIONS.includes(section)) {
        return apiError(
          ErrorCodes.VALIDATION_ERROR,
          `Invalid section. Must be one of: ${VALID_SECTIONS.join(', ')}`
        )
      }

      const validationResult = DashboardTimeRangeSchema.safeParse(timeRangeParam)
      if (!validationResult.success) {
        return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid timeRange parameter')
      }

      const timeRange = validationResult.data
      const { start, end } = getDateRange(timeRange)

      let data: unknown

      switch (section) {
        case 'users':
          data = await fetchUsersData(start, end)
          break
        case 'revenue':
          data = await fetchRevenueData(start, end)
          break
        case 'matching':
          data = await fetchMatchingData(start, end)
          break
        case 'notifications':
          data = await fetchNotificationsData(start, end)
          break
        case 'content':
          data = await fetchContentData(start, end)
          break
        case 'moderation':
          data = await fetchModerationData(start, end)
          break
        case 'audit':
          data = await fetchAuditData(start, end)
          break
        case 'system':
          data = await fetchSystemData(start, end)
          break
        case 'performance':
          data = await fetchPerformanceData(start, end)
          break
        case 'behavior':
          data = await fetchBehaviorData(start, end)
          break
      }

      return apiSuccess({ data, section, timeRange } as Record<string, unknown>)
    } catch (err) {
      logger.error('[Comprehensive API Error]', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal server error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/admin/metrics/comprehensive',
    limit: 30,
    windowSeconds: 60,
  })
)
