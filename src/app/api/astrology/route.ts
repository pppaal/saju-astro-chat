// src/app/api/astrology/route.ts
import { NextRequest } from 'next/server'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import {
  calculateNatalChart,
  toChart,
  type AspectRules,
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
import { logger } from '@/lib/logger'
import { cacheOrCalculate, CacheKeys, CACHE_TTL } from '@/lib/cache/redis-cache'
import { validateRequestBody, astrologyRequestSchema } from '@/lib/api/zodValidation'
import { CALCULATION_STANDARDS } from '@/lib/config/calculationStandards'

// Middleware imports
import {
  withApiMiddleware,
  createAstrologyGuard,
  apiError,
  apiSuccess,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { HTTP_STATUS } from '@/lib/constants/http'

dayjs.extend(utc)
dayjs.extend(timezone)

// ============ Handler ============

export const POST = withApiMiddleware(async (req: NextRequest, context: ApiContext) => {
  // 1. Validate request body with Zod
  const validation = await validateRequestBody(req, astrologyRequestSchema)
  if (!validation.success) {
    const errorMessage = validation.errors.map((e) => `${e.path}: ${e.message}`).join(', ')
    return apiError(ErrorCodes.VALIDATION_ERROR, errorMessage, { errors: validation.errors })
  }

  const { date, time, latitude, longitude, timeZone, locale, options } = validation.data
  const L = pickLabels(locale)
  const locKey = normalizeLocale(locale)

  // 2. Parse date components
  const [year, month, day] = String(date).split('-').map(Number)
  if (!year || !month || !day) {
    return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid date components', { date })
  }

  // 3. Parse time
  const { h, m } = parseHM(String(time))
  const local = dayjs.tz(
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
    'YYYY-MM-DD HH:mm',
    String(timeZone)
  )
  if (!local.isValid()) {
    return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid date/time/timeZone combination.')
  }

  // 4. Calculate natal chart — ephemeris 실패 시 graceful fallback
  const opts = resolveOptions(options)

  let natal
  try {
    // Natal chart Redis 캐시 — 생년월일·시간·좌표 동일하면 같은 차트.
    // 30일 TTL (NATAL_CHART) — 천체력 데이터 immutable. 캐시 hit 시 Swiss
    // Ephemeris ~250ms × 10 planets 통째로 절약. 캐시 키는 birthDate-birthTime
    // -lat-lon 으로 timeZone 차이는 무시 (lat/lon 으로 충분히 unique).
    const birthDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const birthTimeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    natal = await cacheOrCalculate(
      CacheKeys.natalChart(birthDateStr, birthTimeStr, latitude, longitude),
      async () =>
        calculateNatalChart({
          year,
          month,
          date: day,
          hour: h,
          minute: m,
          latitude,
          longitude,
          timeZone: String(timeZone),
        }),
      CACHE_TTL.NATAL_CHART
    )
  } catch (chartError) {
    logger.error('[Astrology API] calculateNatalChart failed:', chartError)
    return apiError(
      ErrorCodes.INTERNAL_ERROR,
      context.locale === 'ko'
        ? '점성 차트 계산에 일시적 오류가 있어요. 잠시 후 다시 시도해 주세요.'
        : 'Astrology chart calculation temporarily unavailable. Please try again shortly.'
    )
  }

  // 5. Build localized display strings
  const ascSplit = splitSignAndDegree(natal.ascendant.formatted)
  const mcSplit = splitSignAndDegree(natal.mc.formatted)
  const ascStr = `${localizeSignLabel(ascSplit.signPart, locKey)} ${ascSplit.degreePart}`.trim()
  const mcStr = `${localizeSignLabel(mcSplit.signPart, locKey)} ${mcSplit.degreePart}`.trim()

  const planetLines = natal.planets
    .map((p) => {
      const name = localizePlanetLabel(p.name, locKey)
      const { signPart, degreePart } = splitSignAndDegree(p.formatted)
      const sign = localizeSignLabel(signPart, locKey)
      return `${name}: ${sign} ${degreePart}`.trim()
    })
    .join('\n')

  const basics = `${L?.asc ?? 'Ascendant'}: ${ascStr}\n${L?.mc ?? 'MC'}: ${mcStr}`
  const interpretation = `${L?.title ?? 'Natal Chart Summary'}\n${basics}\n\n${L?.planetPositions ?? 'Planet Positions'}\n${planetLines}\n\n${L?.notice ?? ''}`

  // 6. Calculate aspects and advanced data
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
    timeZone: '',
    latitude: 0,
    longitude: 0,
    houseSystem: CALCULATION_STANDARDS.astrology.houseSystem,
  }
  const natalMeta = natal.meta as ChartMeta | undefined
  const chartMeta = buildEngineMeta(natalMeta ?? defaultMeta, opts)

  const houses = chart.houses || []
  const pointsRaw = chart.planets
  const points = pointsRaw.map((p) => ({
    key: p.name,
    name: p.name,
    formatted: p.formatted,
    sign: p.sign,
    degree: p.degree,
    minute: p.minute,
    house: p.house,
    speed: p.speed,
    rx: typeof p.speed === 'number' ? p.speed < 0 : !!p.retrograde,
  }))

  const advanced = {
    options: opts,
    meta: chartMeta,
    houses,
    points,
    aspectsPlus,
  }

  // 7. Return success response
  return apiSuccess(
    {
      chartData: natal,
      chartMeta,
      aspects: aspectsPlus,
      interpretation,
      advanced,
      debug: { locale: locKey, opts },
    },
    { status: HTTP_STATUS.OK }
  )
}, createAstrologyGuard())
