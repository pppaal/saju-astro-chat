/**
 * 사주 시너스트리(궁합) 공유 데이터 — 합/충/형/해/파, 삼합·방합, 오행 생극,
 * 십성/십신, 천을귀인 등 정통 명리 cross 룰 표와 leaf 헬퍼(공망·12신살·세운·
 * 한글화). 텍스트 포맷(sajuSynastryFormatter)과 구조화 facts(sajuSynastryFacts)가
 * 같은 canon 표를 공유하도록 단일 소스로 둔다.
 */

import { getGongmang as getGongmangByPillar } from '@/lib/saju/pillarLookup'
import { pickTwelveSingle } from '@/lib/saju/shinsal'
import { STEM_KO, BRANCH_KO } from '@/lib/saju/ganjiKo'
import { getYearPillarForDate, getSajuYearForDate } from '@/lib/saju/datePillars'
import {
  CHEONEUL_GWIIN_MAP,
  FIVE_ELEMENT_RELATIONS,
  JIJANGGAN,
  STEMS,
  BRANCHES,
} from '@/lib/saju/constants'

export const STEM_HAP: Record<string, { other: string; element: string }> = {
  甲: { other: '己', element: '토' },
  己: { other: '甲', element: '토' },
  乙: { other: '庚', element: '금' },
  庚: { other: '乙', element: '금' },
  丙: { other: '辛', element: '수' },
  辛: { other: '丙', element: '수' },
  丁: { other: '壬', element: '목' },
  壬: { other: '丁', element: '목' },
  戊: { other: '癸', element: '화' },
  癸: { other: '戊', element: '화' },
}

export const STEM_CHUNG: Record<string, string> = {
  甲: '庚',
  庚: '甲',
  乙: '辛',
  辛: '乙',
  丙: '壬',
  壬: '丙',
  丁: '癸',
  癸: '丁',
}

export const BRANCH_HAP: Record<string, { other: string; element: string }> = {
  子: { other: '丑', element: '토' },
  丑: { other: '子', element: '토' },
  寅: { other: '亥', element: '목' },
  亥: { other: '寅', element: '목' },
  卯: { other: '戌', element: '화' },
  戌: { other: '卯', element: '화' },
  辰: { other: '酉', element: '금' },
  酉: { other: '辰', element: '금' },
  巳: { other: '申', element: '수' },
  申: { other: '巳', element: '수' },
  午: { other: '未', element: '화' },
  未: { other: '午', element: '화' },
}

export const BRANCH_CHUNG: Record<string, string> = {
  子: '午',
  午: '子',
  丑: '未',
  未: '丑',
  寅: '申',
  申: '寅',
  卯: '酉',
  酉: '卯',
  辰: '戌',
  戌: '辰',
  巳: '亥',
  亥: '巳',
}

export const BRANCH_HAE: Record<string, string> = {
  子: '未',
  未: '子',
  丑: '午',
  午: '丑',
  寅: '巳',
  巳: '寅',
  卯: '辰',
  辰: '卯',
  申: '亥',
  亥: '申',
  酉: '戌',
  戌: '酉',
}

export const BRANCH_PA: Record<string, string> = {
  子: '酉',
  酉: '子',
  丑: '辰',
  辰: '丑',
  寅: '亥',
  亥: '寅',
  卯: '午',
  午: '卯',
  巳: '申',
  申: '巳',
  戌: '未',
  未: '戌',
}

// 형(刑) 교리는 @/lib/saju/hyeong 단일 소스(상단 import). destiny counselor 와
// 동일 교리를 공유 — 이전엔 여기에 복붙돼 있어 한쪽만 고치면 드리프트했음.

export const TRI_HAP = [
  { branches: ['申', '子', '辰'], element: '수' },
  { branches: ['亥', '卯', '未'], element: '목' },
  { branches: ['寅', '午', '戌'], element: '화' },
  { branches: ['巳', '酉', '丑'], element: '금' },
]

export const BANG_HAP = [
  { branches: ['寅', '卯', '辰'], element: '목' },
  { branches: ['巳', '午', '未'], element: '화' },
  { branches: ['申', '酉', '戌'], element: '금' },
  { branches: ['亥', '子', '丑'], element: '수' },
]

// ── 천간/지지 기본 표는 전부 constants SSOT 에서 파생(복사 금지) ──
// 예전엔 같은 표(천간→오행·지지→오행·지지 본기·천간 음양·오행 생극)를 여기서 따로 들고
// 있어 한쪽만 바뀌면 엔진과 조용히 어긋났다. tableConsistency.drift-lock 이 등가를
// 강제하던 면을 복제 제거로 닫는다(import 가 곧 잠금).
// 한자 키 전용(STEM_TO_ELEMENT 는 한글 키도 가져 키셋이 다르므로) 구조화 배열에서 파생.
export const STEM_EL: Record<string, string> = Object.fromEntries(
  STEMS.map((s) => [s.name, s.element])
)
export const BRANCH_EL: Record<string, string> = Object.fromEntries(
  BRANCHES.map((b) => [b.name, b.element])
)

