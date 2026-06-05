// src/lib/Saju/strengthScore.ts
// 사주 강약 종합 점수화 시스템 (200% 급 모듈)

import { FiveElement, SajuPillars, PillarData, SibsinKind } from './types'
import { JIJANGGAN, FIVE_ELEMENT_RELATIONS } from './constants'
import { BRANCH_CLASH, SIX_HARMONY, toBidiRecord } from './relationTables'
import { getStemElement, getBranchElement, getStemYinYang } from './stemBranchUtils'

// ============================================================
// 타입 정의
// ============================================================

/** 개별 점수 항목 */
export interface ScoreItem {
  category: string // 점수 카테고리
  name: string // 항목 이름
  score: number // 점수 (-100 ~ +100)
  weight: number // 가중치 (0.0 ~ 1.0)
  description: string // 설명
}

/** 오행별 점수 */
export interface ElementScore {
  element: FiveElement
  raw: number // 원시 점수
  weighted: number // 가중 점수
  ratio: number // 비율 (0.0 ~ 1.0)
}

/** 신강/신약 점수 */
export interface StrengthScore {
  total: number // 종합 점수 (0 ~ 100)
  level: '극강' | '강' | '중강' | '중약' | '약' | '극약'
  supportScore: number // 도움받는 점수 (비겁, 인성)
  resistScore: number // 설기되는 점수 (식상, 재성, 관성)
  balance: number // 균형도 (-50 ~ +50)
  items: ScoreItem[] // 세부 항목
}

/** 격국 점수 */
export interface GeokgukScore {
  type: string // 격국 유형
  purity: number // 순수도 (0 ~ 100)
  stability: number // 안정도 (0 ~ 100)
  items: ScoreItem[]
}

/** 용신 적합도 */
export interface YongsinFitScore {
  yongsin: FiveElement
  fitScore: number // 적합도 (0 ~ 100)
  presenceScore: number // 존재감 (0 ~ 100)
  effectiveScore: number // 유효도 (0 ~ 100)
  items: ScoreItem[]
}

/** 운세 조화도 */

// ============================================================
// 점수 상수
// ============================================================

/** 위치별 가중치 */
const POSITION_WEIGHTS = {
  year: 0.15, // 년주
  month: 0.3, // 월주 (가장 중요)
  day: 0.35, // 일주 (일간 기준)
  time: 0.2, // 시주
}

/** 천간/지지 가중치 */
const STEM_BRANCH_WEIGHTS = {
  stem: 0.4, // 천간
  branch: 0.6, // 지지 (지장간 포함)
}

/** 지장간 가중치 */
const JIJANGGAN_WEIGHTS = {
  정기: 0.6,
  중기: 0.25,
  여기: 0.15,
}

/** 십성 카테고리별 가중치 */
const SIBSIN_CATEGORY_WEIGHTS: Record<string, number> = {
  비겁: 1.0, // 비견, 겁재
  인성: 0.8, // 편인, 정인
  식상: 0.6, // 식신, 상관
  재성: 0.7, // 편재, 정재
  관성: 0.9, // 편관, 정관
}

// ============================================================
// 오행 점수 계산
// ============================================================

/**
 * 사주 팔자의 오행 점수 계산
 */
