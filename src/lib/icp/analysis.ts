import type {
  ICPQuizAnswers,
  ICPAnalysis,
  ICPOctant,
  ICPOctantCode,
  PersonaAxisData,
  CrossSystemCompatibility,
} from './types'
import { scoreIcpTest } from '@/lib/icpTest/scoring'
import { ICP_ARCHETYPE_PROFILES } from '@/lib/icpTest/results'

const OCTANT_EMOJI: Record<ICPOctantCode, string> = {
  PA: '🎯',
  BC: '⚡',
  DE: '🧠',
  FG: '🌙',
  HI: '🫶',
  JK: '🤝',
  LM: '💗',
  NO: '🌱',
}

const OCTANT_COORDS: Record<ICPOctantCode, { dominance: number; affiliation: number }> = {
  PA: { dominance: 1, affiliation: 0.6 },
  BC: { dominance: 0.8, affiliation: -0.6 },
  DE: { dominance: 0.2, affiliation: -1 },
  FG: { dominance: -0.6, affiliation: -0.7 },
  HI: { dominance: -1, affiliation: 0 },
  JK: { dominance: -0.4, affiliation: 0.6 },
  LM: { dominance: 0.1, affiliation: 1 },
  NO: { dominance: 0.7, affiliation: 0.8 },
}

function toOctant(code: ICPOctantCode): ICPOctant {
  const p = ICP_ARCHETYPE_PROFILES[code]
  return {
    code,
    emoji: OCTANT_EMOJI[code],
    name: p.nameEn,
    korean: p.nameKo,
    traits: p.strengths,
    traitsKo: p.strengths,
    shadow: p.blindspots.join(' / '),
    shadowKo: p.blindspots.join(' / '),
    dominance: OCTANT_COORDS[code].dominance,
    affiliation: OCTANT_COORDS[code].affiliation,
    description: p.summaryEn,
    descriptionKo: p.summaryKo,
    therapeuticQuestions: [
      'What pattern do I repeat most in close relationships?',
      'Where do I need clearer boundaries this week?',
      'What one behavior would improve trust immediately?',
    ],
    therapeuticQuestionsKo: [
      '가까운 관계에서 내가 반복하는 패턴은 무엇인가?',
      '이번 주에 경계를 더 분명히 해야 할 영역은 어디인가?',
      '신뢰를 높이는 가장 작은 행동 1개는 무엇인가?',
    ],
    growthRecommendations: p.actions,
    growthRecommendationsKo: p.actions,
  }
}

export const ICP_OCTANTS: Record<ICPOctantCode, ICPOctant> = {
  PA: toOctant('PA'),
  BC: toOctant('BC'),
  DE: toOctant('DE'),
  FG: toOctant('FG'),
  HI: toOctant('HI'),
  JK: toOctant('JK'),
  LM: toOctant('LM'),
  NO: toOctant('NO'),
}

export function analyzeICP(answers: ICPQuizAnswers, locale: string = 'ko'): ICPAnalysis {
  const result = scoreIcpTest(answers)
  const primaryOctant = ICP_OCTANTS[result.primaryStyle]
  const secondaryOctant = result.secondaryStyle ? ICP_OCTANTS[result.secondaryStyle] : null
  const isKo = locale === 'ko'

  return {
    dominanceScore: result.dominanceScore,
    affiliationScore: result.affiliationScore,
    dominanceNormalized: (result.dominanceScore - 50) / 50,
    affiliationNormalized: (result.affiliationScore - 50) / 50,
    boundaryScore: result.axes.boundary,
    resilienceScore: result.axes.resilience,
    octantScores: result.octantScores,
    primaryStyle: result.primaryStyle,
    secondaryStyle: result.secondaryStyle,
    primaryOctant,
    secondaryOctant,
    summary: isKo ? result.summaryKo : result.summaryEn,
    summaryKo: result.summaryKo,
    consistencyScore: result.confidence,
    confidence: result.confidence,
    confidenceLevel: result.confidenceLevel,
    testVersion: result.testVersion,
    resultId: result.resultId,
    explainability: result.explainability,
  }
}

