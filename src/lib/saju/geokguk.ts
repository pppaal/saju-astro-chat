// src/lib/Saju/geokguk.ts
// 격국(格局) 판정 모듈

import { JIJANGGAN, FIVE_ELEMENT_RELATIONS } from './constants'
import { getSibseong } from './core/sibsin'
import { STEM_KO } from './ganjiKo'
import type { FiveElement, SajuPillarsInput, MaybeTimeless } from './types'
import {
  getStemElement,
  getBranchElement,
  getStemYinYang,
  normalizeStem,
  normalizeBranch,
  presentPillars,
} from './stemBranchUtils'
import { computeStrengthScore, toStrengthCoreInput } from './strengthScore'

export type GeokgukType =
  | '식신격'
  | '상관격'
  | '편재격'
  | '정재격'
  | '편관격'
  | '정관격'
  | '편인격'
  | '정인격' // 정격 8종
  | '종왕격'
  | '종강격'
  | '종아격'
  | '종재격'
  | '종살격' // 종격 5종
  | '건록격'
  | '양인격'
  | '월겁격'
  | '잡기격' // 비격 4종
  | '갑기화토격'
  | '을경화금격'
  | '병신화수격'
  | '정임화목격'
  | '무계화화격' // 화기격국 5종
  | '곡직격'
  | '염상격'
  | '가색격'
  | '종혁격'
  | '윤하격' // 특수격국 5종
  | '미정'

export interface GeokgukResult {
  primary: GeokgukType
  secondary?: GeokgukType
  category: '정격' | '종격' | '비격' | '화기격국' | '특수격국' | '미정'
  confidence: 'high' | 'medium' | 'low'
  description: string
  yongsin?: string
  gisin?: string
  // 월령 용사 폴백(투출 미확인, 월지 본기로 정한 격)임을 표시. 표시용으로는
  // 충분하지만 타이밍 엔진(성패 신호)에는 투출 정격과 동급으로 쓰지 않도록
  // determineGeokgukAdvanced 가 이 플래그를 보고 statusResult 부착을 건너뛴다.
  fallback?: boolean
}

// Re-export for backward compatibility
export type { SajuPillarsInput }

/**
 * 격국 입력 — 시주가 null/생략이면(출생시각 미상) 년·월·일 삼주로 판정한다
 * (CONVENTIONS §5, OD-5). 글자 수 임계(특수격 ≥6, 종격 ≥4·≥5, 化神 우세 ≥5)는
 * 그대로 둔다 — 개수는 시주를 더해야 늘 뿐이라, 삼주에서 성립한 외격은 어떤
 * 시주가 와도 성립한다(모르는 시주로 외격을 만들지 않는 보수 규칙).
 */
type GeokgukPillars = MaybeTimeless<SajuPillarsInput>

/** 있는 기둥의 천간(정규화). includeDay=false 면 일간 제외. */
function stemsOf(pillars: GeokgukPillars, includeDay = true): string[] {
  return presentPillars(pillars)
    .filter(([k]) => includeDay || k !== 'day')
    .map(([, p]) => normalizeStem(p.stem))
}

/** 있는 기둥의 지지(정규화). */
function branchesOf(pillars: GeokgukPillars): string[] {
  return presentPillars(pillars).map(([, p]) => normalizeBranch(p.branch))
}

// 천간 한자→한글 음 — 정본(saju/ganjiKo) 재사용.
function stemToKo(s: string): string {
  return STEM_KO[s] || s
}

// 십성 계산
type Sipsung =
  | '비견'
  | '겁재'
  | '식신'
  | '상관'
  | '편재'
  | '정재'
  | '편관'
  | '정관'
  | '편인'
  | '정인'

function getSipsung(
  dayElement: FiveElement,
  dayYinYang: '양' | '음',
  targetElement: FiveElement,
  targetYinYang: '양' | '음'
): Sipsung {
  // 십신 SSOT(core/sibsin.getSibseong) 에 위임. no-match('')는 기존 동작 보존 위해 '비견'.
  const r = getSibseong(
    { element: dayElement, yin_yang: dayYinYang },
    { element: targetElement, yin_yang: targetYinYang }
  )
  return (r || '비견') as Sipsung
}