export function calculateElementScores(pillars: SajuPillars): ElementScore[] {
  const rawScores: Record<FiveElement, number> = {
    목: 0,
    화: 0,
    토: 0,
    금: 0,
    수: 0,
  }

  const pillarEntries: Array<{ key: 'year' | 'month' | 'day' | 'time'; data: PillarData }> = [
    { key: 'year', data: pillars.year },
    { key: 'month', data: pillars.month },
    { key: 'day', data: pillars.day },
    { key: 'time', data: pillars.time },
  ]

  for (const { key, data } of pillarEntries) {
    const weight = POSITION_WEIGHTS[key]

    // 천간 점수
    const stemElement = getStemElement(data.heavenlyStem.name)
    rawScores[stemElement] += weight * STEM_BRANCH_WEIGHTS.stem * 10

    // 지지 본기 점수
    const branchElement = getBranchElement(data.earthlyBranch.name)
    rawScores[branchElement] += weight * STEM_BRANCH_WEIGHTS.branch * 0.4 * 10

    // 지장간 점수
    const branchName = data.earthlyBranch.name
    const jijanggan = JIJANGGAN[branchName]
    if (jijanggan) {
      for (const [qi, stem] of Object.entries(jijanggan)) {
        const qiWeight = JIJANGGAN_WEIGHTS[qi as keyof typeof JIJANGGAN_WEIGHTS] || 0.2
        const element = getStemElement(stem)
        rawScores[element] += weight * STEM_BRANCH_WEIGHTS.branch * 0.6 * qiWeight * 10
      }
    }
  }

  // 총합 계산
  const total = Object.values(rawScores).reduce((sum, v) => sum + v, 0)

  return (['목', '화', '토', '금', '수'] as FiveElement[]).map((element) => ({
    element,
    raw: rawScores[element],
    weighted: rawScores[element],
    ratio: total > 0 ? rawScores[element] / total : 0.2,
  }))
}

// ============================================================
// 신강/신약 점수 계산
// ============================================================

/**
 * 신강/신약 점수 계산
 */
export function calculateStrengthScore(pillars: SajuPillars, monthBranch?: string): StrengthScore {
  const dayMaster = pillars.day.heavenlyStem.name
  const dayElement = getStemElement(dayMaster)
  const dayYinYang = getStemYinYang(dayMaster)

  const items: ScoreItem[] = []
  let supportScore = 0
  let resistScore = 0

  // 1. 득령(월지 계절) 점수 - 30점 만점
  const actualMonthBranch = monthBranch || pillars.month.earthlyBranch.name
  const monthElement = getBranchElement(actualMonthBranch)
  const deukryeongScore = calculateDeukryeongScore(dayElement, monthElement)
  items.push({
    category: '득령',
    name: `${actualMonthBranch}월 ${monthElement}`,
    score: deukryeongScore,
    weight: 0.3,
    description: deukryeongScore >= 20 ? '득령' : deukryeongScore >= 10 ? '평령' : '실령',
  })
  supportScore += deukryeongScore

  // 2. 통근(지지 근) 점수 - 25점 만점
  const tonggeunScore = calculateTonggeunScore(pillars, dayElement)
  items.push({
    category: '통근',
    name: '지지 뿌리',
    score: tonggeunScore,
    weight: 0.25,
    description: tonggeunScore >= 15 ? '강한 뿌리' : tonggeunScore >= 8 ? '보통 뿌리' : '약한 뿌리',
  })
  supportScore += tonggeunScore

  // 3. 인성 지원 점수 - 20점 만점
  const inseongElement = FIVE_ELEMENT_RELATIONS['생받는관계'][dayElement]
  const inseongScore = calculateElementPresenceScore(pillars, inseongElement, 20)
  items.push({
    category: '인성',
    name: `${inseongElement} 지원`,
    score: inseongScore,
    weight: 0.2,
    description: `인성(${inseongElement})의 도움`,
  })
  supportScore += inseongScore

  // 4. 비겁 지원 점수 - 15점 만점
  const bigyeobScore = calculateElementPresenceScore(pillars, dayElement, 15)
  items.push({
    category: '비겁',
    name: '비겁 지원',
    score: bigyeobScore,
    weight: 0.15,
    description: '동일 오행의 도움',
  })
  supportScore += bigyeobScore

  // 5. 설기 (식상) 점수 - 음수
  const siksangElement = FIVE_ELEMENT_RELATIONS['생하는관계'][dayElement]
  const siksangScore = calculateElementPresenceScore(pillars, siksangElement, 15)
  items.push({
    category: '식상',
    name: `${siksangElement} 설기`,
    score: -siksangScore,
    weight: 0.15,
    description: '기운 소모',
  })
  resistScore += siksangScore

  // 6. 재성 점수 - 음수
  const jaeseongElement = FIVE_ELEMENT_RELATIONS['극하는관계'][dayElement]
  const jaeseongScore = calculateElementPresenceScore(pillars, jaeseongElement, 15)
  items.push({
    category: '재성',
    name: `${jaeseongElement} 극`,
    score: -jaeseongScore,
    weight: 0.15,
    description: '재성 소모',
  })
  resistScore += jaeseongScore

  // 7. 관성 점수 - 음수
  const gwanseongElement = FIVE_ELEMENT_RELATIONS['극받는관계'][dayElement]
  const gwanseongScore = calculateElementPresenceScore(pillars, gwanseongElement, 20)
  items.push({
    category: '관성',
    name: `${gwanseongElement} 극`,
    score: -gwanseongScore,
    weight: 0.2,
    description: '관성의 억압',
  })
  resistScore += gwanseongScore

  // 종합 점수 계산
  const balance = supportScore - resistScore
  const total = Math.max(0, Math.min(100, 50 + balance))

  // 레벨 결정
  let level: StrengthScore['level']
  if (total >= 85) {
    level = '극강'
  } else if (total >= 70) {
    level = '강'
  } else if (total >= 55) {
    level = '중강'
  } else if (total >= 40) {
    level = '중약'
  } else if (total >= 25) {
    level = '약'
  } else {
    level = '극약'
  }

  return {
    total,
    level,
    supportScore,
    resistScore,
    balance,
    items,
  }
}

