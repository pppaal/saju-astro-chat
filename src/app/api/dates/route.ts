// ✅ src/app/api/dates/route.ts
import { NextRequest } from 'next/server'
import { withApiMiddleware, apiSuccess } from '@/lib/api/middleware'

export const dynamic = 'force-dynamic'

export const GET = withApiMiddleware(
  async (_req: NextRequest) => {
    // 한국(UTC+9) 기준 시각 계산
    const now = new Date(Date.now() + 9 * 60 * 60 * 1000)
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const day = now.getDate()

    const dateText = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dateDisplay = `${year}년 ${month}월 ${day}일`

    return apiSuccess({
      timestamp: now.toISOString(),
      year,
      month,
      day,
      dateText,
      dateDisplay,
      timezone: 'Asia/Seoul',
    })
  },
  {
    route: 'dates',
    rateLimit: {
      limit: 60,
      windowSeconds: 60,
    },
  }
)
