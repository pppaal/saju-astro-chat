// src/lib/Saju/advancedSajuCore.ts
// 사주 고급 핵심 엔진 (1000% 급 모듈)
// 종격, 화격, 일주론 심화, 공망 심화 분석
//
// ✅ REFACTORING COMPLETED:
// - Original 856 lines modularized for better maintainability
// - Types extracted to advanced-saju-core/types.ts
// - Core analysis functions remain in this orchestrator file
//
// Structure:
// - advanced-saju-core/types.ts: Type definitions
// - advanced-saju-core/index.ts: Unified exports
// - advancedSajuCore.ts: Main analysis orchestrator

import { FiveElement, SajuPillars, SibsinKind, PillarKind } from './types'
import { JIJANGGAN, FIVE_ELEMENT_RELATIONS, BRANCHES } from './constants'
import {
  getStemElement,
  getBranchElement,
  getStemYinYang,
  getStemIndex,
  getBranchIndex,
} from './stemBranchUtils'

// Re-export all types from modules
export * from './advanced-saju-core'

// Import types for internal use
import type {
  JonggeokType,
  JonggeokAnalysis,
  HwagyeokType,
  HwagyeokAnalysis,
  IljuDeepAnalysis,
  GongmangDeepAnalysis,
  SamgiAnalysis,
  AdvancedInteractionAnalysis,
  UltraAdvancedAnalysis,
} from './advanced-saju-core/types'

// ============================================================
// 분석 함수들 (기존 코드 유지)
// ============================================================

// 종격 유형 (타입은 모듈에서 import)
const JONGGEOK_TYPE_MAP = {
  비겁: '종왕격' as JonggeokType,
  인성: '종강격' as JonggeokType,
  식상: '종아격' as JonggeokType,
  재성: '종재격' as JonggeokType,
  관살: '종살격' as JonggeokType,
  대세: '종세격' as JonggeokType,
} as const

// ============================================================
// 종격 분석
// ============================================================

/**
 * 종격 판정
 */
export function analyzeJonggeok(pillars: SajuPillars): JonggeokAnalysis {
  const dayMaster = pillars.day.heavenlyStem.name
  const dayElement = getStemElement(dayMaster)

  // 오행 및 십성 카운트
  const elementCounts = countAllElements(pillars)
  const sibsinCounts = countSibsinCategories(pillars, dayElement)

  // 총합
  const total = Object.values(elementCounts).reduce((a, b) => a + b, 0)

  // 일간 오행 비율
  const dayElementRatio = elementCounts[dayElement] / total

  // 각 카테고리 비율
  const bigyeobRatio = sibsinCounts.비겁 / total
  const inseongRatio = sibsinCounts.인성 / total
  const siksangRatio = sibsinCounts.식상 / total
  const jaeseongRatio = sibsinCounts.재성 / total
  const gwanseongRatio = sibsinCounts.관성 / total

  // 종격 판정 기준: 한 카테고리가 60% 이상이고 일간이 무근(뿌리 없음)
  const hasRoot = checkDayMasterRoot(pillars, dayElement)
  const threshold = 0.55

  let type: JonggeokType = '비종격'
  let dominantElement = dayElement
  let dominantSibsin: SibsinKind[] = []
  let purity = 0

  // 종왕격 (비겁 극강)
  if (bigyeobRatio >= threshold && dayElementRatio >= 0.5) {
    type = '종왕격'
    dominantElement = dayElement
    dominantSibsin = ['비견', '겁재']
    purity = Math.round(bigyeobRatio * 100)
  }
  // 종강격 (인성 극강)
  else if (inseongRatio >= threshold) {
    type = '종강격'
    dominantElement = FIVE_ELEMENT_RELATIONS['생받는관계'][dayElement]
    dominantSibsin = ['편인', '정인']
    purity = Math.round(inseongRatio * 100)
  }
  // 종아격 (식상 극강, 일간 무근)
  else if (siksangRatio >= threshold && !hasRoot) {
    type = '종아격'
    dominantElement = FIVE_ELEMENT_RELATIONS['생하는관계'][dayElement]
    dominantSibsin = ['식신', '상관']
    purity = Math.round(siksangRatio * 100)
  }
  // 종재격 (재성 극강, 일간 무근)
  else if (jaeseongRatio >= threshold && !hasRoot) {
    type = '종재격'
    dominantElement = FIVE_ELEMENT_RELATIONS['극하는관계'][dayElement]
    dominantSibsin = ['편재', '정재']
    purity = Math.round(jaeseongRatio * 100)
  }
  // 종살격 (관살 극강, 일간 무근)
  else if (gwanseongRatio >= threshold && !hasRoot) {
    type = '종살격'
    dominantElement = FIVE_ELEMENT_RELATIONS['극받는관계'][dayElement]
    dominantSibsin = ['편관', '정관']
    purity = Math.round(gwanseongRatio * 100)
  }

  const isJonggeok = type !== '비종격'

  // 따라야 할/피해야 할 오행
  let followElement = dayElement
  let avoidElement = FIVE_ELEMENT_RELATIONS['극받는관계'][dayElement]

  if (isJonggeok) {
    followElement = dominantElement
    avoidElement = FIVE_ELEMENT_RELATIONS['극하는관계'][dominantElement]
  }

  const stability = purity > 80 ? 90 : purity > 60 ? 70 : 50
  const description = generateJonggeokDescription(type, dominantElement, purity)
  const advice = generateJonggeokAdvice(type, followElement, avoidElement)

  return {
    isJonggeok,
    type,
    dominantElement,
    dominantSibsin,
    purity,
    stability,
    description,
    followElement,
    avoidElement,
    advice,
  }
}

