// src/app/api/astrology/route.ts
import { NextRequest } from 'next/server'
import { apiClient } from '@/lib/api/ApiClient'
import { prisma } from '@/lib/db/prisma'
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
import { validateRequestBody, astrologyRequestSchema } from '@/lib/api/zodValidation'

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
    const errorMessage = validation.errors.map((e) => `${e.path}: ${e.message}`).join(', ');
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

  // 4. Calculate natal chart
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

  // 5. Build localized display strings
  const ascSplit = splitSignAndDegree(natal.ascendant.formatted)
  const mcSplit = splitSignAndDegree(natal.mc.formatted)
  const ascStr = `${localizeSignLabel(ascSplit.signPart, locKey)} ${ascSplit.degreePart}`.trim()
  const mcStr = `${localizeSignLabel(mcSplit.signPart, locKey)} ${mcSplit.degreePart}`.trim()

  const planetLines = natal.planets
    .map((p) => {
      const name = localizePlanetLabel(p.name, locKey)
      const { signPart, degreePart } = splitSignAndDegree(p.formatted)
      const sign = localizeSignLabel(signPart, locKey);
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
    houseSystem: 'Placidus' as const,
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

  // 7. AI backend call (GPT)
  let aiInterpretation = ''
  let aiModelUsed = ''

  try {
    const astroPrompt = `Analyze this natal chart as an expert astrologer:\n\nAscendant: ${ascStr}\nMC: ${mcStr}\n\nPlanet Positions:\n${planetLines}\n\nProvide insights on personality, life path, strengths, and challenges.`

    const response = await apiClient.post(
      '/ask',
      {
        theme: 'astrology',
        prompt: astroPrompt,
        astro: {
          ascendant: natal.ascendant,
          mc: natal.mc,
          planets: natal.planets,
          houses,
          aspects: aspectsPlus,
        },
        locale: locKey,
      },
      { timeout: 60000 }
    )

    if (response.ok) {
      const resData = response.data as {
        data?: { fusion_layer?: string; report?: string; model?: string }
      }
      aiInterpretation = resData?.data?.fusion_layer || resData?.data?.report || ''
      aiModelUsed = resData?.data?.model || 'gpt-4o'
    }
  } catch (aiErr) {
    logger.warn('[Astrology API] AI backend call failed:', aiErr)
    aiInterpretation = ''
    aiModelUsed = 'error-fallback'
  }

  // 8. Save reading record (logged-in users only)
  if (context.userId) {
    try {
      await prisma.reading.create({
        data: {
          userId: context.userId,
          type: 'astrology',
          title: `${ascStr} 상승궁 출생차트`,
          content: JSON.stringify({
            date,
            time,
            latitude,
            longitude,
            timeZone,
            ascendant: ascStr,
            mc: mcStr,
            planets: points.slice(0, 10).map((p) => ({
              name: p.name,
              sign: p.sign,
            })),
          }),
        },
      });
    } catch (saveErr) {
      logger.warn('[Astrology API] Failed to save reading:', saveErr)
    }
  }

  // 9. Return success response
  return apiSuccess(
    {
      chartData: natal,
      chartMeta,
      aspects: aspectsPlus,
      interpretation: aiInterpretation || interpretation,
      aiInterpretation,
      aiModelUsed,
      advanced,
      debug: { locale: locKey, opts },
    },
    { status: HTTP_STATUS.OK }
  )
}, createAstrologyGuard())
