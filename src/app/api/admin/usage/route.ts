/**
 * Admin Usage Analytics API
 *
 * GET /api/admin/usage?days=30
 *
 * 데이터 분석용 집계 — "어떤 서비스를 어떤 시간대에 많이 썼나 + 어떤 질문/
 * 주제가 많았나". 실제 활동이 쌓이는 테이블만 본다:
 *   - CounselorChatSession (운명상담/궁합 채팅) : type, keyTopics, createdAt
 *   - TarotReading                              : question, spreadType, createdAt
 * 시간대는 KST(Asia/Seoul) 기준 시(0-23)로 집계.
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
import { adminDaysQuerySchema, formatZodErrors } from '@/lib/api/zodValidation'

export const dynamic = 'force-dynamic'

export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      if (!context.userId || !context.session?.user?.email) {
        return apiError(ErrorCodes.UNAUTHORIZED, 'Unauthorized')
      }
      if (!(await isAdminUser(context.userId, context.session?.user?.email))) {
        logger.warn('[admin/usage] unauthorized', { userId: context.userId })
        return apiError(ErrorCodes.FORBIDDEN, 'Forbidden')
      }

      // 잘못된 days 는 silent clamp 대신 422 — 오타를 기본값으로 흡수하면
      // 운영자가 의도와 다른 기간을 보고 있는 걸 알아챌 수 없다.
      const { searchParams } = new URL(req.url)
      const parsedQuery = adminDaysQuerySchema.safeParse(Object.fromEntries(searchParams))
      if (!parsedQuery.success) {
        return apiError(
          ErrorCodes.VALIDATION_ERROR,
          'days must be an integer between 1 and 365',
          formatZodErrors(parsedQuery.error)
        )
      }
      const { days } = parsedQuery.data
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

      const [counselorByType, tarotTotal, hourlyRows, topTopics, topTarotQuestions, dailyRows] =
        await Promise.all([
          // 서비스별(상담 type) 세션 수
          prisma.counselorChatSession.groupBy({
            by: ['type'],
            where: { createdAt: { gte: since } },
            _count: { id: true },
          }),
          // 타로 총 건수
          prisma.tarotReading.count({ where: { createdAt: { gte: since } } }),
          // 시간대별(KST) 분포 — 상담 + 타로 합산
          prisma.$queryRaw<Array<{ hour: number; source: string; count: bigint }>>`
          SELECT EXTRACT(HOUR FROM "createdAt" AT TIME ZONE 'Asia/Seoul')::int AS hour,
                 'counselor' AS source, COUNT(*)::bigint AS count
          FROM "CounselorChatSession" WHERE "createdAt" >= ${since}
          GROUP BY 1
          UNION ALL
          SELECT EXTRACT(HOUR FROM "createdAt" AT TIME ZONE 'Asia/Seoul')::int AS hour,
                 'tarot' AS source, COUNT(*)::bigint AS count
          FROM "TarotReading" WHERE "createdAt" >= ${since}
          GROUP BY 1
        `,
          // 인기 주제 — keyTopics(jsonb 배열) 펼쳐서 카운트
          prisma.$queryRaw<Array<{ topic: string; count: bigint }>>`
          SELECT topic, COUNT(*)::bigint AS count
          FROM "CounselorChatSession",
               LATERAL jsonb_array_elements_text(
                 CASE WHEN jsonb_typeof("keyTopics") = 'array' THEN "keyTopics" ELSE '[]'::jsonb END
               ) AS topic
          WHERE "createdAt" >= ${since}
            AND "keyTopics" IS NOT NULL
          GROUP BY topic
          ORDER BY count DESC
          LIMIT 30
        `,
          // 인기 타로 질문 — 동일 질문 묶어 카운트
          prisma.$queryRaw<Array<{ question: string; count: bigint }>>`
          SELECT trim("question") AS question, COUNT(*)::bigint AS count
          FROM "TarotReading"
          WHERE "createdAt" >= ${since}
            AND "question" IS NOT NULL AND trim("question") <> ''
          GROUP BY trim("question")
          ORDER BY count DESC
          LIMIT 30
        `,
          // 일별 추이 — 상담 + 타로 합산 (KST 일자)
          prisma.$queryRaw<Array<{ day: string; source: string; count: bigint }>>`
          SELECT to_char("createdAt" AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS day,
                 'counselor' AS source, COUNT(*)::bigint AS count
          FROM "CounselorChatSession" WHERE "createdAt" >= ${since}
          GROUP BY 1
          UNION ALL
          SELECT to_char("createdAt" AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS day,
                 'tarot' AS source, COUNT(*)::bigint AS count
          FROM "TarotReading" WHERE "createdAt" >= ${since}
          GROUP BY 1
        `,
        ])

      // 시간대 0-23 정규화 (상담+타로 합산)
      const hourly = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        counselor: 0,
        tarot: 0,
        total: 0,
      }))
      for (const r of hourlyRows) {
        const h = Number(r.hour)
        if (h >= 0 && h < 24) {
          const n = Number(r.count)
          if (r.source === 'tarot') hourly[h].tarot += n
          else hourly[h].counselor += n
          hourly[h].total += n
        }
      }

      // 일별 합산
      const dailyMap = new Map<
        string,
        { day: string; counselor: number; tarot: number; total: number }
      >()
      for (const r of dailyRows) {
        const cur = dailyMap.get(r.day) ?? { day: r.day, counselor: 0, tarot: 0, total: 0 }
        const n = Number(r.count)
        if (r.source === 'tarot') cur.tarot += n
        else cur.counselor += n
        cur.total += n
        dailyMap.set(r.day, cur)
      }
      const daily = Array.from(dailyMap.values()).sort((a, b) => a.day.localeCompare(b.day))

      const services = [
        ...counselorByType.map((c) => ({ service: `상담:${c.type}`, count: c._count.id })),
        { service: '타로', count: tarotTotal },
      ].sort((a, b) => b.count - a.count)

      return apiSuccess({
        rangeDays: days,
        generatedAt: new Date().toISOString(),
        services,
        hourly,
        daily,
        topTopics: topTopics.map((t) => ({ topic: t.topic, count: Number(t.count) })),
        topTarotQuestions: topTarotQuestions.map((q) => ({
          question: q.question,
          count: Number(q.count),
        })),
      } as Record<string, unknown>)
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      const code = (err as { code?: string } | null)?.code
      logger.error('[admin/usage] error', { code, err })
      return apiError(
        ErrorCodes.INTERNAL_ERROR,
        `usage failed${code ? ` [${code}]` : ''}: ${detail}`
      )
    }
  },
  createAuthenticatedGuard({
    route: '/api/admin/usage',
    limit: 30,
    windowSeconds: 60,
  })
)