function countAllElements(pillars: SajuPillars): Record<FiveElement, number> {
  const counts: Record<FiveElement, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }

  const allPillars = [pillars.year, pillars.month, pillars.day, pillars.time]

  for (const pillar of allPillars) {
    // 천간
    counts[getStemElement(pillar.heavenlyStem.name)] += 1
    // 지지
    counts[getBranchElement(pillar.earthlyBranch.name)] += 0.7
    // 지장간
    const jijanggan = JIJANGGAN[pillar.earthlyBranch.name]
    if (jijanggan) {
      if (jijanggan['정기']) {
        counts[getStemElement(jijanggan['정기'])] += 0.5
      }
      if (jijanggan['중기']) {
        counts[getStemElement(jijanggan['중기'])] += 0.3
      }
      if (jijanggan['여기']) {
        counts[getStemElement(jijanggan['여기'])] += 0.2
      }
    }
  }

  return counts
}

function countSibsinCategories(
  pillars: SajuPillars,
  dayElement: FiveElement
): Record<string, number> {
  const counts = { 비겁: 0, 인성: 0, 식상: 0, 재성: 0, 관성: 0 }
  const elementCounts = countAllElements(pillars)

  // 비겁 (같은 오행)
  counts['비겁'] = elementCounts[dayElement]

  // 인성 (나를 생하는)
  counts['인성'] = elementCounts[FIVE_ELEMENT_RELATIONS['생받는관계'][dayElement]]

  // 식상 (내가 생하는)
  counts['식상'] = elementCounts[FIVE_ELEMENT_RELATIONS['생하는관계'][dayElement]]

  // 재성 (내가 극하는)
  counts['재성'] = elementCounts[FIVE_ELEMENT_RELATIONS['극하는관계'][dayElement]]

  // 관성 (나를 극하는)
  counts['관성'] = elementCounts[FIVE_ELEMENT_RELATIONS['극받는관계'][dayElement]]

  return counts
}

function checkDayMasterRoot(pillars: SajuPillars, dayElement: FiveElement): boolean {
  const branches = [
    pillars.year.earthlyBranch.name,
    pillars.month.earthlyBranch.name,
    pillars.day.earthlyBranch.name,
    pillars.time.earthlyBranch.name,
  ]

  for (const branch of branches) {
    const jijanggan = JIJANGGAN[branch]
    if (jijanggan) {
      for (const stem of Object.values(jijanggan)) {
        if (getStemElement(stem) === dayElement) {
          return true
        }
      }
    }
  }

  return false
}