// 월지 지장간에서 투출 확인
function getTransparentSipsung(pillars: GeokgukPillars): Sipsung | null {
  const dayS = normalizeStem(pillars.day.stem)
  const monthB = normalizeBranch(pillars.month.branch)
  const dayElement = getStemElement(dayS)
  const dayYinYang = getStemYinYang(dayS)

  const jijanggan = JIJANGGAN[monthB]
  if (!jijanggan) {
    return null
  }

  // 정기 우선, 중기, 여기 순서로 투출 확인 (일간 제외 천간)
  const order = ['정기', '중기', '여기']
  const allStems = stemsOf(pillars, false)

  for (const key of order) {
    const hiddenStem = jijanggan[key]
    if (!hiddenStem) {
      continue
    }

    // 천간에 투출되었는지 확인
    if (allStems.includes(hiddenStem)) {
      const hiddenElement = getStemElement(hiddenStem)
      const hiddenYinYang = getStemYinYang(hiddenStem)
      const sipsung = getSipsung(dayElement, dayYinYang, hiddenElement, hiddenYinYang)

      // 비견/겁재는 격국이 아님
      if (sipsung !== '비견' && sipsung !== '겁재') {
        return sipsung
      }
    }
  }

  return null
}

// 월지 정기(본기) 십신 — 투출 여부와 무관하게 월령(月令)으로 격을 잡는 폴백.
// 고전 자평: 월지 본기가 천간에 투출하지 않아도 월령 용사지신(用事之神)으로
// 격을 정한다. 비견/겁재면 건록·양인격(checkBigyeok)에서 이미 처리되므로 null.
function getMonthBranchMainSipsung(pillars: GeokgukPillars): Sipsung | null {
  const dayS = normalizeStem(pillars.day.stem)
  const monthB = normalizeBranch(pillars.month.branch)
  const main = JIJANGGAN[monthB]?.정기
  if (!main) {
    return null
  }
  const sipsung = getSipsung(
    getStemElement(dayS),
    getStemYinYang(dayS),
    getStemElement(main),
    getStemYinYang(main)
  )
  return sipsung === '비견' || sipsung === '겁재' ? null : sipsung
}

// 오행별 개수 세기
function countElements(pillars: GeokgukPillars): Record<FiveElement, number> {
  const counts: Record<FiveElement, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }

  const stems = stemsOf(pillars)
  const branches = branchesOf(pillars)

  for (const s of stems) {
    counts[getStemElement(s)]++
  }
  for (const b of branches) {
    counts[getBranchElement(b)]++
  }

  return counts
}

// 십성별 개수 세기
function countSipsung(pillars: GeokgukPillars): Record<Sipsung, number> {
  const dayS = normalizeStem(pillars.day.stem)
  const dayElement = getStemElement(dayS)
  const dayYinYang = getStemYinYang(dayS)

  const counts: Record<Sipsung, number> = {
    비견: 0,
    겁재: 0,
    식신: 0,
    상관: 0,
    편재: 0,
    정재: 0,
    편관: 0,
    정관: 0,
    편인: 0,
    정인: 0,
  }

  // 천간 (일간 제외)
  const stems = stemsOf(pillars, false)
  for (const s of stems) {
    const e = getStemElement(s)
    const y = getStemYinYang(s)
    counts[getSipsung(dayElement, dayYinYang, e, y)]++
  }

  // 지지 (본기 기준)
  const branches = branchesOf(pillars)
  for (const b of branches) {
    const nb = normalizeBranch(b)
    const jj = JIJANGGAN[nb]
    if (jj?.정기) {
      const e = getStemElement(jj.정기)
      const y = getStemYinYang(jj.정기)
      counts[getSipsung(dayElement, dayYinYang, e, y)]++
    }
  }

  return counts
}

// ───────────────────────────────────────────────────────────────────────────
// 신강/신약 판정 — 정통 자평명리 5요소 (得令·通根·得地·得勢·生扶)
// ───────────────────────────────────────────────────────────────────────────
// 강약 점수의 *유일한* 알고리즘 출처는 strengthScore.ts 의 computeStrengthScore
// (CONVENTIONS §11). 옛 코드는 같은 알고리즘을 여기 SajuPillarsInput 용으로
// 따로 재구현해 드리프트 위험이 있었으나, 이제 SSOT 코어에 위임한다.
//
// 임계: total ≥ 60 → 신강 / 40 ≤ total < 60 → 중화 / total < 40 → 신약

/**
 * 정통 자평명리 강약 종합 점수 (0~100, 50 중심).
 * strengthScore.ts 의 SSOT 코어 `computeStrengthScore` 에 위임 (CONVENTIONS §11).
 */
export function getStrengthScore(pillars: GeokgukPillars): number {
  return computeStrengthScore(toStrengthCoreInput(pillars)).total
}

/**
 * 신강·중화·신약 라벨. getStrengthScore() 점수 → 3분류.
 */
function getStrength(pillars: GeokgukPillars): '신강' | '신약' | '중화' {
  const total = getStrengthScore(pillars)
  if (total >= 60) return '신강'
  if (total < 40) return '신약'
  return '중화'
}

/**
 * 극신강·극신약 — 종격 판정에 필요. 일반 신강/신약 보다 강한 임계.
 */
function getStrengthExtreme(pillars: GeokgukPillars): '극신강' | '극신약' | null {
  const total = getStrengthScore(pillars)
  if (total >= 80) return '극신강'
  if (total <= 20) return '극신약'
  return null
}

