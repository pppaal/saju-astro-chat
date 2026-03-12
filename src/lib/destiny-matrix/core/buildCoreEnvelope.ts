import { calculateDestinyMatrix } from '@/lib/destiny-matrix/engine'
import { reportGenerator } from '@/lib/destiny-matrix/interpreter'
import type { FusionReport, InsightDomain } from '@/lib/destiny-matrix/interpreter/types'
import type {
  DestinyFusionMatrixComputed,
  MatrixCalculationInput,
  MatrixCell,
  MatrixSummary,
} from '@/lib/destiny-matrix/types'
import { buildNormalizedMatrixInput, runDestinyCore } from './runDestinyCore'

type CoreMode = 'comprehensive' | 'timing' | 'themed' | 'calendar'

type ReportGeneratorLike = {
  generateReport: (
    input: MatrixCalculationInput,
    layerResults: Record<string, Record<string, MatrixCell>>,
    queryDomain?: InsightDomain
  ) => FusionReport
}

export interface BuildCoreEnvelopeParams {
  mode: CoreMode
  lang: 'ko' | 'en'
  matrixInput: MatrixCalculationInput
  queryDomain?: InsightDomain
  matrixSummary?: MatrixSummary
  reportGeneratorInstance?: ReportGeneratorLike
  matrixCalculator?: (input: MatrixCalculationInput) => DestinyFusionMatrixComputed
}

export interface DestinyCoreEnvelope {
  normalizedInput: ReturnType<typeof buildNormalizedMatrixInput>
  matrix: DestinyFusionMatrixComputed
  layerResults: Record<string, Record<string, MatrixCell>>
  matrixReport: FusionReport
  coreSeed: ReturnType<typeof runDestinyCore>
}

export function toLayerResults(
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

export function buildCoreEnvelope(params: BuildCoreEnvelopeParams): DestinyCoreEnvelope {
  const normalizedInput = buildNormalizedMatrixInput(params.matrixInput)
  const matrixCalculator = params.matrixCalculator || calculateDestinyMatrix
  const matrix = matrixCalculator(normalizedInput)
  const layerResults = toLayerResults(matrix)
  const generator = params.reportGeneratorInstance || reportGenerator
  const matrixReport = generator.generateReport(normalizedInput, layerResults, params.queryDomain)
  const coreSeed = runDestinyCore({
    mode: params.mode,
    lang: params.lang,
    matrixInput: normalizedInput,
    matrixReport,
    matrixSummary: params.matrixSummary || matrix.summary,
  })

  return {
    normalizedInput,
    matrix,
    layerResults,
    matrixReport,
    coreSeed,
  }
}
