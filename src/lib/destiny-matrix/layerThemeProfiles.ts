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
  coreInterpretationKo: string
  coreInterpretationEn: string
  detailedAdviceKo: string
  detailedAdviceEn: string
  evidenceTrace: string[]
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

function uniqueKeywords(cells: LayerCellMap, take: number, cautionOnly = false): string[] {
  const list = Object.values(cells)
    .filter((cell) => {
      if (!cautionOnly) return true
      const level = cell.interaction?.level
      return level === 'clash' || level === 'conflict'
    })
    .sort((a, b) =>
      cautionOnly
        ? (a.interaction?.score || 0) - (b.interaction?.score || 0)
        : (b.interaction?.score || 0) - (a.interaction?.score || 0)
    )
  const dedup = new Set<string>()
  for (const cell of list) {
    const keyword = cell.interaction?.keyword
    if (!keyword || dedup.has(keyword)) continue
    dedup.add(keyword)
    if (dedup.size >= take) break
  }
  return [...dedup]
}

function toStance(value: number): 'high' | 'medium' | 'low' {
  if (value >= 7) return 'high'
  if (value >= 4) return 'medium'
  return 'low'
}

function domainKo(domain: DomainKey): string {
  const map: Record<DomainKey, string> = {
    career: '직업/커리어',
    love: '연애/관계',
    money: '금전/자산',
    health: '건강/리듬',
    move: '이동/변화',
  }
  return map[domain]
}

function domainEn(domain: DomainKey): string {
  const map: Record<DomainKey, string> = {
    career: 'Career',
    love: 'Love/Relationship',
    money: 'Money/Assets',
    health: 'Health/Rhythm',
    move: 'Move/Change',
  }
  return map[domain]
}

function modeKo(avg: number): string {
  if (avg >= 7) return '가속 실행 모드'
  if (avg >= 4) return '조율 실행 모드'
  return '검증 우선 모드'
}

function modeEn(avg: number): string {
  if (avg >= 7) return 'accelerate mode'
  if (avg >= 4) return 'calibration mode'
  return 'verification-first mode'
}

function stanceKo(stance: 'high' | 'medium' | 'low'): string {
  if (stance === 'high') return '강한 추진'
  if (stance === 'medium') return '신중한 추진'
  return '보수적 운영'
}

function actionTipsKo(domain: DomainKey, stance: 'high' | 'medium' | 'low'): string {
  const high = stance === 'high'
  const map: Record<DomainKey, string> = {
    career: high
      ? '실행팁: 핵심 과제 1~2개를 강하게 밀되, 외부 확정은 문서 검증 후 진행하세요.'
      : '실행팁: 역할·범위·마감 조건을 먼저 합의하고, 일정은 1단계씩 확정하세요.',
    love: high
      ? '실행팁: 감정 표현은 선명하게, 요구사항은 짧고 구체적으로 전달하세요.'
      : '실행팁: 대화 후 요약 메시지로 재확인하고, 해석 차이는 당일 결론 내지 마세요.',
    money: high
      ? '실행팁: 기회 포착은 빠르게 하되, 단일 베팅 대신 분할 실행으로 리스크를 분산하세요.'
      : '실행팁: 계약·결제는 비교표 1회 점검 후 진행하고, 당일 확정은 피하세요.',
    health: high
      ? '실행팁: 강도보다 지속성을 우선해 회복-집중 리듬을 유지하세요.'
      : '실행팁: 수면·수분·식사 3축을 복구하고, 과부하 일정 1개를 즉시 줄이세요.',
    move: high
      ? '실행팁: 변화 추진은 좋지만 완료 기준과 책임 구분을 먼저 고정하세요.'
      : '실행팁: 이동·변경은 대체 시나리오를 준비하고 단계별 의사결정으로 쪼개세요.',
  }
  return map[domain]
}

function actionTipsEn(domain: DomainKey, stance: 'high' | 'medium' | 'low'): string {
  const high = stance === 'high'
  const map: Record<DomainKey, string> = {
    career: high
      ? 'Action: push 1-2 core tasks aggressively, but finalize external commitments only after document checks.'
      : 'Action: align role/scope/deadline first, then lock execution in phased steps.',
    love: high
      ? 'Action: keep emotional expression clear and requests short and concrete.'
      : 'Action: send a recap message after key talks and avoid same-day hard conclusions.',
    money: high
      ? 'Action: capture opportunities quickly but split execution to avoid single-point risk.'
      : 'Action: run one comparison check before payment/contract and avoid same-day finalization.',
    health: high
      ? 'Action: prioritize consistency over intensity to maintain recovery-focus rhythm.'
      : 'Action: recover sleep/hydration/meals first and remove one overload item today.',
    move: high
      ? 'Action: drive change with clear completion criteria and ownership boundaries.'
      : 'Action: prepare fallback paths and split large moves into staged decisions.',
  }
  return map[domain]
}

function buildCoreInterpretationKo(input: {
  domain: DomainKey
  layerNameKo: string
  layerMeaningKo: string
  impactScore: number
  avgScore: number
  topKeywordsKo: string[]
  cautionKeywordsKo: string[]
}): string {
  const strengths = input.topKeywordsKo.slice(0, 2).join(', ') || '중립 신호'
  const cautions = input.cautionKeywordsKo.slice(0, 2).join(', ') || '특이 경고 없음'
  return `${domainKo(input.domain)} 기준에서 ${input.layerNameKo}는 "${input.layerMeaningKo}"를 통해 영향 ${input.impactScore.toFixed(
    1
  )}점을 형성합니다. 강점 신호는 ${strengths}, 주의 신호는 ${cautions}이며 현재 운용 모드는 ${modeKo(
    input.avgScore
  )}입니다.`
}

