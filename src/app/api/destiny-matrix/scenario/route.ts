import { NextRequest, NextResponse } from 'next/server'
import { simulateScenario, compareScenarios } from '@/lib/destiny-matrix/scenario'
import type { ScenarioAction } from '@/lib/destiny-matrix/scenario'

const VALID_ACTIONS: ScenarioAction[] = [
  'careerChange', 'startBusiness', 'marriage', 'meetSomeone',
  'relocation', 'travel', 'invest', 'majorPurchase',
  'startStudy', 'healthRestart',
]

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { birthDate, birthTime, gender, action, targetDate, alternatives } = body

    // 입력 검증
    if (!birthDate || !birthTime || !gender || !action || !targetDate) {
      return NextResponse.json(
        { error: 'birthDate, birthTime, gender, action, targetDate 필수' },
        { status: 400 }
      )
    }
    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: `action은 ${VALID_ACTIONS.join(', ')} 중 하나여야 합니다.` },
        { status: 400 }
      )
    }
    if (gender !== 'male' && gender !== 'female') {
      return NextResponse.json({ error: 'gender는 male 또는 female' }, { status: 400 })
    }

    const input = {
      birthDate,
      birthTime,
      gender: gender as 'male' | 'female',
      action: action as ScenarioAction,
      targetDate,
      alternatives: Array.isArray(alternatives) ? alternatives : undefined,
    }

    if (input.alternatives && input.alternatives.length > 0) {
      const result = compareScenarios(input)
      return NextResponse.json({ mode: 'compare', ...result })
    }

    const forecast = simulateScenario(input)
    return NextResponse.json({ mode: 'single', forecast })
  } catch (e) {
    return NextResponse.json(
      { error: 'scenario simulation failed', detail: String(e) },
      { status: 500 }
    )
  }
}