// 십성별 개수 세기 — 지장간 정·중·여기까지 합산 (흐름 판정용).
// countSipsung() 은 지지 본기만 보지만, 종격 흐름 판정(從財·從官·從兒·從旺/從強)
// 은 적천수(滴天髓) 식 "사주 전체 기세" 평가라 中氣·餘氣까지 봐야 정확하다.
function countSipsungWithJijanggan(pillars: GeokgukPillars): Record<Sipsung, number> {
  const dayS = normalizeStem(pillars.day.stem)
  const dayElement = getStemElement(dayS)
  const dayYinYang = getStemYinYang(dayS)

  const counts: Record<Sipsung, number> = {
    비견: 0,
    겁재: 0,
    식신: 0,
    상관: 0,
    편재: 0,
    정재: 0,
    편관: 0,
    정관: 0,
    편인: 0,
    정인: 0,
  }

  // 천간 (일간 제외 3개, 시간 미상이면 2개)
  const stems = stemsOf(pillars, false)
  for (const s of stems) {
    const e = getStemElement(s)
    const y = getStemYinYang(s)
    counts[getSipsung(dayElement, dayYinYang, e, y)]++
  }

  // 지지 지장간 정·중·여기 모두 합산
  const branches = branchesOf(pillars)
  for (const b of branches) {
    const nb = normalizeBranch(b)
    const jj = JIJANGGAN[nb]
    if (!jj) continue
    for (const stem of Object.values(jj)) {
      if (!stem) continue
      const e = getStemElement(stem)
      const y = getStemYinYang(stem)
      counts[getSipsung(dayElement, dayYinYang, e, y)]++
    }
  }

  return counts
}

// 천간합 → 화신(化神) 오행 → 화신을 지지하는 월령(月令). 化氣格 판정의 단일 표 —
// evaluateHwagiGeokguk 만 쓴다 (예전 checkJonggyeok·checkHwagiGeokguk·evaluate
// 세 곳에 따로 있던 쌍 표를 하나로).
const HWAGI_DEFS: Array<{
  pair: [string, string]
  result: GeokgukType
  resultElement: FiveElement
  supportBranches: string[]
}> = [
  {
    pair: ['甲', '己'],
    result: '갑기화토격',
    resultElement: '토',
    supportBranches: ['辰', '戌', '丑', '未'],
  },
  { pair: ['乙', '庚'], result: '을경화금격', resultElement: '금', supportBranches: ['申', '酉'] },
  { pair: ['丙', '辛'], result: '병신화수격', resultElement: '수', supportBranches: ['亥', '子'] },
  { pair: ['丁', '壬'], result: '정임화목격', resultElement: '목', supportBranches: ['寅', '卯'] },
  { pair: ['戊', '癸'], result: '무계화화격', resultElement: '화', supportBranches: ['巳', '午'] },
]

/** 化神 우세 임계 — 화신 오행이 천간 + 지장간 전체(각 1점)에서 이 수 이상. */
const HWAGI_DOMINANT_MIN = 5