function generateJonggeokDescription(
  type: JonggeokType,
  element: FiveElement,
  purity: number
): string {
  if (type === '비종격') {
    return '정격 사주로, 일반적인 격국 분석을 따릅니다.'
  }

  const typeDesc: Record<JonggeokType, string> = {
    종왕격: '비겁이 강하여 일간의 세력을 따르는 구조입니다. 독립심과 자존심이 강합니다.',
    종강격: '인성이 강하여 학문과 정신적 성장을 추구하는 구조입니다.',
    종아격: '식상이 강하여 재능과 표현력을 따르는 구조입니다. 창의적 분야에 적합합니다.',
    종재격: '재성이 강하여 재물과 실용을 따르는 구조입니다. 사업 수완이 좋습니다.',
    종살격: '관살이 강하여 권력과 명예를 따르는 구조입니다. 조직에서 두각을 나타냅니다.',
    종세격: '한 오행이 대세를 이루어 그 기운을 따라야 합니다.',
    비종격: '',
  }

  return `${type}(순수도 ${purity}%): ${typeDesc[type]} 주도 오행은 ${element}입니다.`
}

function generateJonggeokAdvice(
  type: JonggeokType,
  follow: FiveElement,
  avoid: FiveElement
): string {
  if (type === '비종격') {
    return '용신에 따라 균형 있는 생활을 권장합니다.'
  }

  return `${follow} 오행을 따르고 ${avoid} 오행을 피하세요. 대세를 거스르지 말고 순응하는 것이 좋습니다.`
}

// ============================================================
// 화격 분석
// ============================================================

/** 천간합 화 */
const STEM_HAP_HWA: Record<string, { partner: string; result: FiveElement }> = {
  甲: { partner: '己', result: '토' },
  己: { partner: '甲', result: '토' },
  乙: { partner: '庚', result: '금' },
  庚: { partner: '乙', result: '금' },
  丙: { partner: '辛', result: '수' },
  辛: { partner: '丙', result: '수' },
  丁: { partner: '壬', result: '목' },
  壬: { partner: '丁', result: '목' },
  戊: { partner: '癸', result: '화' },
  癸: { partner: '戊', result: '화' },
}

/**
 * 화격 분석
 */
export function analyzeHwagyeok(pillars: SajuPillars): HwagyeokAnalysis {
  const stems = [
    pillars.year.heavenlyStem.name,
    pillars.month.heavenlyStem.name,
    pillars.day.heavenlyStem.name,
    pillars.time.heavenlyStem.name,
  ]

  // 일간 기준 합 찾기
  const dayMaster = stems[2]
  const hapInfo = STEM_HAP_HWA[dayMaster]

  if (!hapInfo) {
    return createNonHwagyeokResult()
  }

  // 합 상대 찾기
  const hasPartner = stems.includes(hapInfo.partner)

  if (!hasPartner) {
    return createNonHwagyeokResult()
  }

  const originalElements: [FiveElement, FiveElement] = [
    getStemElement(dayMaster),
    getStemElement(hapInfo.partner),
  ]
  const transformedElement = hapInfo.result

  // 화 성립 조건 검토
  const seasonSupport = checkSeasonSupport(pillars.month.earthlyBranch.name, transformedElement)
  const branchSupport = checkBranchSupport(pillars, transformedElement)
  const noDisturbance = checkNoDisturbance(stems, dayMaster, hapInfo.partner)

  const transformSuccess = seasonSupport && branchSupport && noDisturbance

  const type = getHwagyeokType(dayMaster, hapInfo.partner)

  const description = transformSuccess
    ? `${type}이 성립하여 ${transformedElement}의 기운으로 변화합니다.`
    : `${type}의 조건이 있으나 완전한 화는 이루어지지 않습니다.`

  const implications = transformSuccess
    ? [
        `일간이 ${transformedElement}의 성질을 띱니다`,
        '융합과 화합의 능력이 뛰어납니다',
        '변화와 적응에 강합니다',
      ]
    : ['합의 기운이 있으나 본래 성질이 유지됩니다']

  return {
    isHwagyeok: transformSuccess,
    type,
    originalElements,
    transformedElement,
    transformSuccess,
    conditions: { seasonSupport, branchSupport, noDisturbance },
    description,
    implications,
  }
}

