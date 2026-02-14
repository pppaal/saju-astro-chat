import { ICP_ARCHETYPE_PROFILES, getAxisInterpretation } from './results'
import { ICP_TEST_VERSION, ICP_V2_QUESTIONS } from './questions'
import type {
  IcpAnswers,
  IcpArchetypeCode,
  IcpAxisKey,
  IcpExplainability,
  IcpLikertValue,
  IcpResult,
} from './types'

const OCTANT_COORDINATES: Record<IcpArchetypeCode, { d: number; a: number }> = {
  PA: { d: 1.0, a: 0.6 },
  BC: { d: 0.8, a: -0.6 },
  DE: { d: 0.2, a: -1.0 },
  FG: { d: -0.6, a: -0.7 },
  HI: { d: -1.0, a: 0.0 },
  JK: { d: -0.4, a: 0.6 },
  LM: { d: 0.1, a: 1.0 },
  NO: { d: 0.7, a: 0.8 },
}

const CONSISTENCY_PAIRS: Array<[string, string, boolean]> = [
  ['ag_01', 'ag_04', true],
  ['wa_01', 'wa_04', true],
  ['bo_01', 'bo_04', true],
  ['re_01', 're_04', true],
]

function normalizeLikert(raw: unknown): IcpLikertValue | null {
  const n = typeof raw === 'string' ? Number(raw) : raw
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) {
    return n
  }
  return null
}

function to100(mean: number): number {
  return Math.round(((mean - 1) / 4) * 100)
}

function classifyStyle(axes: Record<IcpAxisKey, number>): IcpArchetypeCode {
  const { agency, warmth, boundary, resilience } = axes
  if (agency >= 60 && warmth >= 60) {
    return resilience >= 60 ? 'PA' : 'NO'
  }
  if (agency >= 60 && warmth < 45) {
    return boundary >= 60 ? 'BC' : 'DE'
  }
  if (agency < 45 && warmth < 45) {
    return resilience >= 60 ? 'FG' : 'DE'
  }
  if (agency < 45 && warmth >= 60) {
    return boundary >= 60 ? 'JK' : 'LM'
  }
  if (warmth >= 55) {
    return 'HI'
  }
  return 'FG'
}

function getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 75) return 'high'
  if (score >= 50) return 'medium'
  return 'low'
}

function buildExplainability(
  axes: Record<IcpAxisKey, number>,
  answers: Record<string, IcpLikertValue>
): IcpExplainability {
  const sorted = Object.entries(axes).sort((a, b) => b[1] - a[1]) as Array<[IcpAxisKey, number]>
  const topAxes = sorted.slice(0, 2).map(([axis, score]) => ({
    axis,
    score,
    interpretation: getAxisInterpretation(axis, score),
  }))
  const lowAxes = sorted.slice(-2).map(([axis, score]) => ({
    axis,
    score,
    interpretation: getAxisInterpretation(axis, score),
  }))

  const evidence = ICP_V2_QUESTIONS.filter(
    (q) => q.axis === topAxes[0].axis || q.axis === topAxes[1].axis
  )
    .map((q) => {
      const v = answers[q.id] ?? 3
      return {
        questionId: q.id,
        axis: q.axis,
        answer: v,
        reverse: Boolean(q.reverse),
        reason: q.reverse
          ? '역문항 응답이 해당 축 점수 보정에 반영되었습니다.'
          : '직접문항 응답이 해당 축 점수 상승/하락에 반영되었습니다.',
      }
    })
    .sort((a, b) => b.answer - a.answer)
    .slice(0, 4)

  return {
    topAxes,
    lowAxes,
    evidence,
    note: '이 결과는 비임상 자기이해 도구입니다. 상황에 따라 달라질 수 있습니다.',
  }
}