// 종격 판정 — 정통 적천수(滴天髓) 흐름 판정 + 수치 임계 OR 결합.
//
// (A) 수치 임계 (극신강/극신약, 80+/20-) — 4기준 점수가 극단일 때 본기 카운트로 판정
// (B) 흐름 패턴 — 일간 weight 가 30 미만이면 약, 70 초과면 강. 4기둥+지장간 합산
//     십성 카운트로 어느 오행이 사주를 지배하는지 본다. 적천수는 "수치"가 아니라
//     "기세 흐름"으로 종격을 잡는다.
//
// 흐름 패턴:
//   1. 從財格  — weight<30, 재성(편재+정재) ≥ 4 → 일간이 재성을 따라감
//   2. 從官殺格 — weight<30, 관성(편관+정관) ≥ 4 → 일간이 관성을 따라감
//   3. 從兒格  — weight<30, 식상(식신+상관) ≥ 4 → 일간이 식상을 따라감
//   4. 從旺/從強 — weight>70, 비겁+인성 ≥ 5 → 일간이 너무 강해 따를 데 없음
// (化氣格은 여기서 보지 않는다 — determineGeokguk 이 evaluateHwagiGeokguk 엄격
//  규칙으로 종격 다음에 따로 판정. 예전엔 여기서 월령 지지 없이 化氣 이름을
//  category '종격' 으로 내보냈다.)
//
// 옛 코드는 strength === '신강' (40-점 중간 임계) 만으로도 종격 후보가 되어
// 부드러운 신강 사주가 종격으로 잘못 분류되는 경향이 있었고, 그 후 80/20 으로
// 강화하니 거의 정격으로만 잡혀 종격이 사라졌다. 이번에 흐름 판정을 더해
// 두 판정 중 하나라도 매치되면 종격으로 본다.
function checkJonggyeok(pillars: GeokgukPillars): GeokgukType | null {
  const weight = getStrengthScore(pillars)
  const extreme = getStrengthExtreme(pillars)
  const baseCounts = countSipsung(pillars) // 본기 기준 (수치 임계용)
  const flowCounts = countSipsungWithJijanggan(pillars) // 지장간 합산 (흐름 판정용)

  // ─── (A) 수치 임계 — 기존 로직 ───
  if (extreme === '극신강') {
    const bigeop = baseCounts['비견'] + baseCounts['겁재']
    const insung = baseCounts['편인'] + baseCounts['정인']
    if (bigeop >= 5) return '종왕격'
    if (insung >= 4 && bigeop >= 2) return '종강격'
  }
  if (extreme === '극신약') {
    const siksang = baseCounts['식신'] + baseCounts['상관']
    const jaesung = baseCounts['편재'] + baseCounts['정재']
    const gwansung = baseCounts['편관'] + baseCounts['정관']
    if (siksang >= 4) return '종아격'
    if (jaesung >= 4) return '종재격'
    if (gwansung >= 4) return '종살격'
  }

  // ─── (B) 흐름 판정 — 적천수 식 기세 흐름 ───
  // 약한 일간은 지배 오행에 종(從)함
  if (weight < 30) {
    const siksang = flowCounts['식신'] + flowCounts['상관']
    const jaesung = flowCounts['편재'] + flowCounts['정재']
    const gwansung = flowCounts['편관'] + flowCounts['정관']
    const bigeop = flowCounts['비견'] + flowCounts['겁재']
    const insung = flowCounts['편인'] + flowCounts['정인']

    // 자원(비겁·인성)이 거의 없어야 진정한 종(從). 정통은 "통근 無 + 비겁·인성 無"
    // 를 요구. 자원 합이 2 이하일 때만 흐름 종격으로 인정 (over-reach 방지).
    const noResource = bigeop + insung <= 2

    if (noResource) {
      // 가장 압도적인 오행 그룹 선택 — 동률이면 재 > 관 > 식 순 (관성·재성 우선)
      if (jaesung >= 4 && jaesung >= gwansung && jaesung >= siksang) return '종재격'
      if (gwansung >= 4 && gwansung >= siksang) return '종살격'
      if (siksang >= 4) return '종아격'
    }
  }

  // 극강 일간은 자기 흐름에 종(從)함 (從旺/從強)
  if (weight > 70) {
    const bigeop = flowCounts['비견'] + flowCounts['겁재']
    const insung = flowCounts['편인'] + flowCounts['정인']
    const siksang = flowCounts['식신'] + flowCounts['상관']
    const jaesung = flowCounts['편재'] + flowCounts['정재']
    const gwansung = flowCounts['편관'] + flowCounts['정관']

    // 흐름 종왕/종강은 식상·재성·관성이 거의 없어야 (소모/극 받을 데 없어 자기로 종)
    const noOutlet = siksang + jaesung + gwansung <= 2

    if (noOutlet && bigeop + insung >= 5) {
      // 비겁 우세면 종왕, 인성 우세면 종강
      return bigeop >= insung ? '종왕격' : '종강격'
    }
  }

  return null
}

// 오행 존재감 합산 (지장간 정·중·여기 포함) — 化氣格 화신 우세 판정용.
// 천간 4개 + 지지 본기 4개 + 지장간 중·여기까지 모두 1점씩 합산.
function countElementPresenceWithJijanggan(pillars: GeokgukPillars, element: FiveElement): number {
  let count = 0
  for (const s of stemsOf(pillars)) {
    if (getStemElement(s) === element) count++
  }
  for (const b of branchesOf(pillars)) {
    const jj = JIJANGGAN[b]
    if (!jj) continue
    for (const stem of Object.values(jj)) {
      if (!stem) continue
      if (getStemElement(stem) === element) count++
    }
  }
  return count
}

// 비격 판정 (건록격, 양인격 등)
function checkBigyeok(pillars: GeokgukPillars): GeokgukType | null {
  const dayS = normalizeStem(pillars.day.stem)
  const monthB = normalizeBranch(pillars.month.branch)

  // 건록격: 월지가 일간의 록지
  const rokjiMap: Record<string, string> = {
    甲: '寅',
    乙: '卯',
    丙: '巳',
    丁: '午',
    戊: '巳',
    己: '午',
    庚: '申',
    辛: '酉',
    壬: '亥',
    癸: '子',
  }
  if (rokjiMap[dayS] === monthB) {
    return '건록격'
  }

  // 양인격: 월지가 일간의 양인지
  const yanginMap: Record<string, string> = {
    甲: '卯',
    丙: '午',
    戊: '午',
    庚: '酉',
    壬: '子',
  }
  if (yanginMap[dayS] === monthB) {
    return '양인격'
  }

  // 월겁격: 월지에 겁재가 있는 경우
  const jijanggan = JIJANGGAN[monthB]
  if (jijanggan?.정기) {
    const dayElement = getStemElement(dayS)
    const dayYinYang = getStemYinYang(dayS)
    const hiddenElement = getStemElement(jijanggan.정기)
    const hiddenYinYang = getStemYinYang(jijanggan.정기)
    const sipsung = getSipsung(dayElement, dayYinYang, hiddenElement, hiddenYinYang)
    if (sipsung === '겁재') {
      return '월겁격'
    }
  }

  return null
}

