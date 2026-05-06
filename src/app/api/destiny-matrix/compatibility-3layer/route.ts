import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createPublicStreamGuard, extractLocale, type ApiContext } from '@/lib/api/middleware'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { parseRequestBody } from '@/lib/api/requestParser'
import { logger } from '@/lib/logger'
import { analyzeThreeLayerCompatibility } from '@/lib/destiny-matrix/compatibility'
import { buildPremiumCompatibilityContext } from '@/lib/destiny-matrix/compatibility/buildPremiumContext'
import { generateCompatibilityNarrative } from '@/lib/destiny-matrix/compatibility/narrativeGenerator'

type Person = { birthDate?: string; birthTime?: string; gender?: string }
type ReqBody = {
  personA?: Person
  personB?: Person
  /** Display name for person A (rendered in the LLM narrative). */
  labelA?: string
  /** Display name for person B. */
  labelB?: string
  /**
   * When true, runs the full premium pipeline:
   *   3-layer + Fusion + Extended Saju + Extended Astrology + Deep Insights
   *   then attaches an LLM magazine narrative grounded in all of the above.
   * When false (default), only the lightweight 3-layer engine runs.
   */
  withNarrative?: boolean
}

function validIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime())
}
function validTime(s: string): boolean {
  return /^\d{2}:\d{2}$/.test(s)
}
function validatePerson(p: Person | undefined, name: string): string | null {
  if (!p || typeof p !== 'object') return `${name} 객체 필수`
  if (!p.birthDate || !p.birthTime || !p.gender) return `${name}.birthDate, birthTime, gender 필수`
  if (!validIsoDate(p.birthDate) || !validTime(p.birthTime)) return `${name} 날짜/시간 형식 오류`
  if (p.gender !== 'male' && p.gender !== 'female') return `${name}.gender는 male|female`
  return null
}

const errBody = (
  req: NextRequest,
  msg: string,
  code: keyof typeof ErrorCodes = 'BAD_REQUEST'
) =>
  createErrorResponse({
    code: ErrorCodes[code],
    message: msg,
    locale: extractLocale(req),
    route: 'destiny-matrix/compatibility-3layer',
  })

export const POST = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    try {
      const body = await parseRequestBody<ReqBody>(req, { context: 'Compat3Layer' })
      if (!body || typeof body !== 'object') return errBody(req, 'Body required')
      const errA = validatePerson(body.personA, 'personA')
      if (errA) return errBody(req, errA)
      const errB = validatePerson(body.personB, 'personB')
      if (errB) return errBody(req, errB)

      const personA = body.personA as Required<Person> & { gender: 'male' | 'female' }
      const personB = body.personB as Required<Person> & { gender: 'male' | 'female' }

      // Lightweight 3-layer is always computed — drives the score-cards row.
      const layers = analyzeThreeLayerCompatibility(personA, personB)

      if (!body.withNarrative) {
        return NextResponse.json(layers)
      }

      // Premium path: full engine + LLM magazine narrative.
      let premiumContext = null
      try {
        premiumContext = await buildPremiumCompatibilityContext({
          personA,
          personB,
          labelA: body.labelA,
          labelB: body.labelB,
        })
      } catch (engErr) {
        logger.warn('[Compat3Layer] full engine pipeline failed, falling back to 3-layer only', {
          message: engErr instanceof Error ? engErr.message : String(engErr),
        })
      }

      try {
        const narrative = await generateCompatibilityNarrative({
          personA,
          personB,
          labelA: body.labelA,
          labelB: body.labelB,
          layers,
          context: premiumContext,
        })
        return NextResponse.json({
          ...layers,
          fusion: premiumContext?.fusion ?? null,
          extendedSaju: premiumContext?.extendedSaju ?? null,
          extendedAstro: premiumContext?.extendedAstro ?? null,
          deepInsights: premiumContext?.deepInsights ?? null,
          coupleTiming: premiumContext?.coupleTiming ?? null,
          coupleAstroTiming: premiumContext?.coupleAstroTiming ?? null,
          idealTypes: premiumContext?.idealTypes ?? null,
          multiFacets: premiumContext?.multiFacets ?? null,
          extraPoints: premiumContext?.extraPoints ?? null,
          tagline: premiumContext?.tagline ?? null,
          crossSystem: premiumContext?.crossSystem ?? null,
          ages: premiumContext?.ages ?? null,
          narrative: narrative.narrative,
          narrativeMeta: {
            modelUsed: narrative.modelUsed,
            tokensUsed: narrative.tokensUsed,
            warnings: narrative.warnings,
          },
        })
      } catch (narrErr) {
        logger.warn('[Compat3Layer] narrative generation failed, returning engine-only result', {
          message: narrErr instanceof Error ? narrErr.message : String(narrErr),
        })
        return NextResponse.json({
          ...layers,
          fusion: premiumContext?.fusion ?? null,
          extendedSaju: premiumContext?.extendedSaju ?? null,
          extendedAstro: premiumContext?.extendedAstro ?? null,
          deepInsights: premiumContext?.deepInsights ?? null,
          coupleTiming: premiumContext?.coupleTiming ?? null,
          coupleAstroTiming: premiumContext?.coupleAstroTiming ?? null,
          idealTypes: premiumContext?.idealTypes ?? null,
          multiFacets: premiumContext?.multiFacets ?? null,
          extraPoints: premiumContext?.extraPoints ?? null,
          tagline: premiumContext?.tagline ?? null,
          crossSystem: premiumContext?.crossSystem ?? null,
          ages: premiumContext?.ages ?? null,
          narrative: null,
          narrativeMeta: {
            error: narrErr instanceof Error ? narrErr.message : 'narrative_failed',
          },
        })
      }
    } catch (e) {
      logger.error('[Compat3Layer] failed', { error: e instanceof Error ? e.message : String(e) })
      return errBody(req, '궁합 분석 실패', 'INTERNAL_ERROR')
    }
  },
  createPublicStreamGuard({
    route: '/api/destiny-matrix/compatibility-3layer',
    limit: 20,
    windowSeconds: 60,
  })
)