function calculateDeukryeongScore(dayElement: FiveElement, monthElement: FiveElement): number {
  if (dayElement === monthElement) {
    return 30
  } // 왕지
  if (FIVE_ELEMENT_RELATIONS['생받는관계'][dayElement] === monthElement) {
    return 25
  } // 상생
  if (FIVE_ELEMENT_RELATIONS['생하는관계'][dayElement] === monthElement) {
    return 10
  } // 설기
  if (FIVE_ELEMENT_RELATIONS['극하는관계'][dayElement] === monthElement) {
    return 5
  } // 극출
  if (FIVE_ELEMENT_RELATIONS['극받는관계'][dayElement] === monthElement) {
    return 0
  } // 극입
  return 15 // 중립
}

function calculateTonggeunScore(pillars: SajuPillars, dayElement: FiveElement): number {
  let score = 0
  const branches = [
    pillars.year.earthlyBranch.name,
    pillars.month.earthlyBranch.name,
    pillars.day.earthlyBranch.name,
    pillars.time.earthlyBranch.name,
  ]

  for (const branch of branches) {
    const jijanggan = JIJANGGAN[branch]
    if (!jijanggan) {
      continue
    }

    for (const [qi, stem] of Object.entries(jijanggan)) {
      if (getStemElement(stem) === dayElement) {
        const qiWeight = qi === '정기' ? 8 : qi === '중기' ? 5 : 3
        score += qiWeight
      }
    }
  }

  return Math.min(25, score)
}

function calculateElementPresenceScore(
  pillars: SajuPillars,
  element: FiveElement,
  maxScore: number
): number {
  let score = 0

  // 천간 체크
  const stems = [
    pillars.year.heavenlyStem.name,
    pillars.month.heavenlyStem.name,
    pillars.day.heavenlyStem.name,
    pillars.time.heavenlyStem.name,
  ]

  for (const stem of stems) {
    if (getStemElement(stem) === element) {
      score += 3
    }
  }

  // 지지 체크
  const branches = [
    pillars.year.earthlyBranch.name,
    pillars.month.earthlyBranch.name,
    pillars.day.earthlyBranch.name,
    pillars.time.earthlyBranch.name,
  ]

  for (const branch of branches) {
    if (getBranchElement(branch) === element) {
      score += 2
    }

    const jijanggan = JIJANGGAN[branch]
    if (jijanggan) {
      for (const stem of Object.values(jijanggan)) {
        if (getStemElement(stem) === element) {
          score += 1
        }
      }
    }
  }

  return Math.min(maxScore, score)
}

// ============================================================
// 격국 점수 계산
// ============================================================

/**
 * 격국 순수도 및 안정도 점수 계산
 */