// 특수격국 판정 (곡직격, 염상격 등)
function checkSpecialGeokguk(pillars: GeokgukPillars): GeokgukType | null {
  const counts = countElements(pillars)
  const dayS = normalizeStem(pillars.day.stem)
  const dayElement = getStemElement(dayS)

  // 한 오행이 6개 이상이면 특수격
  for (const [element, count] of Object.entries(counts)) {
    if (count >= 6) {
      if (element === '목' && dayElement === '목') {
        return '곡직격'
      }
      if (element === '화' && dayElement === '화') {
        return '염상격'
      }
      if (element === '토' && dayElement === '토') {
        return '가색격'
      }
      if (element === '금' && dayElement === '금') {
        return '종혁격'
      }
      if (element === '수' && dayElement === '수') {
        return '윤하격'
      }
    }
  }

  return null
}

// 메인 격국 판정 함수
export function determineGeokguk(pillars: GeokgukPillars): GeokgukResult {
  // 1. 특수격국 체크
  const special = checkSpecialGeokguk(pillars)
  if (special) {
    return {
      primary: special,
      category: '특수격국',
      confidence: 'high',
      description: `${special}: 한 오행이 압도적인 특수 격국`,
      yongsin: '같은 오행 강화',
    }
  }

  // 2. 종격 체크
  const jong = checkJonggyeok(pillars)
  if (jong) {
    return {
      primary: jong,
      category: '종격',
      confidence: 'high',
      description: `${jong}: 일간이 한쪽으로 종(從)하는 격국`,
      yongsin: jong === '종왕격' || jong === '종강격' ? '비겁/인성' : '강한 오행 따름',
    }
  }

  // 3. 화기격국 체크 — evaluateHwagiGeokguk 엄격 규칙 하나만 (엔진 감사 SD-03).
  //    일간의 합 상대가 인접 월간/시간 + 월령이 화신 지지 + 파합 없음 + 화신 우세.
  //    외격(外格)이라 내격(건록·양인·정격)보다 먼저 본다. 하나라도 빠지면 정격/월령
  //    폴백으로 흘려보낸다 — 예전 checkHwagiGeokguk 은 두 천간이 *어디에든* 있고
  //    일간이 끼면 성립시켜(월령·인접 무시) 사주의 약 20% 가 화기격국이었다.
  const hwagi = evaluateHwagiGeokguk(pillars)
  if (hwagi.possible && hwagi.type) {
    return {
      primary: hwagi.type,
      category: '화기격국',
      confidence: 'medium',
      description: `${hwagi.type}: 천간합이 화(化)하는 격국`,
      yongsin: '화한 오행',
    }
  }

  // 4. 비격 체크 (건록격, 양인격)
  const bi = checkBigyeok(pillars)
  if (bi) {
    return {
      primary: bi,
      category: '비격',
      confidence: 'high',
      description: `${bi}: 월지에 비겁이 있는 격국`,
      yongsin: '재성 또는 관성',
      gisin: '비겁/인성',
    }
  }

  // 5. 정격 판정 (월지 지장간 투출)
  const transparent = getTransparentSipsung(pillars)
  if (transparent) {
    const geokgukName = `${transparent}격` as GeokgukType
    const strength = getStrength(pillars)

    let yongsin = ''
    let gisin = ''

    if (strength === '신강') {
      yongsin = '재성/관성/식상'
      gisin = '비겁/인성'
    } else if (strength === '신약') {
      yongsin = '인성/비겁'
      gisin = '재성/관성/식상'
    } else {
      yongsin = '격국에 맞는 용신'
    }

    return {
      primary: geokgukName,
      category: '정격',
      confidence: 'high',
      description: `${geokgukName}: 월지 지장간의 ${transparent}이 투출하여 형성`,
      yongsin,
      gisin,
    }
  }

  // 5b. 진술축미(土 창고)월에 정기 미투출 + 중기/여기 투출 → 잡기격(고전).
  //     5c(월령 본기 정격)보다 먼저 잡아야 잡기격이 평범한 土 정격으로
  //     뭉개지지 않는다. category '비격' 은 advanced 의 잡기격 처리와 동일하므로
  //     성패 신호(캘린더) 동작이 기존과 같다 — fallback 플래그를 달지 않는다.
  const japgi = checkJapgigyeok(pillars)
  if (japgi) {
    return {
      primary: japgi,
      category: '비격',
      confidence: 'medium',
      description: '잡기격: 진술축미월 정기 미투출, 중기/여기 투출',
      yongsin: '투출된 십성에 따라 결정',
    }
  }

  // 5c. 그 외 투출이 없을 때 — 고전 자평의 월령 용사: 월지 본기(정기) 십신으로
  //     격을 잡는다. 표시용 폴백이므로 fallback=true (타이밍 성패 신호 제외).
  const monthMain = getMonthBranchMainSipsung(pillars)
  if (monthMain) {
    const geokgukName = `${monthMain}격` as GeokgukType
    const strength = getStrength(pillars)

    let yongsin = ''
    let gisin = ''
    if (strength === '신강') {
      yongsin = '재성/관성/식상'
      gisin = '비겁/인성'
    } else if (strength === '신약') {
      yongsin = '인성/비겁'
      gisin = '재성/관성/식상'
    } else {
      yongsin = '격국에 맞는 용신'
    }

    return {
      primary: geokgukName,
      category: '정격',
      confidence: 'medium',
      fallback: true,
      description: `${geokgukName}: 월지 본기 ${monthMain}으로 격을 정함(월령 용사, 투출 미확인)`,
      yongsin,
      gisin,
    }
  }

  // 6. 판정 불가
  return {
    primary: '미정',
    category: '미정',
    confidence: 'low',
    description: '격국 판정을 위한 조건이 명확하지 않음. 전문가 상담 권장',
  }
}

