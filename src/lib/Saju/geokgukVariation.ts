// src/lib/Saju/geokgukVariation.ts
//
// 격국 변격(變格) / 파격(破格) 정통 자평진전 detector.
//
// 입력 격국 라벨이 정통 진종(眞從)인지, 가종(假從, 비겁이 1개라도 있으면
// 종격 충족 안 됨)인지, 합거(合去) 후 격국이 다른 것으로 변해야 하는지
// 검증. 우리 cross-rules에서 종재격에 비겁 1개 들어와도 종격 favorable
// 발화하는 결함을 막는 layer.

import type { CalculateSajuDataResult } from './types'

export type GeokgukIntegrity = 'true' | 'false' | 'broken' | 'transformed'

export interface GeokgukVariationResult {
  /** 입력 격국 라벨 (예: 종재격) */
  labeledGeokguk: string
  /** 진종이면 'true', 가종이면 'false', 파격이면 'broken', 합거 후 변격이면 'transformed' */
  integrity: GeokgukIntegrity
  /** 변경된 경우 새 라벨 */
  effectiveGeokguk?: string
  /** 변경 사유 한 줄 */
  reason: string
  /** 사용자 친화 narrative */
  narrative: string
}

const STEM_TO_ELEMENT: Record<string, string> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토',
  庚: '금', 辛: '금', 壬: '수', 癸: '수',
}

const BRANCH_TO_ELEMENT: Record<string, string> = {
  寅: '목', 卯: '목', 巳: '화', 午: '화', 辰: '토', 戌: '토',
  丑: '토', 未: '토', 申: '금', 酉: '금', 亥: '수', 子: '수',
}

const STEM_PAIRS_HAP: Record<string, string> = {
  甲己: '토', 乙庚: '금', 丙辛: '수', 丁壬: '목', 戊癸: '화',
  己甲: '토', 庚乙: '금', 辛丙: '수', 壬丁: '목', 癸戊: '화',
}

interface PillarLite {
  stem: string
  branch: string
}

function pillarsFromSaju(saju: CalculateSajuDataResult): {
  year: PillarLite
  month: PillarLite
  day: PillarLite
  time: PillarLite
} {
  return {
    year: {
      stem: saju.yearPillar.heavenlyStem.name,
      branch: saju.yearPillar.earthlyBranch.name,
    },
    month: {
      stem: saju.monthPillar.heavenlyStem.name,
      branch: saju.monthPillar.earthlyBranch.name,
    },
    day: {
      stem: saju.dayPillar.heavenlyStem.name,
      branch: saju.dayPillar.earthlyBranch.name,
    },
    time: {
      stem: saju.timePillar.heavenlyStem.name,
      branch: saju.timePillar.earthlyBranch.name,
    },
  }
}

function countDayMasterRoot(saju: CalculateSajuDataResult): {
  bigeop: number
  inseong: number
  total: number
} {
  const dayElement = saju.dayPillar.heavenlyStem.element as string
  const generatingElement = generatingElementOf(dayElement)
  const pillars = pillarsFromSaju(saju)
  let bigeop = 0
  let inseong = 0
  // Day stem itself is the day master — don't count it as 비겁 root.
  // Day branch + other 3 pillars (stem+branch each) count.
  const branchEl0 = BRANCH_TO_ELEMENT[pillars.day.branch]
  if (branchEl0 === dayElement) bigeop += 1
  if (branchEl0 === generatingElement) inseong += 1
  for (const pillar of [pillars.year, pillars.month, pillars.time]) {
    const stemEl = STEM_TO_ELEMENT[pillar.stem]
    const branchEl = BRANCH_TO_ELEMENT[pillar.branch]
    if (stemEl === dayElement) bigeop += 1
    if (branchEl === dayElement) bigeop += 1
    if (stemEl === generatingElement) inseong += 1
    if (branchEl === generatingElement) inseong += 1
  }
  return { bigeop, inseong, total: bigeop + inseong }
}

