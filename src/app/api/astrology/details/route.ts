// src/app/api/astrology/details/route.ts
import { NextResponse } from 'next/server'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { captureServerError } from '@/lib/telemetry'
import { requirePublicToken } from '@/lib/auth/publicToken'
import {
  calculateNatalChart,
  toChart,
  type AspectRules,
  type PlanetData,
  type ChartMeta,
  resolveOptions,
  findNatalAspectsPlus,
  buildEngineMeta,
} from '@/lib/astrology'
import {
  pickLabels,
  normalizeLocale,
  splitSignAndDegree,
  localizeSignLabel,
  localizePlanetLabel,
  parseHM,
} from '@/lib/astrology/localization'
import { HTTP_STATUS } from '@/lib/constants/http'
import { astrologyDetailsSchema } from '@/lib/api/zodValidation'
import { logger } from '@/lib/logger'

dayjs.extend(utc)
dayjs.extend(timezone)

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const limit = await rateLimit(`astro-details:${ip}`, { limit: 30, windowSeconds: 60 })
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Try again soon.' },
        { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers }
      )
    }
    const tokenCheck = requirePublicToken(request)
    if (!tokenCheck.valid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: HTTP_STATUS.UNAUTHORIZED, headers: limit.headers }
      )
    }

    const body = await request.json()

    // Validate with Zod
    const validationResult = astrologyDetailsSchema.safeParse({
      birthDate: body?.date,
      birthTime: body?.time,
      latitude: body?.latitude,
      longitude: body?.longitude,
      timezone: body?.timeZone,
      locale: body?.locale,
    })
    if (!validationResult.success) {
      logger.warn('[Astrology details] validation failed', {
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

    const { date, time, latitude, longitude, timeZone, locale, options } = body ?? {}
    const L = pickLabels(locale)
    const locKey = normalizeLocale(locale)

    const [year, month, day] = String(date).split('-').map(Number)
    if (!year || !month || !day) {
      return NextResponse.json(
        { error: 'date must be YYYY-MM-DD.' },
        { status: HTTP_STATUS.BAD_REQUEST, headers: limit.headers }
      )
    }

    const { h, m } = parseHM(String(time))

    const local = dayjs.tz(
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      'YYYY-MM-DD HH:mm',
      String(timeZone)
    )
    if (!local.isValid()) {
      return NextResponse.json(
        { error: 'Invalid date/time/timeZone combination.' },
        { status: HTTP_STATUS.BAD_REQUEST, headers: limit.headers }
      )
    }

    const opts = resolveOptions(options)

    const natal = await calculateNatalChart({
      year,
      month,
      date: day,
      hour: h,
      minute: m,
      latitude,
      longitude,
      timeZone: String(timeZone),
    })

    const ascFmt = String(natal.ascendant?.formatted || '')
    const mcFmt = String(natal.mc?.formatted || '')

    const ascSplit = splitSignAndDegree(ascFmt)
    const mcSplit = splitSignAndDegree(mcFmt)

    const ascStr = `${localizeSignLabel(ascSplit.signPart, locKey)} ${ascSplit.degreePart}`.trim()
    const mcStr = `${localizeSignLabel(mcSplit.signPart, locKey)} ${mcSplit.degreePart}`.trim()

    const planetLines = (natal.planets || [])
      .map((p: PlanetData) => {
        const name = localizePlanetLabel(String(p.name || ''), locKey)
        const { signPart, degreePart } = splitSignAndDegree(String(p.formatted || ''))
        const sign = localizeSignLabel(signPart, locKey)
        return `${name}: ${sign} ${degreePart}`.trim()
      })
      .join('\n')

    const basics = `${L?.asc ?? 'Ascendant'}: ${ascStr}\n${L?.mc ?? 'MC'}: ${mcStr}`
    const interpretation = `${L?.title ?? 'Natal Chart Summary'}\n${basics}\n\n${L?.planetPositions ?? 'Planet Positions'}\n${planetLines}\n\n${L?.notice ?? ''}`

    const chart = toChart(natal)
    const aspectRules: AspectRules = {
      includeMinor: opts.includeMinorAspects,
      maxResults: 120,
      scoring: { weights: { orb: 0.55, aspect: 0.4, speed: 0.05 } },
    }
    const aspectsPlus = findNatalAspectsPlus(chart, aspectRules, opts)

    const defaultMeta: ChartMeta = {
      jdUT: 0,
      isoUTC: '',
      timeZone: String(timeZone),
      latitude,
      longitude,
      houseSystem: 'Placidus',
    }
    const chartMeta = buildEngineMeta(chart.meta ?? defaultMeta, opts)

    const houses = chart.houses || natal.houses || []
    const pointsRaw = chart.planets || natal.planets || []
    const points = pointsRaw.map((p) => ({
      key: p.name,
      name: p.name,
      formatted: p.formatted,
      sign: p.sign,
      degree: p.degree,
      minute: p.minute,
      house: p.house,
      speed: p.speed,
      rx: typeof p.speed === 'number' ? p.speed < 0 : false,
    }))

    const advanced = {
      options: opts,
      meta: chartMeta,
      houses,
      points,
      aspectsPlus,
    }

    const res = NextResponse.json(
      {
        chartData: natal,
        chartMeta,
        aspects: aspectsPlus,
        interpretation,
        advanced,
      },
      { status: HTTP_STATUS.OK }
    )
    limit.headers.forEach((value, key) => res.headers.set(key, value))
    return res
  } catch (error) {
    captureServerError(error, { route: '/api/astrology/details' })
    const message = 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: HTTP_STATUS.SERVER_ERROR })
  }
}
