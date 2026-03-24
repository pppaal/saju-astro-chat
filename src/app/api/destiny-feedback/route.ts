import { NextRequest, NextResponse } from 'next/server'

import { withApiMiddleware, createAuthenticatedGuard } from '@/lib/api/middleware'
import { HTTP_STATUS } from '@/lib/constants/http'
import { persistDestinyOutcomeFeedback } from '@/lib/destiny-matrix/predictionSnapshot'

type FeedbackBody = {
  predictionId?: unknown
  service?: unknown
  lang?: unknown
  happened?: unknown
  actualDomain?: unknown
  actualWindowBucket?: unknown
  actualDate?: unknown
  matchedPrediction?: unknown
  note?: unknown
}

function isService(value: unknown): value is 'calendar' | 'counselor' | 'report' {
  return value === 'calendar' || value === 'counselor' || value === 'report'
}

function isLang(value: unknown): value is 'ko' | 'en' {
  return value === 'ko' || value === 'en'
}

function isWindowBucket(
  value: unknown
): value is 'early' | 'mid' | 'late' | 'outside' | 'unknown' {
  return (
    value === 'early' ||
    value === 'mid' ||
    value === 'late' ||
    value === 'outside' ||
    value === 'unknown'
  )
}

function asTrimmedString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export const POST = withApiMiddleware(
  async (request: NextRequest, context) => {
    const userId = context.userId
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required.' } },
        { status: HTTP_STATUS.UNAUTHORIZED }
      )
    }

    let body: FeedbackBody
    try {
      body = (await request.json()) as FeedbackBody
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_JSON', message: 'Invalid JSON body.' } },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    const predictionId = asTrimmedString(body.predictionId)
    if (!predictionId || !isService(body.service) || !isLang(body.lang)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'predictionId, service, lang are required.' },
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    if (body.actualWindowBucket != null && !isWindowBucket(body.actualWindowBucket)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'actualWindowBucket is invalid.' },
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    const savedId = await persistDestinyOutcomeFeedback({
      userId,
      predictionId,
      service: body.service,
      lang: body.lang,
      happened: typeof body.happened === 'boolean' ? body.happened : null,
      actualDomain: asTrimmedString(body.actualDomain),
      actualWindowBucket: body.actualWindowBucket ?? null,
      actualDate: asTrimmedString(body.actualDate),
      matchedPrediction: typeof body.matchedPrediction === 'boolean' ? body.matchedPrediction : null,
      note: asTrimmedString(body.note),
    })

    if (!savedId) {
      return NextResponse.json(
        { success: false, error: { code: 'SAVE_FAILED', message: 'Could not save feedback.' } },
        { status: HTTP_STATUS.SERVER_ERROR }
      )
    }

    return NextResponse.json({ success: true, feedbackId: savedId })
  },
  createAuthenticatedGuard({
    route: 'destiny-feedback',
    limit: 60,
    windowSeconds: 60,
  })
)