// 천간 음양 — 십성 cross 계산용(같은 음양↔비견/식신/편재/편관/편인, 다른 음양↔겁재/상관/정재/정관/정인).
const STEM_YIN_YANG: Record<string, '양' | '음'> = Object.fromEntries(
  STEMS.map((s) => [s.name, s.yin_yang])
) as Record<string, '양' | '음'>

// 지지 본기 천간 (지지 십성 계산용) — JIJANGGAN 정기에서 파생.
export const BRANCH_MAIN_STEM: Record<string, string> = Object.fromEntries(
  Object.entries(JIJANGGAN).map(([branch, layers]) => [branch, layers['정기']])
)

// 오행 상생(EL_GEN)/상극(EL_KE) — constants 정본(FIVE_ELEMENT_RELATIONS)에서 파생.
const EL_GEN: Record<string, string> = FIVE_ELEMENT_RELATIONS.생하는관계
const EL_KE: Record<string, string> = FIVE_ELEMENT_RELATIONS.극하는관계

/**
 * 일간(dayStem) 기준 대상(targetStem) 의 십성(sibsin) 반환. 정재/편재 → 배우자성
 * (남자 기준 처), 정관/편관 → 배우자성 (여자 기준 부). 궁합 cross 의 핵심 신호.
 */
export function sibseongFor(dayStem: string, targetStem: string): string {
  const dayEl = STEM_EL[dayStem]
  const tgtEl = STEM_EL[targetStem]
  if (!dayEl || !tgtEl) return ''
  const sameYY = STEM_YIN_YANG[dayStem] === STEM_YIN_YANG[targetStem]
  if (dayEl === tgtEl) return sameYY ? '비견' : '겁재'
  if (EL_GEN[dayEl] === tgtEl) return sameYY ? '식신' : '상관'
  if (EL_KE[dayEl] === tgtEl) return sameYY ? '편재' : '정재'
  if (EL_KE[tgtEl] === dayEl) return sameYY ? '편관' : '정관'
  if (EL_GEN[tgtEl] === dayEl) return sameYY ? '편인' : '정인'
  return ''
}

// 오행 상극(EL_CONTROLS)/상생(EL_GENERATES) — FIVE_ELEMENT_RELATIONS 파생(위 EL_KE/EL_GEN 과 동일 정본).
export const EL_CONTROLS: Record<string, string> = FIVE_ELEMENT_RELATIONS.극하는관계
const EL_GENERATES: Record<string, string> = FIVE_ELEMENT_RELATIONS.생하는관계

// 십성 짧은 글로싱 — 관계의 질감을 LLM이 곧장 읽게.
export const SIBSIN_GLOSS: Record<string, string> = {
  비견: '대등·동지',
  겁재: '경쟁·협력',
  식신: '표현·여유',
  상관: '재능·자유분방',
  편재: '활동·욕망',
  정재: '안정·성실',
  편관: '압박·도전',
  정관: '책임·규범',
  편인: '보호·배움',
  정인: '후원·안정',
}

// 천을귀인 — constants.CHEONEUL_GWIIN_MAP(SSOT) 재사용. 로컬 복제 금지(드리프트
// 방지). 소비처는 .includes 로만 보므로 두 지지의 순서는 무관.
export const CHEONULGWIIN: Record<string, string[]> = CHEONEUL_GWIIN_MAP

const STEM_ORDER = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']

// 현재 연도의 세운 간지. 두 사람 공통 시기축.
// 입춘 경계는 절기 SSOT(datePillars)에 위임 — 예전엔 2/4 고정 근사 + Gregorian
// 필드(getFullYear/Month/Date)로 직접 산출해, 실제 입춘(연마다 2/3~2/5 변동)과
// 어긋나고 본명/월운/일진 차트의 절기 convention 과도 달랐다.
export function currentSeun(now: Date): { stem: string; branch: string; year: number } {
  const { stem, branch } = getYearPillarForDate(now)
  return { stem, branch, year: getSajuYearForDate(now) }
}

// 십성(十星) — 일간(day) 입장에서 상대 천간(other)이 무슨 십성인가.
// 같은 오행 비견/겁재 · 일간生상대 식신/상관 · 상대生일간 편인/정인 ·
// 일간克상대 편재/정재 · 상대克일간 편관/정관. 음양 같으면 편(식신 포함),
// 다르면 정(겁재·상관 포함).
export function sibsinOf(dayStem: string, otherStem: string): string | null {
  const dayEl = STEM_EL[dayStem],
    otherEl = STEM_EL[otherStem]
  if (!dayEl || !otherEl) return null
  const dayPol = STEM_ORDER.indexOf(dayStem) % 2
  const otherPol = STEM_ORDER.indexOf(otherStem) % 2
  if (dayPol < 0 || otherPol < 0) return null
  const samePol = dayPol === otherPol
  if (dayEl === otherEl) return samePol ? '비견' : '겁재'
  if (EL_GENERATES[dayEl] === otherEl) return samePol ? '식신' : '상관'
  if (EL_GENERATES[otherEl] === dayEl) return samePol ? '편인' : '정인'
  if (EL_CONTROLS[dayEl] === otherEl) return samePol ? '편재' : '정재'
  if (EL_CONTROLS[otherEl] === dayEl) return samePol ? '편관' : '정관'
  return null
}

