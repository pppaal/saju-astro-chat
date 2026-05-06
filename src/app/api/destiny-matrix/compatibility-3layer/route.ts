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
  labelA?: string
  labelB?: string
  /**
   * When true, runs the full premium pipeline (3-layer + Fusion +
   * ExtendedSaju + ExtendedAstrology + DeepInsights + CoupleTiming +
   * AstroTiming + IdealTypes + MultiFacets + ExtraPoints + Tagline +
   * CrossSystem) and attaches an LLM magazine narrative.
   *
   * No silent fallback — if any required module fails the request
   * returns 500 with a real error code.
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
    let body: ReqBody | null = null
    try {
      body = await parseRequestBody<ReqBody>(req, { context: 'Compat3Layer' })
    } catch {
      return errBody(req, 'Body required')
    }
    if (!body || typeof body !== 'object') return errBody(req, 'Body required')
    const errA = validatePerson(body.personA, 'personA')
    if (errA) return errBody(req, errA)
    const errB = validatePerson(body.personB, 'personB')
    if (errB) return errBody(req, errB)

    const personA = body.personA as Required<Person> & { gender: 'male' | 'female' }
    const personB = body.personB as Required<Person> & { gender: 'male' | 'female' }

    // Lightweight 3-layer is always computed.
    const layers = analyzeThreeLayerCompatibility(personA, personB)

    if (!body.withNarrative) {
      return NextResponse.json(layers)
    }

    // Premium path: full engine + LLM narrative. Both MUST succeed.
    try {
      const premiumContext = await buildPremiumCompatibilityContext({
        personA,
        personB,
        labelA: body.labelA,
        labelB: body.labelB,
      })

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
        fusion: premiumContext.fusion,
        extendedSaju: premiumContext.extendedSaju,
        extendedAstro: premiumContext.extendedAstro,
        deepInsights: premiumContext.deepInsights,
        coupleTiming: premiumContext.coupleTiming,
        coupleAstroTiming: premiumContext.coupleAstroTiming,
        idealTypes: premiumContext.idealTypes,
        multiFacets: premiumContext.multiFacets,
        extraPoints: premiumContext.extraPoints,
        tagline: premiumContext.tagline,
        crossSystem: premiumContext.crossSystem,
        ages: premiumContext.ages,
        narrative: narrative.narrative,
        narrativeMeta: {
          modelUsed: narrative.modelUsed,
          tokensUsed: narrative.tokensUsed,
          warnings: narrative.warnings,
        },
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      logger.error('[Compat3Layer] premium pipeline failed', { error: message })
      return createErrorResponse({
        code: ErrorCodes.INTERNAL_ERROR,
        message: `궁합 분석 실패: ${message}`,
        locale: extractLocale(req),
        route: 'destiny-matrix/compatibility-3layer',
      })
    }
  },
  createPublicStreamGuard({
    route: '/api/destiny-matrix/compatibility-3layer',
    limit: 20,
    windowSeconds: 60,
  })
)
