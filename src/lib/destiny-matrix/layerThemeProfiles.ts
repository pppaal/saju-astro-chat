import type {
  DestinyFusionMatrixComputed,
  DomainKey,
  MatrixCalculationInput,
  MatrixCell,
} from './types'
import { DOMAIN_KEYS, getDomainWeightForLayer } from './domainMap'
import type { LayerId } from './layerSemantics'
import { LAYER_SEMANTICS } from './layerSemantics'

export interface LayerThemeInsight {
  domain: DomainKey
  impactScore: number
  stance: 'high' | 'medium' | 'low'
  summaryKo: string
  summaryEn: string
}

export interface LayerThemeProfile {
  layerId: LayerId
  layerNameKo: string
  layerNameEn: string
  matchedCells: number
  avgScore: number
  topKeywordsKo: string[]
  cautionKeywordsKo: string[]
  themeInsights: LayerThemeInsight[]
}

type LayerCellMap = Record<string, MatrixCell>

function getLayerCells(matrix: DestinyFusionMatrixComputed, layerId: LayerId): LayerCellMap {
  switch (layerId) {
    case 'layer1':
      return matrix.layer1_elementCore
    case 'layer2':
      return matrix.layer2_sibsinPlanet
    case 'layer3':
      return matrix.layer3_sibsinHouse
    case 'layer4':
      return matrix.layer4_timing
    case 'layer5':
      return matrix.layer5_relationAspect
    case 'layer6':
      return matrix.layer6_stageHouse
    case 'layer7':
      return matrix.layer7_advanced
    case 'layer8':
      return matrix.layer8_shinsalPlanet
    case 'layer9':
      return matrix.layer9_asteroidHouse
    case 'layer10':
      return matrix.layer10_extraPointElement
    default:
      return {}
  }
}

function avgScore(cells: LayerCellMap): number {
  const list = Object.values(cells)
  if (list.length === 0) return 0
  const total = list.reduce((sum, cell) => sum + (cell.interaction?.score || 0), 0)
  return Math.round((total / list.length) * 10) / 10
}

function topKeywords(cells: LayerCellMap): string[] {
  return Object.values(cells)
    .sort((a, b) => (b.interaction?.score || 0) - (a.interaction?.score || 0))
    .slice(0, 3)
    .map((cell) => cell.interaction?.keyword)
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
}

function cautionKeywords(cells: LayerCellMap): string[] {
  return Object.values(cells)
    .filter((cell) => {
      const level = cell.interaction?.level
      return level === 'clash' || level === 'conflict'
    })
    .sort((a, b) => (a.interaction?.score || 0) - (b.interaction?.score || 0))
    .slice(0, 3)
    .map((cell) => cell.interaction?.keyword)
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
}

function toStance(value: number): 'high' | 'medium' | 'low' {
  if (value >= 7) return 'high'
  if (value >= 4) return 'medium'
  return 'low'
}

function domainKo(domain: DomainKey): string {
  const map: Record<DomainKey, string> = {
    career: '직업',
    love: '연애',
    money: '금전',
    health: '건강',
    move: '이동/변화',
  }
  return map[domain]
}

function domainEn(domain: DomainKey): string {
  return domain
}

function buildInsightKo(input: {
  domain: DomainKey
  layerMeaningKo: string
  avgScore: number
  impactScore: number
  topKeywordsKo: string[]
  cautionKeywordsKo: string[]
  dayMasterElement: string
  dominantWesternElement?: string
}): string {
  const strength = input.topKeywordsKo.slice(0, 2).join(', ') || '중립'
  const caution = input.cautionKeywordsKo.slice(0, 2).join(', ') || '특이 리스크 없음'
  return [
    `${domainKo(input.domain)} 관점에서 ${input.layerMeaningKo}이(가) ${input.impactScore.toFixed(1)}점 영향으로 작동합니다.`,
    `핵심 신호는 ${strength}, 주의 신호는 ${caution}입니다.`,
    `일간 ${input.dayMasterElement}${input.dominantWesternElement ? ` + 점성 ${input.dominantWesternElement}` : ''} 조합 기준으로, 이 레이어는 ${input.avgScore >= 7 ? '가속' : input.avgScore >= 4 ? '조율' : '점검'} 우선 전략이 적합합니다.`,
  ].join(' ')
}

function buildInsightEn(input: {
  domain: DomainKey
  layerMeaningEn: string
  avgScore: number
  impactScore: number
  topKeywordsKo: string[]
  cautionKeywordsKo: string[]
}): string {
  const strength = input.topKeywordsKo.slice(0, 2).join(', ') || 'neutral'
  const caution = input.cautionKeywordsKo.slice(0, 2).join(', ') || 'no major caution'
  return [
    `For ${domainEn(input.domain)}, this layer contributes ${input.impactScore.toFixed(1)} via ${input.layerMeaningEn}.`,
    `Primary signals: ${strength}. Caution signals: ${caution}.`,
    `Recommended mode: ${input.avgScore >= 7 ? 'accelerate with control' : input.avgScore >= 4 ? 'calibrate and execute' : 'verify before action'}.`,
  ].join(' ')
}

export function buildLayerThemeProfiles(
  matrix: DestinyFusionMatrixComputed,
  input: MatrixCalculationInput
): LayerThemeProfile[] {
  return LAYER_SEMANTICS.map((semantic) => {
    const cells = getLayerCells(matrix, semantic.id)
    const matchedCells = Object.keys(cells).length
    const layerAvg = avgScore(cells)
    const tops = topKeywords(cells)
    const cautions = cautionKeywords(cells)

    const themeInsights: LayerThemeInsight[] = DOMAIN_KEYS.map((domain) => {
      const weight = getDomainWeightForLayer(semantic.id, domain)
      const impactScore = Math.round(layerAvg * weight * 10) / 10
      return {
        domain,
        impactScore,
        stance: toStance(impactScore),
        summaryKo: buildInsightKo({
          domain,
          layerMeaningKo: semantic.meaningKo,
          avgScore: layerAvg,
          impactScore,
          topKeywordsKo: tops,
          cautionKeywordsKo: cautions,
          dayMasterElement: input.dayMasterElement,
          dominantWesternElement: input.dominantWesternElement,
        }),
        summaryEn: buildInsightEn({
          domain,
          layerMeaningEn: semantic.meaningEn,
          avgScore: layerAvg,
          impactScore,
          topKeywordsKo: tops,
          cautionKeywordsKo: cautions,
        }),
      }
    })

    return {
      layerId: semantic.id,
      layerNameKo: semantic.nameKo,
      layerNameEn: semantic.nameEn,
      matchedCells,
      avgScore: layerAvg,
      topKeywordsKo: tops,
      cautionKeywordsKo: cautions,
      themeInsights,
    }
  })
}