// getGeokgukDescription (1줄 한국어 풀이) 제거 (2026-06-06):
// chart-dictionary/geokguk-rich.json 이 25 격국 × ko+en × 풍부 필드 (tagline /
// personality / strength / weakness / career / love / advice) SSOT. 1줄 풀이는
// lifetimeFlow.ts 의 GEOKGUK_SHORT_KO (28 격국 + 미정 완전 커버) 가 흡수.
// 옛 description fallback 은 실도달 0 이라 dead.

// ============ 고급 격국 판정 (성패/잡기격 포함) ============

/**
 * 잡기격 판정
 * 진술축미(辰戌丑未) 월에 해당하며 정기 투출이 없을 때
 */
function checkJapgigyeok(pillars: GeokgukPillars): GeokgukType | null {
  const monthB = normalizeBranch(pillars.month.branch)
  const japgiMonths = ['辰', '戌', '丑', '未']

  if (!japgiMonths.includes(monthB)) {
    return null
  }

  // 잡기월의 정기가 투출되지 않았는지 확인
  const jijanggan = JIJANGGAN[monthB]
  if (!jijanggan) {
    return null
  }

  const allStems = stemsOf(pillars, false)

  // 정기가 투출되었으면 정격
  if (jijanggan.정기 && allStems.includes(jijanggan.정기)) {
    return null // 정격으로 판정
  }

  // 중기나 여기가 투출되었으면 잡기격
  if (jijanggan.중기 && allStems.includes(jijanggan.중기)) {
    return '잡기격'
  }
  if (jijanggan.여기 && allStems.includes(jijanggan.여기)) {
    return '잡기격'
  }

  return null
}

/**
 * 격국 성패(成敗) 판정
 */
export type GeokgukStatus = '성격' | '파격' | '반성반파'

export interface GeokgukStatusResult {
  status: GeokgukStatus
  factors: {
    positive: string[] // 성격 요인
    negative: string[] // 파격 요인
  }
  description: string
}

/**
 * 정격의 성패 판정
 */