export function getICPCompatibility(
  style1: ICPOctantCode,
  style2: ICPOctantCode,
  _locale: string = 'ko'
): {
  score: number
  level: string
  levelKo: string
  description: string
  descriptionKo: string
} {
  const a = OCTANT_COORDS[style1]
  const b = OCTANT_COORDS[style2]

  const dDiff = Math.abs(a.dominance - b.dominance)
  const warmth = (a.affiliation + b.affiliation) / 2

  let score = 60
  if (dDiff > 0.8) score += 8
  if (dDiff < 0.3) score += 5
  if (warmth > 0.4) score += 15
  if (warmth < -0.4) score -= 10
  if (style1 === style2) score += 5

  score = Math.max(30, Math.min(95, Math.round(score)))

  if (score >= 80) {
    return {
      score,
      level: 'Excellent Match',
      levelKo: '탁월한 궁합',
      description: 'Your interpersonal patterns reinforce trust and momentum.',
      descriptionKo: '서로의 관계 패턴이 신뢰와 추진력을 함께 높여줍니다.',
    }
  }
  if (score >= 65) {
    return {
      score,
      level: 'Good Match',
      levelKo: '좋은 궁합',
      description: 'You can cooperate effectively with minor adjustments.',
      descriptionKo: '작은 조정만으로도 안정적으로 협력할 수 있습니다.',
    }
  }
  if (score >= 50) {
    return {
      score,
      level: 'Moderate Match',
      levelKo: '보통 궁합',
      description: 'Different approaches can work if communication stays explicit.',
      descriptionKo: '접근 방식이 달라도 소통을 명확히 하면 충분히 맞출 수 있습니다.',
    }
  }
  return {
    score,
    level: 'Challenging Match',
    levelKo: '도전적 궁합',
    description: 'You may need active boundary and communication agreements.',
    descriptionKo: '경계와 소통 방식에 대한 명시적 합의가 필요할 수 있습니다.',
  }
}

export function getCrossSystemCompatibility(
  icp1: ICPOctantCode,
  icp2: ICPOctantCode,
  _persona1Code: string,
  _persona2Code: string,
  persona1Axes: PersonaAxisData,
  persona2Axes: PersonaAxisData,
  locale: string = 'ko'
): CrossSystemCompatibility {
  const icp = getICPCompatibility(icp1, icp2, locale)

  const energyDiff = Math.abs((persona1Axes.energy.score ?? 50) - (persona2Axes.energy.score ?? 50))
  const decisionDiff = Math.abs(
    (persona1Axes.decision.score ?? 50) - (persona2Axes.decision.score ?? 50)
  )

  let score = icp.score
  if (energyDiff < 20) score += 6
  if (energyDiff > 55) score -= 5
  if (decisionDiff < 20) score += 6
  if (decisionDiff > 55) score -= 4

  score = Math.max(30, Math.min(95, Math.round(score)))

  const insightsKo = [
    'ICP 관계 패턴과 성격 축을 함께 보면 갈등 예방 포인트가 더 선명해집니다.',
    '점수가 낮은 축은 보완 전략(속도 조절, 경계 합의)으로 개선 가능합니다.',
  ]
  const insights = [
    'Combining ICP and persona axes clarifies conflict-prevention points.',
    'Lower-scoring dimensions can improve with explicit adjustment strategies.',
  ]

  return {
    score,
    level:
      score >= 75 ? 'Strong Compatibility' : score >= 55 ? 'Moderate Fit' : 'Growth Opportunity',
    levelKo: score >= 75 ? '강한 적합성' : score >= 55 ? '중간 적합성' : '성장 기회',
    description: icp.description,
    descriptionKo: icp.descriptionKo,
    insights,
    insightsKo,
  }
}