function generatingElementOf(el: string): string {
  switch (el) {
    case '목': return '수'
    case '화': return '목'
    case '토': return '화'
    case '금': return '토'
    case '수': return '금'
    default: return ''
  }
}

function detectStemHapgeo(saju: CalculateSajuDataResult): { absorbedStem?: string; reason?: string } {
  const pillars = pillarsFromSaju(saju)
  const dayStem = pillars.day.stem
  const stems = [pillars.year.stem, pillars.month.stem, pillars.time.stem]

  // 일간이 합거되는 케이스만 감지 (다른 천간이 일간을 합으로 끌고 가는 결).
  for (const otherStem of stems) {
    const key = `${dayStem}${otherStem}`
    const transformed = STEM_PAIRS_HAP[key]
    if (transformed) {
      // 순수 합화는 매우 까다로워서, 여기서는 약식으로 합 발생만 표기.
      return {
        absorbedStem: otherStem,
        reason: `일간 ${dayStem}이 ${otherStem}과 천간합 (${dayStem}${otherStem}→${transformed})`,
      }
    }
  }
  return {}
}

/**
 * 격국 진종/가종/파격/변격 검증.
 *
 * 종격 (jonggang/jongjae/jongsal/jonga) 라벨 입력 시:
 *   - 일간 비겁·인성 합 0 = 진종
 *   - 1-2 = 가종 (정격 운에 충돌 가능)
 *   - 3+ = 파격 — 종격 룰 발화 금지
 *
 * 정격 입력 시 천간합거 발생하면 변격 표기.
 */
export function detectGeokgukVariation(
  labeledGeokguk: string,
  saju: CalculateSajuDataResult,
): GeokgukVariationResult {
  const isJonggeok = /jong|종/i.test(labeledGeokguk)

  if (isJonggeok) {
    const root = countDayMasterRoot(saju)
    if (root.total === 0) {
      return {
        labeledGeokguk,
        integrity: 'true',
        reason: `진종 — 일간 비겁·인성 합 0 (자평진전 정통)`,
        narrative: `진종격으로 흐름 거스르지 말고 그 결대로. 비겁·인성 운 만나면 오히려 충돌.`,
      }
    }
    if (root.total <= 2) {
      return {
        labeledGeokguk,
        integrity: 'false',
        effectiveGeokguk: `${labeledGeokguk} (가종)`,
        reason: `가종 — 일간 비겁 ${root.bigeop} + 인성 ${root.inseong} (1-2개 잔류)`,
        narrative: `가종격이라 종격 운에는 흐름대로, 정격 운(비겁·인성)에 작은 마찰. 본격적 파격은 아님.`,
      }
    }
    return {
      labeledGeokguk,
      integrity: 'broken',
      effectiveGeokguk: '정격 (파격된 종격)',
      reason: `파격 — 일간 비겁 ${root.bigeop} + 인성 ${root.inseong} (3개 이상)`,
      narrative: `파격된 종격 — 종격 룰 적용 X. 일반 정격으로 다시 분석 필요. 비겁·인성 자원이 의외로 많음.`,
    }
  }

  // 정격 — 천간 합거 검증.
  const hapgeo = detectStemHapgeo(saju)
  if (hapgeo.absorbedStem) {
    return {
      labeledGeokguk,
      integrity: 'transformed',
      effectiveGeokguk: `${labeledGeokguk} (변격 — ${hapgeo.absorbedStem} 합거)`,
      reason: hapgeo.reason || '천간합거',
      narrative: `정격이지만 천간합거가 발생해 격국 강도 변화 가능. 일간이 합으로 끌려가는 결이라 자기 의지보다 외부 흐름에 영향 큼.`,
    }
  }

  return {
    labeledGeokguk,
    integrity: 'true',
    reason: '정격 — 천간 합거 없음, 격국 정상',
    narrative: `정격 그대로 작동. 격국 룰 100% 적용 가능.`,
  }
}