function createNonHwagyeokResult(): HwagyeokAnalysis {
  return {
    isHwagyeok: false,
    type: '비화격',
    originalElements: ['토', '토'],
    transformedElement: '토',
    transformSuccess: false,
    conditions: { seasonSupport: false, branchSupport: false, noDisturbance: true },
    description: '천간합이 없어 화격에 해당하지 않습니다.',
    implications: [],
  }
}

function checkSeasonSupport(monthBranch: string, targetElement: FiveElement): boolean {
  const branchElement = getBranchElement(monthBranch)
  return (
    branchElement === targetElement ||
    FIVE_ELEMENT_RELATIONS['생받는관계'][targetElement] === branchElement
  )
}

function checkBranchSupport(pillars: SajuPillars, targetElement: FiveElement): boolean {
  const branches = [
    pillars.year.earthlyBranch.name,
    pillars.month.earthlyBranch.name,
    pillars.day.earthlyBranch.name,
    pillars.time.earthlyBranch.name,
  ]

  let support = 0
  for (const branch of branches) {
    if (getBranchElement(branch) === targetElement) {
      support++
    }
  }

  return support >= 2
}

function checkNoDisturbance(stems: string[], stem1: string, stem2: string): boolean {
  // 충극하는 간지가 없어야 함 (간략화)
  return true
}

function getHwagyeokType(stem1: string, stem2: string): HwagyeokType {
  const pair = [stem1, stem2].sort().join('')
  const types: Record<string, HwagyeokType> = {
    己甲: '갑기합화토',
    乙庚: '을경합화금',
    丙辛: '병신합화수',
    丁壬: '정임합화목',
    戊癸: '무계합화화',
  }
  return types[pair] || '비화격'
}

// ============================================================
// 일주론 심화 분석
// ============================================================

/** 60갑자 일주 특성 */
const ILJU_CHARACTERISTICS: Record<
  string,
  {
    character: string
    strengths: string[]
    weaknesses: string[]
    career: string[]
    relationship: string
  }
> = {
  甲子: {
    character: '창의적이고 독립적인 리더형',
    strengths: ['리더십', '창의력', '선구자적 기질'],
    weaknesses: ['고집', '독단적'],
    career: ['경영자', '창업가', '연구원'],
    relationship: '주도적이지만 배려가 필요',
  },
  甲寅: {
    character: '진취적이고 야심찬 성격',
    strengths: ['추진력', '용기', '성취욕'],
    weaknesses: ['성급함', '과욕'],
    career: ['사업가', '운동선수', '정치인'],
    relationship: '열정적이고 헌신적',
  },
  乙丑: {
    character: '온화하면서도 끈기 있는 성격',
    strengths: ['인내심', '성실함', '협조성'],
    weaknesses: ['우유부단', '소극적'],
    career: ['교육자', '상담사', '예술가'],
    relationship: '헌신적이고 안정 추구',
  },
  // ... 나머지 58개 일주 (간략화)
}

/**
 * 일주론 심화 분석
 */
