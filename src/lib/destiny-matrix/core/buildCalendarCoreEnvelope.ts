import { calculateDestinyMatrix } from '@/lib/destiny-matrix/engine'
import type { FusionReport } from '@/lib/destiny-matrix/interpreter/types'
import type {
  DestinyFusionMatrixComputed,
  MatrixCalculationInput,
  MatrixCell,
  MatrixSummary,
} from '@/lib/destiny-matrix/types'
import { buildNormalizedMatrixInput, runDestinyCore } from './runDestinyCore'

export interface BuildCalendarCoreEnvelopeParams {
  lang: 'ko' | 'en'
  matrixInput: MatrixCalculationInput
  matrixSummary?: MatrixSummary
  matrixCalculator?: (input: MatrixCalculationInput) => DestinyFusionMatrixComputed
}

export interface CalendarCoreEnvelope {
  normalizedInput: ReturnType<typeof buildNormalizedMatrixInput>
  matrix: DestinyFusionMatrixComputed
  layerResults: Record<string, Record<string, MatrixCell>>
  matrixReport: FusionReport
  coreSeed: ReturnType<typeof runDestinyCore>
}

function toLayerResults(
  matrix: DestinyFusionMatrixComputed
): Record<string, Record<string, MatrixCell>> {
  return {
    layer1_elementCore: matrix.layer1_elementCore,
    layer2_sibsinPlanet: matrix.layer2_sibsinPlanet,
    layer3_sibsinHouse: matrix.layer3_sibsinHouse,
    layer4_timing: matrix.layer4_timing,
    layer5_relationAspect: matrix.layer5_relationAspect,
    layer6_stageHouse: matrix.layer6_stageHouse,
    layer7_advanced: matrix.layer7_advanced,
    layer8_shinsalPlanet: matrix.layer8_shinsalPlanet,
    layer9_asteroidHouse: matrix.layer9_asteroidHouse,
    layer10_extraPointElement: matrix.layer10_extraPointElement,
  }
}

function buildCalendarFusionReport(
  input: ReturnType<typeof buildNormalizedMatrixInput>,
  matrixSummary?: MatrixSummary
): FusionReport {
  const lang = input.lang === 'en' ? 'en' : 'ko'
  const shinsals = Array.isArray(input.shinsalList) ? input.shinsalList.slice(0, 8) : []
  const dominantSibsin = Object.entries(input.sibsinDistribution || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name]) => name)

  const overall = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        typeof matrixSummary?.overallScore === 'number'
          ? matrixSummary.overallScore
          : typeof matrixSummary?.overlapStrength === 'number'
            ? matrixSummary.overlapStrength * 100
            : 50
      )
    )
  )

  const currentPeriodName = input.currentDateIso || new Date().toISOString().slice(0, 10)

  return {
    id: `calendar-core-${currentPeriodName}`,
    generatedAt: new Date(),
    version: 'calendar-lite-v1',
    lang,
    profile: {
      dayMasterElement: input.dayMasterElement,
      dayMasterDescription:
        lang === 'ko'
          ? `${input.dayMasterElement} 일간 기준 캘린더 해석`
          : `Calendar interpretation anchored to ${input.dayMasterElement} day master`,
      geokguk: input.geokguk,
      geokgukDescription: input.geokguk
        ? lang === 'ko'
          ? `${input.geokguk} 구조 기준`
          : `Structured around ${input.geokguk}`
        : undefined,
      dominantSibsin,
      keyShinsals: shinsals,
      westernSunSign: input.planetSigns?.Sun,
      westernMoonSign: input.planetSigns?.Moon,
    },
    overallScore: {
      total: overall,
      grade: overall >= 85 ? 'A' : overall >= 70 ? 'B' : overall >= 55 ? 'C' : 'D',
      gradeDescription: lang === 'ko' ? '캘린더 기준 종합 점수' : 'Calendar overall score',
      gradeDescriptionEn: 'Calendar overall score',
      categoryScores: {
        strength: overall,
        opportunity: overall,
        balance: overall,
        caution: Math.max(0, 100 - overall),
        challenge: Math.max(0, 100 - overall),
      },
      dataCompleteness: 100,
      insightCount: 0,
    },
    topInsights: [],
    domainAnalysis: [],
    timingAnalysis: {
      currentPeriod: {
        name: currentPeriodName,
        nameEn: currentPeriodName,
        score: overall,
        description:
          lang === 'ko'
            ? '캘린더 코어는 상세 리포트 없이 타이밍 계산에 집중합니다.'
            : 'Calendar core prioritizes timing computation without full report generation.',
        descriptionEn:
          'Calendar core prioritizes timing computation without full report generation.',
      },
      activeTransits: [],
      upcomingPeriods: [],
      retrogradeAlerts: [],
    },
    visualizations: {
      radarChart: {
        labels: [],
        labelsEn: [],
        values: [],
        maxValue: 100,
      },
      heatmap: {
        rows: [],
        cols: [],
        values: [],
        colorScale: [],
      },
      synergyNetwork: {
        nodes: [],
        edges: [],
      },
      timeline: {
        events: [],
      },
    },
  }
}

export function buildCalendarCoreEnvelope(
  params: BuildCalendarCoreEnvelopeParams
): CalendarCoreEnvelope {
  const normalizedInput = buildNormalizedMatrixInput(params.matrixInput)
  const matrixCalculator = params.matrixCalculator || calculateDestinyMatrix
  const matrix = matrixCalculator(normalizedInput)
  const layerResults = toLayerResults(matrix)
  const matrixSummary = params.matrixSummary || matrix.summary
  const matrixReport = buildCalendarFusionReport(normalizedInput, matrixSummary)
  const coreSeed = runDestinyCore({
    mode: 'calendar',
    lang: params.lang,
    matrixInput: normalizedInput,
    matrixReport,
    matrixSummary,
  })

  return {
    normalizedInput,
    matrix,
    layerResults,
    matrixReport,
    coreSeed,
  }
}
