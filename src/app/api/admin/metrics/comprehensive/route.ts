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
