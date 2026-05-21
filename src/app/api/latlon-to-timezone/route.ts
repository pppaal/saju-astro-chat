import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createPublicStreamGuard } from '@/lib/api/middleware'
import { captureServerError } from '@/lib/telemetry'
import { HTTP_STATUS } from '@/lib/constants/http'
import { latlonToTimezoneSchema } from '@/lib/api/zodValidation'
import { logger } from '@/lib/logger'

export const POST = withApiMiddleware(
  async (req: NextRequest) => {
    try {
      const rawBody = await req.json()

      // Validate with Zod
      const validationResult = latlonToTimezoneSchema.safeParse({
        latitude: Number(rawBody?.lat),
        longitude: Number(rawBody?.lon),
      })
      if (!validationResult.success) {
        logger.warn('[latlon-to-timezone] validation failed', {
          errors: validationResult.error.issues,
        })
        return NextResponse.json(
          {
            error: 'validation_failed',
            details: validationResult.error.issues.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      const { latitude, longitude } = validationResult.data

      const { default: tzLookup } = await import('tz-lookup')
      const timeZone = tzLookup(latitude, longitude)
      const res = NextResponse.json({ timeZone })
      res.headers.set('Cache-Control', 'public, max-age=2592000, immutable')
      return res
    } catch (e: unknown) {
      captureServerError(e, { route: '/api/latlon-to-timezone' })
      // 내부 에러 메시지를 클라이언트에 노출하지 않음(스택/내부 단서 누출 방지).
      // 실제 원인은 captureServerError 로 서버에서만 기록.
      return NextResponse.json(
        { error: 'server error' },
        { status: HTTP_STATUS.SERVER_ERROR }
      )
    }
  },
  createPublicStreamGuard({
    route: '/api/latlon-to-timezone',
    limit: 60,
    windowSeconds: 60,
  })
)
