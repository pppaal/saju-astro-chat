import { NextRequest, NextResponse } from 'next/server'
import { HTTP_STATUS } from '@/lib/constants/http'
import { analyzePersona } from '@/lib/persona/analysis'
import type { PersonaQuizAnswers } from '@/lib/persona/types'
import {
  computeIcpDimensions,
  computeIntegratedProfileId,
  type IcpDimensionResult,
} from '@/lib/assessment/integratedProfile'
import { INTEGRATED_PROFILES } from '@/lib/assessment/integratedProfiles'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type ReviewPayload = {
  personalityAnswers?: Record<string, unknown>
  icpAnswers?: Record<string, unknown>
}

const PERSONA_FIXTURE_DECISION_PRIMARY = {
  axes: {
    energy: { score: 55 },
    cognition: { score: 58 },
    decision: { score: 84 },
    rhythm: { score: 52 },
  },
  typeCode: 'RSLA',
} as const

const PERSONA_FIXTURE_ENERGY_PRIMARY = {
  axes: {
    energy: { score: 28 },
    cognition: { score: 48 },
    decision: { score: 53 },
    rhythm: { score: 50 },
  },
  typeCode: 'GSHF',
} as const

const FIXTURES = {
  D_A: {
    personality: PERSONA_FIXTURE_DECISION_PRIMARY,
    icpAnswers: {
      ag_02: '5',
      re_04: '3',
      wa_03: '3',
      ag_04: '2',
      bo_02: '5',
      re_01: '3',
      wa_04: '2',
      bo_03: '5',
    },
  },
  D_T: {
    personality: PERSONA_FIXTURE_DECISION_PRIMARY,
    icpAnswers: {
      ag_02: '2',
      re_04: '2',
      wa_03: '5',
      ag_04: '4',
      bo_02: '3',
      re_01: '3',
      wa_04: '4',
      bo_03: '3',
    },
  },
  E_P: {
    personality: PERSONA_FIXTURE_ENERGY_PRIMARY,
    icpAnswers: {
      ag_02: '3',
      re_04: '5',
      wa_03: '3',
      ag_04: '3',
      bo_02: '3',
      re_01: '2',
      wa_04: '3',
      bo_03: '3',
    },
  },
} as const

type FixtureKey = keyof typeof FIXTURES

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status })
}

function validateToken(request: NextRequest): NextResponse | null {
  const provided = request.nextUrl.searchParams.get('token') ?? ''
  const expected = process.env.REVIEW_TOKEN ?? ''

  if (!expected || provided !== expected) {
    return jsonError(HTTP_STATUS.UNAUTHORIZED, 'unauthorized')
  }
  return null
}

function getLocale(request: NextRequest): string {
  const locale = request.nextUrl.searchParams.get('locale')
  return locale && locale.trim() ? locale.trim() : 'ko'
}

function buildIntegratedResponse(params: {
  locale: string
  personality: { typeCode: string; axes: Record<string, { score: number }>; raw?: unknown }
  icpAnswers: Record<string, unknown>
  icpDims: IcpDimensionResult
  fixtureUsed?: FixtureKey
}) {
  const profileId = computeIntegratedProfileId(
    {
      axes: params.personality.axes as {
        energy: { score: number }
        cognition: { score: number }
        decision: { score: number }
        rhythm: { score: number }
      },
      typeCode: params.personality.typeCode,
    },
    params.icpDims
  )

  return NextResponse.json({
    locale: params.locale,
    ...(params.fixtureUsed ? { fixtureUsed: params.fixtureUsed } : {}),
    personality: {
      typeCode: params.personality.typeCode,
      axes: params.personality.axes,
      ...(params.personality.raw ? { raw: params.personality.raw } : {}),
    },
    icp: {
      answers: params.icpAnswers,
      dims: params.icpDims,
    },
    integrated: {
      profileId,
      template: INTEGRATED_PROFILES[profileId],
    },
  })
}

export async function GET(request: NextRequest) {
  const unauthorized = validateToken(request)
  if (unauthorized) return unauthorized

  const fixture = request.nextUrl.searchParams.get('fixture')
  if (!fixture) {
    return jsonError(HTTP_STATUS.BAD_REQUEST, 'fixture is required for GET')
  }

  if (!(fixture in FIXTURES)) {
    return jsonError(
      HTTP_STATUS.BAD_REQUEST,
      `invalid fixture: ${fixture}. allowed: ${Object.keys(FIXTURES).join(', ')}`
    )
  }

  const fixtureKey = fixture as FixtureKey
  const selected = FIXTURES[fixtureKey]
  const icpDims = computeIcpDimensions(selected.icpAnswers)
  const locale = getLocale(request)

  return buildIntegratedResponse({
    locale,
    fixtureUsed: fixtureKey,
    personality: {
      typeCode: selected.personality.typeCode,
      axes: selected.personality.axes,
      raw: selected.personality,
    },
    icpAnswers: selected.icpAnswers,
    icpDims,
  })
}

export async function POST(request: NextRequest) {
  const unauthorized = validateToken(request)
  if (unauthorized) return unauthorized

  const body = (await request.json().catch(() => null)) as ReviewPayload | null
  if (!body || typeof body !== 'object') {
    return jsonError(HTTP_STATUS.BAD_REQUEST, 'invalid JSON body')
  }

  const { personalityAnswers, icpAnswers } = body
  if (!personalityAnswers || typeof personalityAnswers !== 'object') {
    return jsonError(HTTP_STATUS.BAD_REQUEST, 'personalityAnswers is required')
  }
  if (!icpAnswers || typeof icpAnswers !== 'object') {
    return jsonError(HTTP_STATUS.BAD_REQUEST, 'icpAnswers is required')
  }

  const locale = getLocale(request)
  const persona = analyzePersona(personalityAnswers as PersonaQuizAnswers, locale)
  const icpDims = computeIcpDimensions(icpAnswers)

  return buildIntegratedResponse({
    locale,
    personality: {
      typeCode: persona.typeCode,
      axes: persona.axes,
      raw: persona,
    },
    icpAnswers,
    icpDims,
  })
}
