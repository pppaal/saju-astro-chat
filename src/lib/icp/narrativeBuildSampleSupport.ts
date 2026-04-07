import type { ICPOctantCode, ICPAnalysis } from './types'
import { ICP_OCTANTS } from './analysis'
import { ICP_ARCHETYPE_PROFILES } from '@/lib/icpTest/results'
import type { buildIcpNarrative } from './narrativeBuildCoreSupport'
import { ICP_SAMPLE_STYLE_CODES } from './narrativeBuildCoreSupport'

type IcpNarrativeInput = Parameters<typeof buildIcpNarrative>[0]
type IcpLocale = 'ko' | 'en'

const SAMPLE_PROFILE: Record<
  ICPOctantCode,
  { agency: number; warmth: number; boundary: number; resilience: number; secondary: ICPOctantCode }
> = {
  PA: { agency: 78, warmth: 76, boundary: 68, resilience: 72, secondary: 'NO' },
  BC: { agency: 75, warmth: 45, boundary: 75, resilience: 60, secondary: 'PA' },
  DE: { agency: 56, warmth: 30, boundary: 72, resilience: 64, secondary: 'FG' },
  FG: { agency: 34, warmth: 36, boundary: 58, resilience: 66, secondary: 'DE' },
  HI: { agency: 30, warmth: 70, boundary: 42, resilience: 54, secondary: 'JK' },
  JK: { agency: 40, warmth: 68, boundary: 66, resilience: 58, secondary: 'LM' },
  LM: { agency: 52, warmth: 82, boundary: 48, resilience: 53, secondary: 'NO' },
  NO: { agency: 68, warmth: 74, boundary: 60, resilience: 70, secondary: 'PA' },
}

function axisName(axis: string, locale: IcpLocale): string {
  const ko =
    axis === 'agency'
      ? '주도성'
      : axis === 'warmth'
        ? '관계 온도'
        : axis === 'boundary'
          ? '경계 감각'
          : '회복 탄력'
  const en =
    axis === 'agency'
      ? 'Agency'
      : axis === 'warmth'
        ? 'Warmth'
        : axis === 'boundary'
          ? 'Boundary'
          : 'Resilience'
  return locale === 'ko' ? ko : en
}

function buildSampleOctantScores(
  primary: ICPOctantCode,
  secondary: ICPOctantCode
): Record<ICPOctantCode, number> {
  const priority = [
    primary,
    secondary,
    ...ICP_SAMPLE_STYLE_CODES.filter((code) => code !== primary && code !== secondary),
  ]
  const rankScores = [0.74, 0.52, 0.47, 0.44, 0.38, 0.31, 0.24, 0.15]
  const out = {} as Record<ICPOctantCode, number>
  priority.forEach((code, idx) => {
    out[code] = rankScores[idx]
  })
  return out
}

export function isIcpStyleCode(value: string | null | undefined): value is ICPOctantCode {
  if (!value) return false
  return ICP_SAMPLE_STYLE_CODES.includes(value as ICPOctantCode)
}

export function buildIcpRenderSample(
  primaryCode: ICPOctantCode = 'BC',
  locale: IcpLocale = 'ko'
): IcpNarrativeInput {
  const sample = SAMPLE_PROFILE[primaryCode]
  const primary = ICP_OCTANTS[primaryCode]
  const secondary = ICP_OCTANTS[sample.secondary]
  const octantScores = buildSampleOctantScores(primaryCode, sample.secondary)
  const sortedAxes = [
    { key: 'agency', score: sample.agency },
    { key: 'warmth', score: sample.warmth },
    { key: 'boundary', score: sample.boundary },
    { key: 'resilience', score: sample.resilience },
  ].sort((a, b) => b.score - a.score)

  return {
    locale,
    dominanceScore: sample.agency,
    affiliationScore: sample.warmth,
    dominanceNormalized: (sample.agency - 50) / 50,
    affiliationNormalized: (sample.warmth - 50) / 50,
    boundaryScore: sample.boundary,
    resilienceScore: sample.resilience,
    octantScores,
    primaryStyle: primaryCode,
    secondaryStyle: sample.secondary,
    primaryOctant: primary,
    secondaryOctant: secondary,
    summary: ICP_ARCHETYPE_PROFILES[primaryCode].summaryEn,
    summaryKo: ICP_ARCHETYPE_PROFILES[primaryCode].summaryKo,
    consistencyScore: 64,
    confidence: 64,
    confidenceLevel: 'medium',
    testVersion: 'icp_v2',
    resultId: `icp_v2_${primaryCode}_sample`,
    explainability: {
      topAxes: sortedAxes.slice(0, 2).map((axis) => ({
        axis: axis.key as 'agency' | 'warmth' | 'boundary' | 'resilience',
        score: axis.score,
        interpretation: `${axisName(axis.key, locale)} 축이 상대적으로 높게 나타났습니다.`,
      })),
      lowAxes: sortedAxes.slice(-2).map((axis) => ({
        axis: axis.key as 'agency' | 'warmth' | 'boundary' | 'resilience',
        score: axis.score,
        interpretation: `${axisName(axis.key, locale)} 축은 보완 여지가 있습니다.`,
      })),
      evidence: [
        { questionId: 'ag_01', axis: 'agency', answer: 5, reverse: false, reason: '직접문항' },
        { questionId: 'ag_04', axis: 'agency', answer: 1, reverse: true, reason: '역문항' },
      ],
      note: `${primaryCode} sample`,
    },
  } as ICPAnalysis as IcpNarrativeInput
}

export function buildBCRenderSample(locale: IcpLocale = 'ko'): IcpNarrativeInput {
  return buildIcpRenderSample('BC', locale)
}
