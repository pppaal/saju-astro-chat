// src/app/api/iching/changing-line/route.ts
// 변효 해석 API - 백엔드에서 변효 데이터를 가져옴

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createSimpleGuard, type ApiContext } from '@/lib/api/middleware'
import { apiClient } from '@/lib/api/ApiClient'
import { logger } from '@/lib/logger'
import { IChingChangingLineSchema } from '@/lib/api/validator'

export const POST = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    }

    const parsed = IChingChangingLineSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ') },
        { status: 400 }
      )
    }

    const { hexagramNumber, lineIndex, locale } = parsed.data

    // Call backend to get changing line interpretation
    const response = await apiClient.post(
      '/iching/changing-line',
      {
        hexagramNumber,
        lineIndex: lineIndex + 1, // Backend uses 1-6
        locale,
      },
      { timeout: 10000 }
    )

    if (!response.ok) {
      logger.error('[ChangingLine] Backend error:', {
        status: response.status,
        error: response.error,
      });
      return NextResponse.json(
        { error: 'Backend error', detail: response.error },
        { status: response.status || 500 }
      )
    }

    return NextResponse.json(response.data)
  },
  createSimpleGuard({
    route: 'iching-changing-line',
    limit: 60,
    windowSeconds: 60,
  })
)
