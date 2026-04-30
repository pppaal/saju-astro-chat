import { NextRequest, NextResponse } from 'next/server'
import { analyzeThreeLayerCompatibility } from '@/lib/destiny-matrix/compatibility'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { personA, personB } = body

    if (!personA || !personB) {
      return NextResponse.json(
        { error: 'personA, personB 두 사람 birth data 필수' },
        { status: 400 }
      )
    }
    for (const p of [personA, personB]) {
      if (!p.birthDate || !p.birthTime || !p.gender) {
        return NextResponse.json(
          { error: '각 person은 birthDate, birthTime, gender 필수' },
          { status: 400 }
        )
      }
      if (p.gender !== 'male' && p.gender !== 'female') {
        return NextResponse.json({ error: 'gender는 male 또는 female' }, { status: 400 })
      }
    }

    const result = analyzeThreeLayerCompatibility(personA, personB)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json(
      { error: 'compatibility analysis failed', detail: String(e) },
      { status: 500 }
    )
  }
}
