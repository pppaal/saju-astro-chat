/**
 * Destiny Matrix 어댑터 — saju + astro 결과를 받아서
 * destiny-matrix 엔진의 MatrixCalculationInput 형태로 변환.
 */
import type { MainSajuOutput } from '../../saju-engine'
import type { AstroEngineOutput } from '../../astro-engine'
import type { MatrixCalculationInput } from '../../destiny-matrix/types'

const STEM_TO_ELEMENT_KO: Record<string, '목' | '화' | '토' | '금' | '수'> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}

const SIBSIN_KO_NORMALIZE: Record<string, string> = {
  비견: '비견', 겁재: '겁재', 식신: '식신', 상관: '상관',
  편재: '편재', 정재: '정재', 편관: '편관', 정관: '정관',
  편인: '편인', 정인: '정인',
}

export function buildMatrixInput(
  saju: MainSajuOutput,
  astro: AstroEngineOutput,
): MatrixCalculationInput {
  const dayMaster = saju.pillars.day.stem
  const dayMasterElement = STEM_TO_ELEMENT_KO[dayMaster] || '토'

  const pillarStems = [
    saju.pillars.year.stem,
    saju.pillars.month.stem,
    saju.pillars.day.stem,
    saju.pillars.time.stem,
  ]
  const pillarElements = pillarStems.map(
    (s) => STEM_TO_ELEMENT_KO[s] || '토',
  ) as MatrixCalculationInput['pillarElements']

  // 십신 분포 — 4기둥 sibsin 합산
  const sibsinDistribution: Partial<Record<string, number>> = {}
  for (const p of [saju.pillars.year, saju.pillars.month, saju.pillars.day, saju.pillars.time]) {
    const s = p.sibsin && SIBSIN_KO_NORMALIZE[p.sibsin]
    if (s) sibsinDistribution[s] = (sibsinDistribution[s] || 0) + 1
  }

  // 12운성 — cycleAnalysis 의 본명 단계 분포
  const twelveStages: Partial<Record<string, number>> = {}
  const natalStages = saju.cycleAnalysis.daeun?.twelveStages.natalPillarStages
  if (natalStages) {
    for (const s of natalStages) {
      twelveStages[s.stage] = (twelveStages[s.stage] || 0) + 1
    }
  }

  return {
    dayMasterElement,
    pillarElements,
    sibsinDistribution: sibsinDistribution as MatrixCalculationInput['sibsinDistribution'],
    twelveStages: twelveStages as MatrixCalculationInput['twelveStages'],
    relations: [], // TODO: pillarInteractions 기반 보강
    geokguk: saju.advanced.geokguk.type as MatrixCalculationInput['geokguk'],
    yongsin: saju.advanced.yongsin.primary as MatrixCalculationInput['yongsin'],
    currentDaeunElement: saju.cycles.currentDaeun?.heavenlyStem
      ? STEM_TO_ELEMENT_KO[saju.cycles.currentDaeun.heavenlyStem]
      : undefined,
    planetHouses: Object.fromEntries(
      astro.natal.planets.map((p) => [p.name, p.house]),
    ) as MatrixCalculationInput['planetHouses'],
    planetSigns: Object.fromEntries(
      astro.natal.planets.map((p) => [p.name, p.sign]),
    ) as MatrixCalculationInput['planetSigns'],
    aspects: astro.natalAspects.map((a) => ({
      planet1: a.from.name as MatrixCalculationInput['aspects'][number]['planet1'],
      planet2: a.to.name as MatrixCalculationInput['aspects'][number]['planet2'],
      type: a.type as MatrixCalculationInput['aspects'][number]['type'],
      orb: a.orb,
    })),
  }
}