function buildCoreInterpretationEn(input: {
  domain: DomainKey
  layerNameEn: string
  layerMeaningEn: string
  impactScore: number
  avgScore: number
  topKeywordsKo: string[]
  cautionKeywordsKo: string[]
}): string {
  const strengths = input.topKeywordsKo.slice(0, 2).join(', ') || 'neutral signals'
  const cautions = input.cautionKeywordsKo.slice(0, 2).join(', ') || 'no notable caution'
  return `For ${domainEn(input.domain)}, ${input.layerNameEn} contributes ${input.impactScore.toFixed(
    1
  )} via "${input.layerMeaningEn}". Strength signals: ${strengths}. Caution signals: ${cautions}. Current mode: ${modeEn(
    input.avgScore
  )}.`
}

function buildDetailedAdviceKo(input: {
  domain: DomainKey
  stance: 'high' | 'medium' | 'low'
  dayMasterElement: string
  dominantWesternElement?: string
  evidenceSources: string[]
  topKeywordsKo: string[]
  cautionKeywordsKo: string[]
}): string {
  const strengths = input.topKeywordsKo.slice(0, 3).join(', ') || '중립'
  const cautions = input.cautionKeywordsKo.slice(0, 3).join(', ') || '없음'
  const astro = input.dominantWesternElement ? `점성(${input.dominantWesternElement})` : '점성'
  const sourceText = input.evidenceSources.join(', ')
  return [
    `상세 조언: 사주(${input.dayMasterElement})와 ${astro}를 교차할 때 현재 스탠스는 "${stanceKo(
      input.stance
    )}"입니다.`,
    `실무 해석: 강점(${strengths})은 유지하고, 주의(${cautions})는 먼저 차단해야 전체 성과가 안정됩니다.`,
    actionTipsKo(input.domain, input.stance),
    `근거 트레이스: ${sourceText}.`,
  ].join(' ')
}

function buildDetailedAdviceEn(input: {
  domain: DomainKey
  stance: 'high' | 'medium' | 'low'
  evidenceSources: string[]
  topKeywordsKo: string[]
  cautionKeywordsKo: string[]
}): string {
  const strengths = input.topKeywordsKo.slice(0, 3).join(', ') || 'neutral'
  const cautions = input.cautionKeywordsKo.slice(0, 3).join(', ') || 'none'
  const stanceText =
    input.stance === 'high'
      ? 'strong execution'
      : input.stance === 'medium'
        ? 'controlled execution'
        : 'defensive operation'
  return [
    `Detailed guidance: current stance is "${stanceText}" for ${domainEn(input.domain)}.`,
    `Operationally, preserve strengths (${strengths}) and neutralize cautions (${cautions}) before scaling.`,
    actionTipsEn(input.domain, input.stance),
    `Evidence trace: ${input.evidenceSources.join(', ')}.`,
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
    const topKeywordsKo = uniqueKeywords(cells, 4, false)
    const cautionKeywordsKo = uniqueKeywords(cells, 4, true)

    const themeInsights: LayerThemeInsight[] = DOMAIN_KEYS.map((domain) => {
      const weight = getDomainWeightForLayer(semantic.id, domain)
      const impactScore = Math.round(layerAvg * weight * 10) / 10
      const stance = toStance(impactScore)

      const coreInterpretationKo = buildCoreInterpretationKo({
        domain,
        layerNameKo: semantic.nameKo,
        layerMeaningKo: semantic.meaningKo,
        impactScore,
        avgScore: layerAvg,
        topKeywordsKo,
        cautionKeywordsKo,
      })
      const coreInterpretationEn = buildCoreInterpretationEn({
        domain,
        layerNameEn: semantic.nameEn,
        layerMeaningEn: semantic.meaningEn,
        impactScore,
        avgScore: layerAvg,
        topKeywordsKo,
        cautionKeywordsKo,
      })
      const detailedAdviceKo = buildDetailedAdviceKo({
        domain,
        stance,
        dayMasterElement: input.dayMasterElement,
        dominantWesternElement: input.dominantWesternElement,
        evidenceSources: semantic.evidenceSources,
        topKeywordsKo,
        cautionKeywordsKo,
      })
      const detailedAdviceEn = buildDetailedAdviceEn({
        domain,
        stance,
        evidenceSources: semantic.evidenceSources,
        topKeywordsKo,
        cautionKeywordsKo,
      })

      return {
        domain,
        impactScore,
        stance,
        summaryKo: `${coreInterpretationKo} ${detailedAdviceKo}`,
        summaryEn: `${coreInterpretationEn} ${detailedAdviceEn}`,
        coreInterpretationKo,
        coreInterpretationEn,
        detailedAdviceKo,
        detailedAdviceEn,
        evidenceTrace: [...semantic.evidenceSources],
      }
    })

    return {
      layerId: semantic.id,
      layerNameKo: semantic.nameKo,
      layerNameEn: semantic.nameEn,
      matchedCells,
      avgScore: layerAvg,
      topKeywordsKo,
      cautionKeywordsKo,
      themeInsights,
    }
  })
}