export function analyzeIljuDeep(pillars: SajuPillars): IljuDeepAnalysis {
  const dayMaster = pillars.day.heavenlyStem.name
  const dayBranch = pillars.day.earthlyBranch.name
  const ilju = dayMaster + dayBranch

  // 지장간
  const jijanggan = JIJANGGAN[dayBranch] || {}
  const hiddenStems = Object.values(jijanggan)

  // 일주 특성 (기본값 제공)
  const iljuInfo = ILJU_CHARACTERISTICS[ilju] || {
    character: `${dayMaster} 일간의 ${dayBranch} 지지 조합`,
    strengths: [getStemElement(dayMaster) + '의 강점'],
    weaknesses: ['주의 필요'],
    career: ['다양한 분야'],
    relationship: '균형 잡힌 관계',
  }

  // 12운성
  const twelveStage = calculateTwelveStage(dayMaster, dayBranch)

  // 공망
  const gongmang = calculateGongmang(
    pillars.year.heavenlyStem.name,
    pillars.year.earthlyBranch.name
  )

  // 납음
  const naeum = calculateNaeum(dayMaster, dayBranch)

  // 지장간 십성
  const jijangganSibsin = hiddenStems.map((stem) => calculateSibsin(dayMaster, stem))

  // 건강 포커스
  const healthFocus = getHealthFocus(getStemElement(dayMaster))

  // 행운 요소
  const luckyFactors = getLuckyFactors(getStemElement(dayMaster))

  return {
    ilju,
    dayMaster,
    dayBranch,
    naeum,
    iljuCharacter: iljuInfo.character,
    hiddenStems,
    sibsinRelation: {
      jijangganSibsin,
      dominantRelation: jijangganSibsin[0] || '비견',
    },
    twelveStage,
    gongmang,
    characteristics: [iljuInfo.character],
    strengths: iljuInfo.strengths,
    weaknesses: iljuInfo.weaknesses,
    careerAptitude: iljuInfo.career,
    relationshipStyle: iljuInfo.relationship,
    healthFocus,
    luckyFactors,
  }
}

function calculateTwelveStage(dayStem: string, branch: string): string {
  const stages = ['장생', '목욕', '관대', '임관', '왕지', '쇠', '병', '사', '묘', '절', '태', '양']
  const startPoints: Record<string, number> = {
    甲: 2,
    乙: 5,
    丙: 2,
    丁: 5,
    戊: 2,
    己: 5,
    庚: 8,
    辛: 11,
    壬: 8,
    癸: 11,
  }

  const branchIndex = getBranchIndex(branch)
  const startIndex = startPoints[dayStem] || 0
  const stageIndex = (branchIndex - startIndex + 12) % 12

  return stages[stageIndex]
}

function calculateGongmang(yearStem: string, yearBranch: string): string[] {
  const stemIndex = getStemIndex(yearStem)
  const branchIndex = getBranchIndex(yearBranch)

  // 간략화된 공망 계산
  const gongmangStart = (10 - stemIndex + branchIndex) % 12
  const gongmang1 = BRANCHES[gongmangStart % 12].name
  const gongmang2 = BRANCHES[(gongmangStart + 1) % 12].name

  return [gongmang1, gongmang2]
}

function calculateNaeum(stem: string, branch: string): string {
  // 60갑자 납음 (간략화)
  const naeumMap: Record<string, string> = {
    甲子: '海中金',
    甲寅: '大溪水',
    甲辰: '覆燈火',
    甲午: '沙中金',
    甲申: '泉中水',
    甲戌: '山頭火',
    乙丑: '海中金',
    乙卯: '大溪水',
    乙巳: '覆燈火',
    // ... 나머지
  }

  return naeumMap[stem + branch] || '미정'
}

function calculateSibsin(dayMaster: string, targetStem: string): SibsinKind {
  const dayElement = getStemElement(dayMaster)
  const targetElement = getStemElement(targetStem)
  const dayYinYang = getStemYinYang(dayMaster)
  const targetYinYang = getStemYinYang(targetStem)
  const sameYinYang = dayYinYang === targetYinYang

  if (dayElement === targetElement) {
    return sameYinYang ? '비견' : '겁재'
  }
  if (FIVE_ELEMENT_RELATIONS['생받는관계'][dayElement] === targetElement) {
    return sameYinYang ? '편인' : '정인'
  }
  if (FIVE_ELEMENT_RELATIONS['생하는관계'][dayElement] === targetElement) {
    return sameYinYang ? '식신' : '상관'
  }
  if (FIVE_ELEMENT_RELATIONS['극하는관계'][dayElement] === targetElement) {
    return sameYinYang ? '편재' : '정재'
  }
  if (FIVE_ELEMENT_RELATIONS['극받는관계'][dayElement] === targetElement) {
    return sameYinYang ? '편관' : '정관'
  }

  return '비견'
}

