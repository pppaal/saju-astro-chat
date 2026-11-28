// src/app/api/astrology/route.ts
import { NextRequest } from 'next/server'
import {
  calculateNatalChart,
  toChart,
  type AspectRules,
  type ChartMeta,
  resolveOptions,
  findNatalAspectsPlus,
  buildEngineMeta,
} from '@/lib/astrology'
import { calculateArabicLots } from '@/lib/astrology/foundation/arabicParts'
import { isDiurnalChart } from '@/lib/astrology/foundation/extraPoints'
import {
  calculateZodiacalReleasing,
  getActiveZRSub,
  annotateZRMarkers,
  type ZRPeriod,
} from '@/lib/astrology/foundation/zodiacalReleasing'
import { dignityTiers, dignityScore } from '@/lib/astrology/foundation/dignities'
import { calculateAlmutenFiguris } from '@/lib/astrology/foundation/almutenFiguris'
import type { Chart, ZodiacKo } from '@/lib/astrology/foundation/types'
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
import { withSpan } from '@/lib/telemetry'
import { resolveBirthInstant } from '@/lib/datetime/resolveBirthInstant'

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

const YEAR_MS = 365.25 * 86_400_000

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

  // 3. Parse time — 출생 instant 는 natalToJD·사주와 같은 resolver(RFC 5545 공백·겹침)로
  // 검증한다. 옛 dayjs.tz 는 2월 30일을 3월로 넘겨 '유효' 로 통과시켰고(→ 차트 계산 500),
  // 겹침 시각 offset 을 서버의 현재 DST 상태로 골랐다.
  const { h, m } = parseHM(String(time))
  let birthUtc: Date
  try {
    birthUtc = resolveBirthInstant({ year, month, day, hour: h, minute: m }, String(timeZone)).utc
  } catch {
    return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid date/time/timeZone combination.')
  }
  // 요청 경계에서 한 번만 시계를 읽는다(엔진 깊숙이 new Date() 금지).
  const now = new Date()

  // 4. Calculate natal chart — ephemeris 실패 시 graceful fallback
  const opts = resolveOptions(options)

  let natal
  try {
    // Natal chart Redis 캐시 — 생년월일·시간·좌표 동일하면 같은 차트.
    // 30일 TTL (NATAL_CHART) — 천체력 데이터 immutable. 캐시 hit 시 Swiss
    // Ephemeris ~250ms × 10 planets 통째로 절약. 캐시 키는 birthDate-birthTime
    // -lat-lon-timeZone. timeZone 은 현지시각→UT 변환에 들어가 차트를 바꾸므로
    // 키에 반드시 포함해야 한다 (좌표만으론 unique 보장 안 됨 — tz override 가능).
    const birthDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const birthTimeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    natal = await cacheOrCalculate(
      CacheKeys.natalChart(birthDateStr, birthTimeStr, latitude, longitude, String(timeZone)),
      // Span: Swiss-Ephemeris 천체 계산. 캐시 미스(=실제 계산) 때만 실행.
      async () =>
        withSpan('astrology.calculateNatal', 'function', async () =>
          calculateNatalChart({
            year,
            month,
            date: day,
            hour: h,
            minute: m,
            latitude,
            longitude,
            timeZone: String(timeZone),
          })
        ),
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

  // ── natalAdvanced — destinypal Life tier 가 요구하는 5개 헬레니즘 신호.
  // 기존 응답이 행성 위치/aspects 만 노출해 격국·sect·ZR 챕터·dignity 5-tier·
  // Arabic Lots·Almuten Figuris 가 누락돼 있었다. NatalContext 와 동일 함수로
  // 산출해 같은 본명에서 calendar-engine 과 일관된 값. 실패는 부분 graceful
  // — sect/lots 가 살아있으면 ZR/Almuten 도 계산, dignity 는 행성 단위 try.
  let natalAdvanced:
    | {
        sect: 'day' | 'night'
        lots: ReturnType<typeof calculateArabicLots>
        zr: {
          spirit: { startSign: ZodiacKo; periods: ZRPeriod[] } | null
          fortune: { startSign: ZodiacKo; periods: ZRPeriod[] } | null
          currentAge: number | null
          currentSpirit: ReturnType<typeof getActiveZRSub> | null
          currentFortune: ReturnType<typeof getActiveZRSub> | null
        }
        dignities: Array<{
          planet: string
          sign: string
          degree: number
          tiers: ReturnType<typeof dignityTiers>
          score: number
        }>
        almutenFiguris: ReturnType<typeof calculateAlmutenFiguris> | null
      }
    | undefined
  try {
    const chartFull = chart as Chart
    const sun = chartFull.planets.find((p) => p.name === 'Sun')
    // sect — 태양이 지평선 위(참고도 > 0°)면 day. isDiurnalChart SSOT(astroFacts·NatalContext
    // 와 같은 함수). 하우스 번호 규칙은 극권 Whole Sign 폴백에서 뒤집혔다(엔진 감사 ASTRO-10).
    const sect: 'day' | 'night' = isDiurnalChart({
      jdUT: natalMeta?.jdUT,
      latitude,
      longitude,
      sunHouse: sun?.house,
      sunLongitude: sun?.longitude,
      ascLongitude: chartFull.ascendant?.longitude,
    })
      ? 'day'
      : 'night'

    let lots: ReturnType<typeof calculateArabicLots> = []
    try {
      lots = calculateArabicLots(chartFull, sect === 'day')
    } catch (err) {
      logger.warn('[astrology] Arabic lots calc failed', {
        err: err instanceof Error ? err.message : String(err),
      })
    }

    const spiritLot = lots.find((l) => l.name === 'Spirit')
    const fortuneLot = lots.find((l) => l.name === 'Fortune')

    // ZR 나이 = 출생 instant 부터 지금까지(365.25일 년, calendar-engine astro-zr 과 같은 앵커).
    // 옛 식은 `local`(= 출생 벽시계)의 연·월을 써서 늘 0 이었다 — 현재 ZR 이 출생 시점 구간.
    const ageNow = Math.max(0, (now.getTime() - birthUtc.getTime()) / YEAR_MS)
    let spirit: { startSign: ZodiacKo; periods: ZRPeriod[] } | null = null
    let fortune: { startSign: ZodiacKo; periods: ZRPeriod[] } | null = null
    try {
      if (spiritLot) {
        const periods = annotateZRMarkers(
          spiritLot.sign,
          calculateZodiacalReleasing(spiritLot.sign, 90)
        )
        spirit = { startSign: spiritLot.sign, periods }
      }
      if (fortuneLot) {
        const periods = annotateZRMarkers(
          fortuneLot.sign,
          calculateZodiacalReleasing(fortuneLot.sign, 90)
        )
        fortune = { startSign: fortuneLot.sign, periods }
      }
    } catch (err) {
      logger.warn('[astrology] ZR calc failed', {
        err: err instanceof Error ? err.message : String(err),
      })
    }
    const currentSpirit = spirit ? getActiveZRSub(spirit.periods, ageNow) : null
    const currentFortune = fortune ? getActiveZRSub(fortune.periods, ageNow) : null

    // 5-tier dignities per 본명 행성 (10 planets 일반)
    const dignitiesList: NonNullable<typeof natalAdvanced>['dignities'] = []
    for (const p of chartFull.planets) {
      if (!p.sign) continue
      try {
        const tiers = dignityTiers(p.name, p.sign, p.degree, sect)
        dignitiesList.push({
          planet: p.name,
          sign: p.sign,
          degree: p.degree,
          tiers,
          score: dignityScore(tiers),
        })
      } catch (err) {
        logger.warn('[astrology] dignityTiers failed', {
          planet: p.name,
          err: err instanceof Error ? err.message : String(err),
        })
      }
    }

    // Almuten Figuris — 4-point (Sun/Moon/ASC + Fortune). Lunation 생략 (생략 가능).
    let almutenFiguris: ReturnType<typeof calculateAlmutenFiguris> | null = null
    try {
      almutenFiguris = calculateAlmutenFiguris({
        chart: chartFull,
        sect,
        fortune: fortuneLot ? { longitude: fortuneLot.longitude } : undefined,
      })
    } catch (err) {
      logger.warn('[astrology] Almuten Figuris failed', {
        err: err instanceof Error ? err.message : String(err),
      })
    }

    natalAdvanced = {
      sect,
      lots,
      zr: {
        spirit,
        fortune,
        currentAge: ageNow,
        currentSpirit,
        currentFortune,
      },
      dignities: dignitiesList,
      almutenFiguris,
    }
  } catch (err) {
    logger.warn('[astrology] natalAdvanced block failed; omitting', {
      err: err instanceof Error ? err.message : String(err),
    })
    natalAdvanced = undefined
  }

  // 7. Return success response
  return apiSuccess(
    {
      chartData: natal,
      chartMeta,
      aspects: aspectsPlus,
      interpretation,
      advanced,
      natalAdvanced,
      debug: { locale: locKey, opts },
    },
    { status: HTTP_STATUS.OK }
  )
}, createAstrologyGuard())