// 공망(空亡) — 일주 기준 비어 있는 2지지. pillarLookup.getGongmang(SSOT) 위임.
export function gongmangOf(stem: string, branch: string): string[] {
  return getGongmangByPillar(`${stem}${branch}`) ?? []
}

// 12신살 — 일지 기준, 상대 지지에 라벨. shinsal.pickTwelveSingle(SSOT) 위임.
export function twelveShinsalLabel(baseBranch: string, targetBranch: string): string | null {
  return pickTwelveSingle(baseBranch, targetBranch)
}

export const PILLAR_LABELS = ['년', '월', '일', '시'] as const

// 한자 천간·지지(+合化)를 한글 발음으로 — 辛→신, 乙庚合化금→을경합화금.
// 출력만 읽기 쉽게 바꾸는 후처리(계산·로직 불변). 일간의 (금)/(목) 오행
// 글로싱은 그대로 남아 앵커 역할.
// 천간·지지 한자→한글 음은 정본(saju/ganjiKo) 재사용. 合/化 는 이 포매터 고유 키라
// spread 후 추가.
const HANJA_KO: Record<string, string> = {
  ...STEM_KO,
  ...BRANCH_KO,
  合: '합',
  化: '화',
}
export const koreanize = (s: string) =>
  s.replace(/[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥合化]/g, (c) => HANJA_KO[c] ?? c)

// 부가설명 제거 — 순수 구조 데이터만 남긴다(출력 후처리; 계산·로직 불변).
// 섹션 헤더([CRITICAL...])는 보존, 본문 라인에서만:
//   - 괄호(...) 전부 (중첩 안전) — 글로싱·뉘앙스 설명
//   - "· 통제 방향 ..." 절, "※..." 주석
//   - "활성/→ 길성 보호" 류 수식
//   - 알려진 서술형 꼬리말(자석 끌림·국 형성 설명 등)
const stripParens = (s: string): string => {
  let prev = ''
  while (prev !== s) {
    prev = s
    s = s.replace(/\s*\([^()]*\)/g, '')
  }
  return s
}
export function stripAux(text: string): string {
  return text
    .split('\n')
    .map((ln) => {
      if (/^\[(CRITICAL|IMPORTANT|참고)/.test(ln)) return ln // 섹션 헤더 보존
      let s = ln
      s = s.replace(/\s*※.*$/, '')
      s = s.replace(/\s*·\s*통제 방향.*$/, '')
      s = stripParens(s)
      s = s.replace(/\s*활성(?=\s*→|\s|$)/g, '').replace(/\s*→\s*길성 보호/g, '')
      // 알려진 서술형 꼬리말
      s = s
        .replace(/\s*—\s*자석 끌림·매력 자극.*$/, '')
        .replace(/\s*—\s*두 사람 지지가[^—]*$/, '')
        .replace(/\s*—\s*3지 중 2지[^—]*$/, '')
        .replace(/\s+적중 영역은[^—]*$/, '')
        .replace(/\s*→\s*[가-힣]+ 강\s*\/\s*[가-힣]+ 약\s*$/, '')
      s = s.replace(/\s*—\s*$/, '') // 설명 제거 후 남은 꼬리 대시
      s = s.replace(/\s{2,}/g, ' ').replace(/\s+$/, '')
      return s
    })
    .join('\n')
}

export interface SajuPillarInput {
  stem: string
  branch: string
}

export interface SajuSynastryInput {
  /** 년/월/일/시 순서 4 pillars */
  pillarsA: SajuPillarInput[]
  pillarsB: SajuPillarInput[]
  currentDaeunA?: { stem: string; branch: string; age?: number } | null
  currentDaeunB?: { stem: string; branch: string; age?: number } | null
  /** 세운 계산 기준 시각 (기본 now). 올해 세운↔두 사람 본명·대운 cross에 씀. */
  now?: Date
  /** A/B 실명. 있으면 라벨·오행·극 방향을 이름에 고정해 모델이 뒤집지 못하게 한다. */
  nameA?: string | null
  nameB?: string | null
  /**
   * 출생 시각 미상 플래그. true 면 그 사람의 시주(時, index 3)는 자정(子시) 가정으로
   * 날조된 값이라 cross(합/충/형/신살/공망)에서 통째로 제외한다. [Meta] 라인이
   * LLM 에게 "인용 금지"라 말해도, 엔진이 애초에 날조 cross 를 만들지 않는 게
   * doctrine(엔진이 판단, LLM 은 표현)에 맞다.
   */
  timeUnknownA?: boolean
  timeUnknownB?: boolean
  /** 출력 언어. 'en' 이면 한국어 라벨이 영어 응답에 새지 않게 영어로 렌더. 기본 'ko'. */
  lang?: 'ko' | 'en'
}

/**
 * 사주 synastry 라인 list를 한 string으로 반환.
 * pillars 빠지면 빈 string.
 */
