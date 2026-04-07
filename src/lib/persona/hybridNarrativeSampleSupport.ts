import type { ICPAnalysis, ICPOctantCode } from '@/lib/icp/types'
import { ICP_ARCHETYPE_PROFILES } from '@/lib/icpTest/results'
import { ICP_OCTANTS } from '@/lib/icp/analysis'
import type { PersonaAnalysis } from '@/lib/persona/types'
import { PERSONA_ARCHETYPES, PERSONA_ARCHETYPES_KO } from '@/lib/persona/archetypes'
import type {
  HybridLocale,
  HybridNarrative,
  HybridNarrativeInput,
} from './hybridNarrativeBuildSupport'
import { buildHybridNarrative } from './hybridNarrativeBuildSupport'

function buildSamplePersona(locale: HybridLocale): PersonaAnalysis {
  const archetype = locale === 'ko' ? PERSONA_ARCHETYPES_KO.RSLA : PERSONA_ARCHETYPES.RSLA
  return {
    title: archetype.name,
    personaName: archetype.name,
    summary: archetype.summary,
    typeCode: 'RSLA',
    axes: {
      energy: { pole: 'radiant', score: 62 },
      cognition: { pole: 'structured', score: 34 },
      decision: { pole: 'logic', score: 72 },
      rhythm: { pole: 'anchor', score: 28 },
    },
    consistencyScore: 76,
    consistencyLabel: 'high',
    primaryColor: '#60A5FA',
    secondaryColor: '#38BDF8',
    strengths: archetype.strengths.slice(0, 4),
    challenges: archetype.cautions.slice(0, 3),
    career: archetype.idealRoles.slice(0, 3).join(', '),
    relationships: archetype.compatibilityHint,
    guidance: archetype.growth.join(' '),
    growthTips: archetype.growth.slice(0, 3),
    keyMotivations:
      locale === 'ko'
        ? ['성과 가시성', '운영 안정성', '명확한 기준']
        : ['Visible outcomes', 'Operational stability', 'Clear standards'],
    recommendedRoles: archetype.idealRoles.slice(0, 4),
    compatibilityHint: archetype.compatibilityHint,
    profile: {
      openness: 42,
      conscientiousness: 84,
      extraversion: 62,
      agreeableness: 48,
      neuroticism: 36,
      introversion: 38,
      intuition: 44,
      thinking: 74,
      perceiving: 30,
      enneagram: {
        '1': 42,
        '2': 18,
        '3': 61,
        '4': 12,
        '5': 28,
        '6': 55,
        '7': 26,
        '8': 63,
        '9': 20,
      },
    },
  }
}

function buildSampleIcp(_locale: HybridLocale): ICPAnalysis {
  const primaryStyle: ICPOctantCode = 'BC'
  const secondaryStyle: ICPOctantCode = 'PA'
  return {
    dominanceScore: 75,
    affiliationScore: 45,
    dominanceNormalized: 0.5,
    affiliationNormalized: -0.1,
    boundaryScore: 75,
    resilienceScore: 60,
    octantScores: {
      BC: 74,
      PA: 52,
      DE: 47,
      FG: 45,
      JK: 31,
      LM: 30,
      NO: 25,
      HI: 13,
    },
    primaryStyle,
    secondaryStyle,
    primaryOctant: ICP_OCTANTS.BC,
    secondaryOctant: ICP_OCTANTS.PA,
    summary: ICP_ARCHETYPE_PROFILES.BC.summaryEn,
    summaryKo: ICP_ARCHETYPE_PROFILES.BC.summaryKo,
    consistencyScore: 64,
    confidence: 64,
    confidenceLevel: 'medium',
    testVersion: 'icp_v2',
    resultId: 'icp_v2_bc_sample',
    explainability: {
      topAxes: [
        { axis: 'agency', score: 75, interpretation: '주도성 높음' },
        { axis: 'boundary', score: 75, interpretation: '경계 유연성 높음' },
      ],
      lowAxes: [{ axis: 'warmth', score: 45, interpretation: '관계 온도 중간' }],
      evidence: [
        { questionId: 'ag_01', axis: 'agency', answer: 5, reverse: false, reason: '주도 문항' },
        { questionId: 'wa_02', axis: 'warmth', answer: 2, reverse: true, reason: '역문항' },
      ],
      note: 'sample',
    },
  }
}

export function buildHybridSampleInput(locale: HybridLocale = 'ko'): HybridNarrativeInput {
  return {
    icp: buildSampleIcp(locale),
    persona: buildSamplePersona(locale),
    hybrid: {
      id: 'HX08',
      nameKo: '기준 수호형',
      descriptionKo: '원칙과 성과를 함께 지키는 하이브리드입니다.',
      guidance: ['원칙-예외 기준 동시 명시', '합의 없는 확장 금지', '사후 회고 규칙화'],
      blindspots: ['유연성 저하', '관계 온도 하락'],
      fallback: false,
    },
    locale,
  }
}

export function buildHybridNarrativeSample(locale: HybridLocale = 'ko'): HybridNarrative {
  return buildHybridNarrative(buildHybridSampleInput(locale))
}