function getHealthFocus(element: FiveElement): string[] {
  const health: Record<FiveElement, string[]> = {
    목: ['간', '담', '눈', '근육'],
    화: ['심장', '소장', '혀', '혈관'],
    토: ['비장', '위장', '입', '살'],
    금: ['폐', '대장', '코', '피부'],
    수: ['신장', '방광', '귀', '뼈'],
  }
  return health[element]
}

function getLuckyFactors(element: FiveElement): {
  direction: string
  color: string
  number: number[]
} {
  const factors: Record<FiveElement, { direction: string; color: string; number: number[] }> = {
    목: { direction: '동쪽', color: '청색/녹색', number: [3, 8] },
    화: { direction: '남쪽', color: '적색', number: [2, 7] },
    토: { direction: '중앙', color: '황색', number: [5, 10] },
    금: { direction: '서쪽', color: '백색', number: [4, 9] },
    수: { direction: '북쪽', color: '흑색', number: [1, 6] },
  }
  return factors[element]
}

// ============================================================
// 공망 심화 분석
// ============================================================

/**
 * 공망 심화 분석
 */
export function analyzeGongmangDeep(pillars: SajuPillars): GongmangDeepAnalysis {
  const gongmangBranches = calculateGongmang(
    pillars.year.heavenlyStem.name,
    pillars.year.earthlyBranch.name
  )

  const branches = [
    { pillar: 'year' as PillarKind, branch: pillars.year.earthlyBranch.name },
    { pillar: 'month' as PillarKind, branch: pillars.month.earthlyBranch.name },
    { pillar: 'day' as PillarKind, branch: pillars.day.earthlyBranch.name },
    { pillar: 'time' as PillarKind, branch: pillars.time.earthlyBranch.name },
  ]

  const affectedPillars = branches
    .filter((b) => gongmangBranches.includes(b.branch))
    .map((b) => b.pillar)

  // 공망 유형 판정
  let type: GongmangDeepAnalysis['type'] = '가공'

  if (affectedPillars.length === 0) {
    type = '해공' // 공망이 사주에 없음
  } else if (affectedPillars.includes('day')) {
    type = '진공' // 일지가 공망
  } else if (hasChungOrHap(pillars, gongmangBranches)) {
    type = '반공' // 충이나 합으로 해소
  }

  const interpretation = generateGongmangInterpretation(type, affectedPillars)

  const effects = {
    positive: ['집착에서 벗어남', '초월적 관점', '영적 성장'],
    negative: affectedPillars.length > 0 ? ['해당 영역의 불안정', '채워지지 않는 느낌'] : [],
  }

  const remedy = ['공망 지지의 오행을 보강', '명상과 내면 탐구', '봉사활동으로 마음 채우기']

  return {
    gongmangBranches,
    affectedPillars,
    type,
    interpretation,
    effects,
    remedy,
  }
}

function hasChungOrHap(pillars: SajuPillars, gongmangBranches: string[]): boolean {
  // 간략화: 충이나 합 여부만 확인
  return false
}

function generateGongmangInterpretation(
  type: GongmangDeepAnalysis['type'],
  affected: PillarKind[]
): string {
  const pillarMeanings: Record<PillarKind, string> = {
    year: '조상/사회',
    month: '부모/직업',
    day: '배우자/자신',
    time: '자녀/말년',
  }

  if (type === '해공') {
    return '공망이 사주에 직접 작용하지 않아 영향이 적습니다.'
  }

  const areas = affected.map((p) => pillarMeanings[p]).join(', ')
  return `${type}으로 ${areas} 영역에서 공허함이나 초월적 경향이 나타날 수 있습니다.`
}