export function evaluateGeokgukStatus(
  geokguk: GeokgukType,
  pillars: GeokgukPillars
): GeokgukStatusResult {
  const positive: string[] = []
  const negative: string[] = []

  const dayS = normalizeStem(pillars.day.stem)
  const dayElement = getStemElement(dayS)
  const dayYinYang = getStemYinYang(dayS)

  // 십성별 판정 기준
  const sipsungCounts = countSipsung(pillars)

  // 격국별 성패 조건
  switch (geokguk) {
    case '식신격':
      // 성격 조건: 식신이 있고, 편인(도식)이 없어야
      if (sipsungCounts['식신'] >= 1) {
        positive.push('식신 존재')
      }
      if (sipsungCounts['편인'] === 0) {
        positive.push('편인(도식) 없음')
      } else {
        negative.push('편인(도식)이 식신을 극함')
      }
      if (sipsungCounts['편관'] >= 2) {
        negative.push('편관 과다로 식신 소모')
      }
      break

    case '상관격':
      // 성격 조건: 상관이 있고, 관성을 제어할 때
      if (sipsungCounts['상관'] >= 1) {
        positive.push('상관 존재')
      }
      if (sipsungCounts['정관'] >= 1 && sipsungCounts['상관'] >= 1) {
        negative.push('상관견관 - 관성 손상')
      }
      if (sipsungCounts['편인'] === 0) {
        positive.push('편인 없어 상관 보존')
      }
      break

    case '편재격':
      // 성격 조건: 편재가 있고, 비겁의 극이 없어야
      if (sipsungCounts['편재'] >= 1) {
        positive.push('편재 존재')
      }
      if (sipsungCounts['비견'] >= 2 || sipsungCounts['겁재'] >= 2) {
        negative.push('비겁 과다로 재성 분탈')
      }
      if (sipsungCounts['편관'] >= 1) {
        positive.push('관성이 비겁 제어')
      }
      break

    case '정재격':
      // 성격 조건: 정재가 있고, 겁재의 극이 없어야
      if (sipsungCounts['정재'] >= 1) {
        positive.push('정재 존재')
      }
      if (sipsungCounts['겁재'] >= 2) {
        negative.push('겁재 과다로 재성 분탈')
      }
      if (sipsungCounts['정관'] >= 1) {
        positive.push('관성이 비겁 제어')
      }
      break

    case '편관격':
      // 성격 조건: 편관이 있고, 식신의 제어가 있어야
      if (sipsungCounts['편관'] >= 1) {
        positive.push('편관 존재')
      }
      if (sipsungCounts['식신'] >= 1) {
        positive.push('식신이 편관 제어(식신제살)')
      }
      if (sipsungCounts['편관'] >= 3 && sipsungCounts['식신'] === 0) {
        negative.push('칠살 과다, 제어 없음')
      }
      if (sipsungCounts['편인'] >= 1) {
        negative.push('편인이 식신 파괴')
      }
      break

    case '정관격':
      // 성격 조건: 정관이 순수해야 (편관 혼잡 없음)
      if (sipsungCounts['정관'] >= 1) {
        positive.push('정관 존재')
      }
      if (sipsungCounts['편관'] >= 1) {
        negative.push('관살혼잡')
      }
      if (sipsungCounts['상관'] >= 1) {
        negative.push('상관견관')
      }
      if (sipsungCounts['정인'] >= 1) {
        positive.push('인성 보호')
      }
      break

    case '편인격':
      // 성격 조건: 편인이 있고, 재성의 파괴가 없어야
      if (sipsungCounts['편인'] >= 1) {
        positive.push('편인 존재')
      }
      if (sipsungCounts['편재'] >= 2) {
        negative.push('재성이 인성 파괴')
      }
      if (sipsungCounts['식신'] >= 1) {
        negative.push('편인도식 - 식신 손상')
      }
      break

    case '정인격':
      // 성격 조건: 정인이 있고, 재성의 파괴가 없어야
      if (sipsungCounts['정인'] >= 1) {
        positive.push('정인 존재')
      }
      if (sipsungCounts['정재'] >= 2 || sipsungCounts['편재'] >= 2) {
        negative.push('재성이 인성 파괴')
      }
      if (sipsungCounts['정관'] >= 1) {
        positive.push('관인상생')
      }
      break

    case '건록격':
    case '양인격':
    case '월겁격':
      // 비격: 관성이나 재성의 극제가 있어야
      if (sipsungCounts['정관'] >= 1 || sipsungCounts['편관'] >= 1) {
        positive.push('관성이 비겁 제어')
      }
      if (sipsungCounts['정재'] >= 1 || sipsungCounts['편재'] >= 1) {
        positive.push('재성으로 설기')
      }
      if (sipsungCounts['비견'] + sipsungCounts['겁재'] >= 4) {
        negative.push('비겁 과다로 재성 분탈 위험')
      }
      break

    default:
      positive.push('기타 격국')
  }

  // 종합 판정
  let status: GeokgukStatus
  if (negative.length === 0 && positive.length >= 2) {
    status = '성격'
  } else if (negative.length >= 2 && positive.length <= 1) {
    status = '파격'
  } else {
    status = '반성반파'
  }

  const description =
    status === '성격'
      ? '격국이 순수하게 성립하여 길한 작용'
      : status === '파격'
        ? '격국이 파손되어 흉한 작용 가능'
        : '격국이 부분적으로 성립, 희기 혼재'

  return {
    status,
    factors: { positive, negative },
    description,
  }
}