export function calculateGeokgukScore(pillars: SajuPillars, geokgukType: string): GeokgukScore {
  const items: ScoreItem[] = []
  let purity = 50
  let stability = 50

  const dayMaster = pillars.day.heavenlyStem.name
  const monthBranch = pillars.month.earthlyBranch.name
  const jijanggan = JIJANGGAN[monthBranch]

  // 월지 정기 투출 여부
  if (jijanggan?.['정기']) {
    const jeonggi = jijanggan['정기']
    const stems = [
      pillars.year.heavenlyStem.name,
      pillars.month.heavenlyStem.name,
      pillars.time.heavenlyStem.name,
    ]

    if (stems.includes(jeonggi)) {
      purity += 20
      items.push({
        category: '투출',
        name: '월지 정기 투출',
        score: 20,
        weight: 0.3,
        description: `${jeonggi}이 천간에 투출`,
      })
    }
  }

  // 격국 파괴 요소 체크
  const hasChung = checkChungPresence(pillars)
  if (hasChung) {
    purity -= 15
    stability -= 20
    items.push({
      category: '충',
      name: '충 존재',
      score: -15,
      weight: 0.2,
      description: '충으로 인한 불안정',
    })
  }

  // 격국 보호 요소
  const hasHap = checkHapPresence(pillars)
  if (hasHap) {
    stability += 15
    items.push({
      category: '합',
      name: '합 존재',
      score: 15,
      weight: 0.2,
      description: '합으로 인한 안정',
    })
  }

  return {
    type: geokgukType,
    purity: Math.max(0, Math.min(100, purity)),
    stability: Math.max(0, Math.min(100, stability)),
    items,
  }
}

function checkChungPresence(pillars: SajuPillars): boolean {
  const CHUNG_PAIRS: [string, string][] = BRANCH_CLASH.map((p) => [p[0], p[1]])

  const branches = [
    pillars.year.earthlyBranch.name,
    pillars.month.earthlyBranch.name,
    pillars.day.earthlyBranch.name,
    pillars.time.earthlyBranch.name,
  ]

  for (const [a, b] of CHUNG_PAIRS) {
    if (branches.includes(a) && branches.includes(b)) {
      return true
    }
  }
  return false
}

function checkHapPresence(pillars: SajuPillars): boolean {
  const YUKHAP_PAIRS: [string, string][] = SIX_HARMONY.map((h) => [h.pair[0], h.pair[1]])

  const branches = [
    pillars.year.earthlyBranch.name,
    pillars.month.earthlyBranch.name,
    pillars.day.earthlyBranch.name,
    pillars.time.earthlyBranch.name,
  ]

  for (const [a, b] of YUKHAP_PAIRS) {
    if (branches.includes(a) && branches.includes(b)) {
      return true
    }
  }
  return false
}

// ============================================================
// 용신 적합도 점수 계산
// ============================================================

/**
 * 용신 적합도 점수 계산
 */
export function calculateYongsinFitScore(
  pillars: SajuPillars,
  yongsin: FiveElement,
  strengthLevel: string
): YongsinFitScore {
  const items: ScoreItem[] = []

  // 용신 존재감 점수
  const presenceScore = calculateElementPresenceScore(pillars, yongsin, 50) * 2
  items.push({
    category: '존재감',
    name: `${yongsin} 현존`,
    score: presenceScore,
    weight: 0.4,
    description: '사주 내 용신 오행의 존재',
  })

  // 용신 유효도 (통근, 투출 여부)
  let effectiveScore = 30 // 기본 점수

  // 용신이 천간에 투출되었는지 확인
  const stems = [
    pillars.year.heavenlyStem.name,
    pillars.month.heavenlyStem.name,
    pillars.time.heavenlyStem.name,
  ]

  for (const stem of stems) {
    if (getStemElement(stem) === yongsin) {
      effectiveScore += 20
      items.push({
        category: '투출',
        name: '용신 투출',
        score: 20,
        weight: 0.3,
        description: '용신이 천간에 드러남',
      })
      break
    }
  }

  // 적합도 종합
  const fitScore = Math.round((presenceScore + effectiveScore) / 2)

  return {
    yongsin,
    fitScore: Math.min(100, fitScore),
    presenceScore: Math.min(100, presenceScore),
    effectiveScore: Math.min(100, effectiveScore),
    items,
  }
}