// ============================================================
// 삼기 분석
// ============================================================

/**
 * 삼기 (三奇) 분석
 */
export function analyzeSamgi(pillars: SajuPillars): SamgiAnalysis {
  const stems = [
    pillars.year.heavenlyStem.name,
    pillars.month.heavenlyStem.name,
    pillars.day.heavenlyStem.name,
    pillars.time.heavenlyStem.name,
  ]

  // 천상삼기: 甲戊庚
  const hasCheonSamgi = ['甲', '戊', '庚'].every((s) => stems.includes(s))

  // 지하삼기: 乙丙丁
  const hasJiSamgi = ['乙', '丙', '丁'].every((s) => stems.includes(s))

  // 인중삼기: 壬癸辛
  const hasInSamgi = ['壬', '癸', '辛'].every((s) => stems.includes(s))

  if (hasCheonSamgi) {
    return {
      hasSamgi: true,
      type: '천상삼기',
      stems: ['甲', '戊', '庚'],
      description: '천상삼기(天上三奇)가 있어 하늘의 기운을 받습니다.',
      blessing: ['리더십', '권위', '사회적 성공', '높은 지위'],
    }
  }

  if (hasJiSamgi) {
    return {
      hasSamgi: true,
      type: '지하삼기',
      stems: ['乙', '丙', '丁'],
      description: '지하삼기(地下三奇)가 있어 땅의 기운을 받습니다.',
      blessing: ['재물복', '실물 운', '안정적 성공', '물질적 풍요'],
    }
  }

  if (hasInSamgi) {
    return {
      hasSamgi: true,
      type: '인중삼기',
      stems: ['壬', '癸', '辛'],
      description: '인중삼기(人中三奇)가 있어 사람의 기운을 받습니다.',
      blessing: ['인복', '학문', '예술적 재능', '지혜'],
    }
  }

  return {
    hasSamgi: false,
    description: '삼기가 없습니다. 일반적인 격국을 따릅니다.',
    blessing: [],
  }
}

// ============================================================
// 종합 고급 분석
// ============================================================

/**
 * 종합 고급 분석
 */
export function performUltraAdvancedAnalysis(pillars: SajuPillars): UltraAdvancedAnalysis {
  const jonggeok = analyzeJonggeok(pillars)
  const hwagyeok = analyzeHwagyeok(pillars)
  const iljuDeep = analyzeIljuDeep(pillars)
  const gongmang = analyzeGongmangDeep(pillars)
  const samgi = analyzeSamgi(pillars)

  const specialFormations: string[] = []

  if (jonggeok.isJonggeok) {
    specialFormations.push(jonggeok.type)
  }
  if (hwagyeok.isHwagyeok) {
    specialFormations.push(hwagyeok.type)
  }
  if (samgi.hasSamgi && samgi.type) {
    specialFormations.push(samgi.type)
  }

  const masterySummary = generateMasterySummary(jonggeok, hwagyeok, iljuDeep, samgi)

  return {
    jonggeok,
    hwagyeok,
    iljuDeep,
    gongmang,
    samgi,
    specialFormations,
    masterySummary,
  }
}

function generateMasterySummary(
  jonggeok: JonggeokAnalysis,
  hwagyeok: HwagyeokAnalysis,
  ilju: IljuDeepAnalysis,
  samgi: SamgiAnalysis
): string {
  const parts: string[] = []

  parts.push(`일주 ${ilju.ilju}(${ilju.iljuCharacter})`)

  if (jonggeok.isJonggeok) {
    parts.push(`${jonggeok.type}으로 ${jonggeok.dominantElement}을 따릅니다`)
  }

  if (hwagyeok.isHwagyeok) {
    parts.push(`${hwagyeok.type}으로 변화의 기운이 있습니다`)
  }

  if (samgi.hasSamgi) {
    parts.push(`${samgi.type}의 특별한 복이 있습니다`)
  }

  return parts.join('. ') + '.'
}