/**
 * 화기격국(化氣格) 성립 판정 — 화기격국의 *유일한* 규칙 (determineGeokguk 이 사용).
 *
 * 성립 = 다음 모두:
 *   hasHap          합을 이루는 두 천간이 모두 있다
 *   isDaymasterPart 일간이 그 합의 한쪽이다
 *   adjacentPartner 합 상대가 일간과 붙은 월간 또는 시간에 있다 (年干 은 멀어 불가)
 *   monthSupport    월령(월지)이 화신 오행을 지지한다
 *   noBreaker       화신을 극하는 오행이 천간에 2개 미만 (파합 없음)
 *   dominant        화신 오행이 천간+지장간 전체에서 5 이상 (화신 우세)
 * 일간이 낀 합이 있으면 그 합을 평가하고, 없으면 처음 발견된 합의 조건을 보고한다.
 */
export function evaluateHwagiGeokguk(pillars: GeokgukPillars): {
  possible: boolean
  type: GeokgukType | null
  conditions: {
    hasHap: boolean // 합이 있는지
    isDaymasterPart: boolean // 일간이 합의 일부인지
    adjacentPartner: boolean // 합 상대가 인접 월간/시간인지
    monthSupport: boolean // 월령이 화신 지지하는지
    noBreaker: boolean // 파합 요소 없는지
    dominant: boolean // 화신 오행이 우세한지
  }
  description: string
} {
  // 년·월·일[·시] 천간 — 시간 미상이면 시간(時干)이 없어 인접 상대는 월간만 본다.
  const stems = stemsOf(pillars)
  const dayS = stems[2]
  const timeS = pillars.time ? normalizeStem(pillars.time.stem) : null
  const monthB = normalizeBranch(pillars.month.branch)

  const present = HWAGI_DEFS.filter((d) => stems.includes(d.pair[0]) && stems.includes(d.pair[1]))
  const def = present.find((d) => d.pair.includes(dayS)) ?? present[0]

  if (!def) {
    return {
      possible: false,
      type: null,
      conditions: {
        hasHap: false,
        isDaymasterPart: false,
        adjacentPartner: false,
        monthSupport: false,
        noBreaker: false,
        dominant: false,
      },
      description: '천간합 없음',
    }
  }

  const hasHap = true
  const isDaymasterPart = def.pair.includes(dayS)
  const partner = def.pair[0] === dayS ? def.pair[1] : def.pair[0]
  const adjacentPartner = isDaymasterPart && (stems[1] === partner || timeS === partner)
  const monthSupport = def.supportBranches.includes(monthB)

  // 파합 요소 체크 (화신을 극하는 오행이 천간에 많으면 파합)
  const breakerElement = FIVE_ELEMENT_RELATIONS.극받는관계[def.resultElement]
  const breakerCount = stems.filter((st) => getStemElement(st) === breakerElement).length
  const noBreaker = breakerCount < 2

  const dominant =
    countElementPresenceWithJijanggan(pillars, def.resultElement) >= HWAGI_DOMINANT_MIN

  const possible =
    hasHap && isDaymasterPart && adjacentPartner && monthSupport && noBreaker && dominant

  const reasons = [
    !isDaymasterPart && '일간이 합에 미포함',
    isDaymasterPart && !adjacentPartner && '합 상대가 월간·시간에 없음',
    !monthSupport && '월령 미지지',
    !noBreaker && '파합 요소 존재',
    !dominant && '화신 오행 미약',
  ].filter(Boolean)

  return {
    possible,
    type: possible ? def.result : null,
    conditions: {
      hasHap,
      isDaymasterPart,
      adjacentPartner,
      monthSupport,
      noBreaker,
      dominant,
    },
    description: possible
      ? `${def.result} 성립: 인접 합, 월령이 화신을 지지, 파합 요소 없음, 화신 우세`
      : `${def.result} 미성립: ${reasons.join(', ')}`,
  }
}

/**
 * 고급 격국 판정 (성패 포함)
 */
export function determineGeokgukAdvanced(pillars: GeokgukPillars): GeokgukResult & {
  statusResult?: GeokgukStatusResult
} {
  const basicResult = determineGeokguk(pillars)

  // 잡기격 체크 추가
  if (basicResult.primary === '미정') {
    const japgi = checkJapgigyeok(pillars)
    if (japgi) {
      return {
        primary: japgi,
        category: '비격',
        confidence: 'medium',
        description: '잡기격: 진술축미월에 중기/여기가 투출',
        yongsin: '투출된 십성에 따라 결정',
      }
    }
  }

  // 성패 판정 — 단, 월령 용사 폴백(fallback)은 투출 정격이 아니므로 성패
  // 신호를 만들지 않는다(캘린더/타이밍에 동급으로 섞이지 않게). 표시용 격국
  // 이름은 그대로 유지된다.
  if (
    (basicResult.category === '정격' || basicResult.category === '비격') &&
    !basicResult.fallback
  ) {
    const statusResult = evaluateGeokgukStatus(basicResult.primary, pillars)
    return {
      ...basicResult,
      statusResult,
    }
  }

  return basicResult
}