export function scoreIcpTest(
  rawAnswers: IcpAnswers,
  options?: { completionSeconds?: number }
): IcpResult {
  const answers: Record<string, IcpLikertValue> = {}
  let missingAnswerCount = 0

  for (const q of ICP_V2_QUESTIONS) {
    const v = normalizeLikert(rawAnswers[q.id])
    if (v === null) {
      missingAnswerCount += 1
      answers[q.id] = 3
    } else {
      answers[q.id] = v
    }
  }

  const axisValues: Record<IcpAxisKey, number[]> = {
    agency: [],
    warmth: [],
    boundary: [],
    resilience: [],
  }

  for (const q of ICP_V2_QUESTIONS) {
    const base = answers[q.id]
    const adjusted = q.reverse ? ((6 - base) as IcpLikertValue) : base
    axisValues[q.axis].push(adjusted)
  }

  const axes: Record<IcpAxisKey, number> = {
    agency: to100(axisValues.agency.reduce((a, b) => a + b, 0) / axisValues.agency.length),
    warmth: to100(axisValues.warmth.reduce((a, b) => a + b, 0) / axisValues.warmth.length),
    boundary: to100(axisValues.boundary.reduce((a, b) => a + b, 0) / axisValues.boundary.length),
    resilience: to100(
      axisValues.resilience.reduce((a, b) => a + b, 0) / axisValues.resilience.length
    ),
  }

  const dominanceScore = Math.round(axes.agency)
  const affiliationScore = Math.round(axes.warmth)
  const d = (dominanceScore - 50) / 50
  const a = (affiliationScore - 50) / 50

  const octantScores = {} as Record<IcpArchetypeCode, number>
  for (const [code, coord] of Object.entries(OCTANT_COORDINATES) as Array<
    [IcpArchetypeCode, { d: number; a: number }]
  >) {
    const dd = d - coord.d
    const ad = a - coord.a
    const dist = dd * dd + ad * ad
    octantScores[code] = Number(Math.exp(-dist / (2 * 0.75 * 0.75)).toFixed(4))
  }

  const sortedOctants = Object.entries(octantScores).sort((x, y) => y[1] - x[1]) as Array<
    [IcpArchetypeCode, number]
  >

  const ruleStyle = classifyStyle(axes)
  const primaryStyle =
    sortedOctants[0][1] - sortedOctants[1][1] < 0.05 ? ruleStyle : sortedOctants[0][0]
  const secondaryStyle = sortedOctants[1][1] > 0.45 ? sortedOctants[1][0] : null

  const completeness = Math.max(
    0,
    100 - Math.round((missingAnswerCount / ICP_V2_QUESTIONS.length) * 100)
  )

  let consistencyHits = 0
  let consistencyTotal = 0
  for (const [aId, bId, reverseExpected] of CONSISTENCY_PAIRS) {
    const av = answers[aId]
    const bv = answers[bId]
    consistencyTotal += 1
    const diff = Math.abs(av - bv)
    if (reverseExpected) {
      if (diff >= 2) consistencyHits += 1
    } else if (diff <= 1) {
      consistencyHits += 1
    }
  }
  const consistency =
    consistencyTotal > 0 ? Math.round((consistencyHits / consistencyTotal) * 100) : 60

  const completionSeconds = options?.completionSeconds
  const pace =
    completionSeconds == null ? 70 : completionSeconds < 40 ? 20 : completionSeconds < 75 ? 50 : 90

  const separationRaw = sortedOctants[0][1] - sortedOctants[1][1]
  const separation = Math.round(Math.max(0, Math.min(100, separationRaw * 200)))

  const confidence = Math.round(
    completeness * 0.4 + consistency * 0.35 + pace * 0.15 + separation * 0.1
  )

  const profile = ICP_ARCHETYPE_PROFILES[primaryStyle]
  const explainability = buildExplainability(axes, answers)

  return {
    testVersion: ICP_TEST_VERSION,
    resultId: `${ICP_TEST_VERSION}_${primaryStyle}`,
    primaryStyle,
    secondaryStyle,
    axes,
    dominanceScore,
    affiliationScore,
    octantScores,
    confidence,
    confidenceLevel: getConfidenceLevel(confidence),
    completionSeconds,
    missingAnswerCount,
    summaryKo: profile.summaryKo,
    summaryEn: profile.summaryEn,
    explainability,
  }
}
