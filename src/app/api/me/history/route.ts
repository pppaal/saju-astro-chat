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
import { cacheGet, cacheSet } from '@/lib/cache/redis-cache'
import { meHistoryQuerySchema } from '@/lib/api/zodValidation'

type ServiceRecord = {
  id: string
  date: string
  service: string
  theme?: string | null
  summary?: string | null
  type: string
}

type DailyHistory = {
  date: string
  records: ServiceRecord[]
}

// Format destiny map summary based on theme
function formatDestinyMapSummary(theme?: string | null): string {
  if (!theme) {
    return 'Destiny Map 분석을 이용했습니다'
  }

  const themeLabels: Record<string, string> = {
    focus_overall: '종합 운세',
    focus_love: '연애운',
    focus_career: '직장/사업운',
    focus_money: '재물운',
    focus_health: '건강운',
    dream: '꿈 해석',
  }

  const label = themeLabels[theme] || theme
  return `${label} 분석을 이용했습니다`
}

export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      const userId = context.userId!

      // Parse and validate query parameters
      const { searchParams } = new URL(req.url)
      const queryValidation = meHistoryQuerySchema.safeParse({
        limit: searchParams.get('limit') ?? undefined,
        offset: searchParams.get('offset') ?? undefined,
        type: searchParams.get('service') ?? undefined,
      })
      if (!queryValidation.success) {
        return apiError(
          ErrorCodes.VALIDATION_ERROR,
          `Validation failed: ${queryValidation.error.issues.map((e) => e.message).join(', ')}`
        )
      }
      const { limit, offset, type: service } = queryValidation.data

      // Check Redis cache first (5 minute TTL for history)
      const cacheKey = `user:${userId}:history:${limit}:${offset}:${service || 'all'}`
      try {
        const cached = await cacheGet<DailyHistory[]>(cacheKey)
        if (cached) {
          logger.info('[History] Cache hit')
          return apiSuccess({ history: cached })
        }
      } catch (err) {
        logger.warn('[History] Cache read failed:', err)
      }

      const perTableLimit = Math.ceil(limit / 3)
      const minorTableLimit = Math.ceil(limit / 6)

      const safeQuery = <T>(promise: Promise<T[]>): Promise<T[]> =>
        promise.catch((err) => {
          logger.warn('[History] Query failed (table may not exist):', err?.message)
          return [] as T[]
        })

      const [
        readings,
        tarotReadings,
        consultations,
        interactions,
        dailyFortunes,
        calendarDates,
        icpResults,
        compatibilityResults,
        matrixReports,
        personalityResults,
      ] = await Promise.all([
        prisma.reading.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: perTableLimit,
          skip: offset > 0 ? Math.floor(offset / 9) : 0,
          select: { id: true, createdAt: true, type: true, title: true },
        }),
        prisma.tarotReading.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: perTableLimit,
          skip: offset > 0 ? Math.floor(offset / 9) : 0,
          select: { id: true, createdAt: true, question: true, theme: true, spreadTitle: true },
        }),
        prisma.consultationHistory.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: perTableLimit,
          skip: offset > 0 ? Math.floor(offset / 9) : 0,
          select: { id: true, createdAt: true, theme: true, summary: true },
        }),
        prisma.userInteraction.findMany({
          where: { userId, type: { in: ['complete', 'view'] } },
          orderBy: { createdAt: 'desc' },
          take: minorTableLimit,
          skip: offset > 0 ? Math.floor(offset / 9) : 0,
          select: { id: true, createdAt: true, type: true, service: true, theme: true },
        }),
        prisma.dailyFortune.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: Math.min(minorTableLimit, 14),
          select: { id: true, createdAt: true, date: true, overallScore: true },
        }),
        prisma.savedCalendarDate.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: minorTableLimit,
          skip: offset > 0 ? Math.floor(offset / 9) : 0,
          select: { id: true, createdAt: true, date: true, grade: true, title: true },
        }),
        prisma.iCPResult.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: minorTableLimit,
          skip: offset > 0 ? Math.floor(offset / 9) : 0,
          select: { id: true, createdAt: true, primaryStyle: true, secondaryStyle: true },
        }),
        prisma.compatibilityResult.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: minorTableLimit,
          skip: offset > 0 ? Math.floor(offset / 9) : 0,
          select: {
            id: true,
            createdAt: true,
            crossSystemScore: true,
            person1Name: true,
            person2Name: true,
          },
        }),
        safeQuery(
          prisma.destinyMatrixReport.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: minorTableLimit,
            skip: offset > 0 ? Math.floor(offset / 9) : 0,
            select: {
              id: true,
              createdAt: true,
              reportType: true,
              period: true,
              theme: true,
              title: true,
              summary: true,
              overallScore: true,
              grade: true,
            },
          })
        ),
        prisma.personalityResult.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: minorTableLimit,
          skip: offset > 0 ? Math.floor(offset / 10) : 0,
          select: { id: true, createdAt: true, typeCode: true, personaName: true },
        }),
      ])

      const allRecords: ServiceRecord[] = [
        ...readings.map((r) => ({
          id: r.id,
          date: r.createdAt.toISOString().split('T')[0],
          service: r.type,
          theme: undefined as string | undefined,
          summary: r.title || undefined,
          type: 'reading' as string,
        })),
        ...tarotReadings.map((t) => ({
          id: t.id,
          date: t.createdAt.toISOString().split('T')[0],
          service: 'tarot' as string,
          theme: (t.theme || undefined) as string | undefined,
          summary: t.question || t.spreadTitle || '타로 리딩',
          type: 'tarot-reading' as string,
        })),
        ...consultations.map((c) => ({
          id: c.id,
          date: c.createdAt.toISOString().split('T')[0],
          service:
            c.theme === 'dream'
              ? 'dream'
              : c.theme === 'life-prediction-timing'
                ? 'life-prediction-timing'
                : c.theme === 'life-prediction'
                  ? 'life-prediction'
                  : 'destiny-map',
          theme: c.theme === 'dream' ? undefined : c.theme || undefined,
          summary:
            c.theme === 'dream'
              ? c.summary || '꿈 해석'
              : c.theme?.startsWith('life-prediction')
                ? c.summary || '인생 예측'
                : formatDestinyMapSummary(c.theme),
          type: 'consultation',
        })),
        ...interactions.map((i) => ({
          id: i.id,
          date: i.createdAt.toISOString().split('T')[0],
          service: i.service,
          theme: (i.theme || undefined) as string | undefined,
          summary: undefined as string | undefined,
          type: 'interaction',
        })),
        ...dailyFortunes.map((f) => ({
          id: f.id,
          date: f.date,
          service: 'daily-fortune',
          theme: undefined,
          summary: `Overall score: ${f.overallScore}`,
          type: 'fortune',
        })),
        ...calendarDates.map((c) => ({
          id: c.id,
          date: c.date,
          service: 'destiny-calendar',
          theme: c.grade <= 2 ? '좋은 날' : c.grade === 4 ? '주의 날' : '보통 날',
          summary: c.title || '저장된 날짜',
          type: 'calendar',
        })),
        ...icpResults.map((i) => ({
          id: i.id,
          date: i.createdAt.toISOString().split('T')[0],
          service: 'personality-icp',
          theme: i.primaryStyle,
          summary: `${i.primaryStyle}${i.secondaryStyle ? ` / ${i.secondaryStyle}` : ''} 스타일`,
          type: 'icp-result',
        })),
        ...compatibilityResults.map((c) => ({
          id: c.id,
          date: c.createdAt.toISOString().split('T')[0],
          service: 'compatibility',
          theme: undefined,
          summary: `${c.person1Name || 'Person 1'} & ${c.person2Name || 'Person 2'} - 궁합 ${c.crossSystemScore}점`,
          type: 'compatibility-result',
        })),
        ...matrixReports.map((m) => ({
          id: m.id,
          date: m.createdAt.toISOString().split('T')[0],
          service: ['timing', 'themed', 'comprehensive'].includes(m.reportType)
            ? 'premium-reports'
            : 'destiny-matrix',
          theme: m.reportType === 'timing' ? m.period : m.theme,
          summary: m.summary || m.title || `${m.grade || ''} ${m.overallScore || ''}점`,
          type: 'destiny-matrix-report',
        })),
        ...personalityResults.map((p) => ({
          id: p.id,
          date: p.createdAt.toISOString().split('T')[0],
          service: 'personality',
          theme: p.typeCode,
          summary: `${p.personaName} (${p.typeCode})`,
          type: 'personality-result',
        })),
      ]

      const filteredRecords = service
        ? allRecords.filter((r) => r.service === service || r.type === service)
        : allRecords

      const filteredByDate = filteredRecords.reduce(
        (acc, record) => {
          if (!acc[record.date]) {
            acc[record.date] = []
          }
          acc[record.date].push(record)
          return acc
        },
        {} as Record<string, ServiceRecord[]>
      )

      const history: DailyHistory[] = Object.entries(filteredByDate)
        .map(([date, records]) => ({
          date,
          records: records.sort((a, b) => a.service.localeCompare(b.service)),
        }))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, limit)

      const totalRecords = allRecords.length
      const hasMore = totalRecords >= limit || history.length >= limit

      try {
        await cacheSet(cacheKey, history, 300)
        logger.info('[History] Cached result')
      } catch (err) {
        logger.warn('[History] Cache write failed:', err)
      }

      return apiSuccess({
        history,
        pagination: {
          limit,
          offset,
          count: history.length,
          totalRecords,
          hasMore,
        },
      })
    } catch (err) {
      logger.error('Error fetching history:', err)
      return apiError(ErrorCodes.DATABASE_ERROR, 'Internal server error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/me/history',
    limit: 60,
    windowSeconds: 60,
  })
)
