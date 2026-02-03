import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { captureServerError } from '@/lib/telemetry'
import { requirePublicToken } from '@/lib/auth/publicToken'
import { HTTP_STATUS } from '@/lib/constants/http'
import { latlonToTimezoneSchema } from '@/lib/api/zodValidation'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers)
    const limit = await rateLimit(`tz:${ip}`, { limit: 60, windowSeconds: 60 })
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers }
      )
    }
    const tokenCheck = requirePublicToken(req)
    if (!tokenCheck.valid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: HTTP_STATUS.UNAUTHORIZED, headers: limit.headers }
      )
    }

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
        { status: HTTP_STATUS.BAD_REQUEST, headers: limit.headers }
      )
    }

    const { latitude, longitude } = validationResult.data

    const { default: tzLookup } = await import('tz-lookup')
    const timeZone = tzLookup(latitude, longitude)
    const res = NextResponse.json({ timeZone })
    limit.headers.forEach((value, key) => res.headers.set(key, value))
    res.headers.set('Cache-Control', 'public, max-age=2592000, immutable')
    return res
  } catch (e: unknown) {
    captureServerError(e, { route: '/api/latlon-to-timezone' })
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'server error' },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}
