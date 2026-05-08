/**
 * 통합 엔진 API — 6 서비스 공통 진입점.
 *
 * POST /api/unified-engine
 * body: { birthDate, birthTime, gender, latitude?, longitude?, timezone?, segment? }
 * response: UnifiedSlice (life · narratives · cycleAnalysis · themeMatrix · ...)
 *
 * 클라이언트는 useUnifiedSlice 훅으로 호출. 캐시 가능.
 */
import { NextResponse } from 'next/server'
import { getUnifiedSlice } from '@/components/counselor/free-report/analyzers/unifiedAdapter'

export const runtime = 'nodejs'

interface RequestBody {
  birthDate?: string
  birthTime?: string
  gender?: 'male' | 'female'
  latitude?: number
  longitude?: number
  timezone?: string
  segment?: {
    employment?: 'employed' | 'self_employed' | 'student' | 'unemployed'
    maritalStatus?: 'single' | 'married' | 'divorced'
    hasChildren?: boolean
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody
    if (!body.birthDate || !body.birthTime || !body.gender) {
      return NextResponse.json(
        { error: 'birthDate, birthTime, gender required' },
        { status: 400 },
      )
    }

    const slice = await getUnifiedSlice({
      birthDate: body.birthDate,
      birthTime: body.birthTime,
      gender: body.gender,
      latitude: body.latitude,
      longitude: body.longitude,
      timezone: body.timezone,
      segment: body.segment,
    })

    if (!slice) {
      return NextResponse.json({ error: 'engine failed' }, { status: 500 })
    }

    return NextResponse.json(slice)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'unknown' },
      { status: 500 },
    )
  }
}
