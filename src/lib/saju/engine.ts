/**
 * 자평력 엔진 (JaPyeong-ryeok Engine) v1.0
 * ────────────────────────────────────────
 * 자평진전 정통 + 만세력 톤 + 9차원 컴퓨터 분석
 *
 * 한 본명에 대해 가능한 모든 사주 계산을 하나의 함수 `runMainSaju()` 로 묶음.
 * 점성·교차는 별도 진입점 (main-astrology, main-cross).
 *
 * ── 9차원 cycle 분석 ──
 *   1. twelveStages       — 12운성 (cycle 천간 + 일간 + 본명 4기둥 분포)
 *   2. pillarInteractions — 4기둥 충/합/형/해/파/원진/천간합
 *   3. rootedness         — 통근/투간 (실제 발현 강도)
 *   4. shinsalActivation  — 신살 17종 (천을·역마·공망·공망풀림·공망묶임 등)
 *   5. geokgukShift       — 격국 강화/파격/호격/변질 (정격·종격·화격 모두)
 *   6. johuShift          — 한난조습 변화
 *   7. hwaTransform       — 천간합 化 (진짜/假/단순)
 *   8. samgi              — 삼기 cycle 발현 (천상/지하/인중)
 *   9. hiddenStemHap      — 지장간 잠재 합 (무의식 영역)
 *
 * ── narrative tier (시간 차별) ──
 *   인생 전체 (10 chapters) / 대운 (10 sections) / 세운 (8) /
 *   월운 (5) / 일진 (4) — 각 tier별 advice 차별화.
 *
 * ── 점수 일관성 ──
 *   분석 결과(격국변동·공망풀림·진짜化·삼기완성·삼재단계 등)를 자동으로
 *   scoreInputs 에 주입 → 점수와 narrative 가 같은 데이터를 보고 동작.
 */

/** 엔진 메타 — 모든 출력에 포함. */
export const SAJU_ENGINE_META = {
  name: '자평력',
  nameEn: 'JaPyeong-ryeok',
  version: '1.0',
  tradition: '자평진전 정통',
  dimensions: 9,
  tagline: '9차원 정통 사주 분석 엔진',
} as const
import { calculateSajuData } from './saju'
import {
  analyzeAdvancedSaju, // ⭐ 정통 wrapper (strength + geokguk + yongsin 통합)
  analyzeJohuYongsin,
  analyzeExtendedSaju,
} from './core'
import { performUltraAdvancedAnalysis } from './advanced'
import {
  analyzeTwelveStages,
  type TwelveStageAnalysis,
} from './cycle-analysis/twelveStages'
import {
  analyzePillarInteractions,
  type PillarInteractionsAnalysis,
} from './cycle-analysis/pillarInteractions'
import {
  analyzeRootedness,
  type RootednessAnalysis,
} from './cycle-analysis/rootedness'
import {
  analyzeShinsalActivation,
  type ShinsalActivationAnalysis,
} from './cycle-analysis/shinsalActivation'
import {
  analyzeGeokgukShift,
  type GeokgukShiftAnalysis,
} from './cycle-analysis/geokgukShift'
import {
  analyzeJohuShift,
  type JohuShiftAnalysis,
} from './cycle-analysis/johuShift'
import {
  analyzeHwaTransform,
  type HwaTransformAnalysis,
} from './cycle-analysis/hwaTransform'
import {
  analyzeCycleSamgi,
  type SamgiCycleAnalysis,
} from './cycle-analysis/cycleSamgi'
import {
  narrateCycle,
  type CycleNarrative,
} from './cycle-analysis/narrative'
import {
  analyzeHiddenStemHap,
  type HiddenStemHapAnalysis,
} from './cycle-analysis/hiddenStemHap'
import { getTwelveStagesForPillars } from './shinsal'
import {
  STEM_TO_ELEMENT,
  YUKHAP,
  CHUNG,
  SAMHAP,
  XING,
  HAI,
  JIJANGGAN,
} from './constants'
import {
  calculateDaeunScore,
  calculateSeunScore,
  calculateWolunScore,
  calculateIljinScore,
  type SajuScoreInput,
  type CycleStrengthContext,
} from '@/lib/matrix/calendar/scoring'

// ─────────────────────────────────────────────────────────────────
// 십신 계산 — 일간(dayMaster) 기준으로 target 천간의 십신 라벨
//   element diff 0 → 비견(same yy) / 겁재(diff)
//   element diff 1 → 식신       / 상관
//   element diff 2 → 편재       / 정재
//   element diff 3 → 편관       / 정관
//   element diff 4 → 편인       / 정인
// ─────────────────────────────────────────────────────────────────
const STEM_YIN_YANG: Record<string, '양' | '음'> = {
  甲: '양', 丙: '양', 戊: '양', 庚: '양', 壬: '양',
  乙: '음', 丁: '음', 己: '음', 辛: '음', 癸: '음',
}
const ELEMENT_ORDER: Record<string, number> = { 목: 0, 화: 1, 토: 2, 금: 3, 수: 4 }
const SIBSIN_TABLE_KO = [
  ['비견', '겁재'], // diff 0
  ['식신', '상관'], // diff 1
  ['편재', '정재'], // diff 2
  ['편관', '정관'], // diff 3
  ['편인', '정인'], // diff 4
] as const

function computeSibsinKo(dayMaster: string, targetStem: string): string | undefined {
  const dayEl = STEM_TO_ELEMENT[dayMaster as keyof typeof STEM_TO_ELEMENT]
  const targetEl = STEM_TO_ELEMENT[targetStem as keyof typeof STEM_TO_ELEMENT]
  if (!dayEl || !targetEl) return undefined
  const dayElement = String(dayEl) // 'wood'/'fire'/...
  const targetElement = String(targetEl)
  const elementMap: Record<string, string> = {
    wood: '목', fire: '화', earth: '토', metal: '금', water: '수',
    목: '목', 화: '화', 토: '토', 금: '금', 수: '수',
  }
  const dayKo = elementMap[dayElement] || dayElement
  const targetKo = elementMap[targetElement] || targetElement
  const dayIdx = ELEMENT_ORDER[dayKo]
  const targetIdx = ELEMENT_ORDER[targetKo]
  if (dayIdx === undefined || targetIdx === undefined) return undefined
  const diff = (targetIdx - dayIdx + 5) % 5
  const samePolarity = STEM_YIN_YANG[dayMaster] === STEM_YIN_YANG[targetStem]
  return SIBSIN_TABLE_KO[diff][samePolarity ? 0 : 1]
}

// 지지의 정기 천간 → 십신 계산용
function branchMainStem(branch: string): string | undefined {
  return JIJANGGAN[branch]?.['정기']
}

// ─────────────────────────────────────────────────────────────────
// 정통 강약/용신 컨텍스트 추출 — analyzer 결과를 scorer 형식으로 정규화
// ─────────────────────────────────────────────────────────────────
const ELEMENT_KO_MAP: Record<string, string> = {
  wood: '목', fire: '화', earth: '토', metal: '금', water: '수',
  Wood: '목', Fire: '화', Earth: '토', Metal: '금', Water: '수',
  목: '목', 화: '화', 토: '토', 금: '금', 수: '수',
}
function normalizeElement(el?: string): string | undefined {
  if (!el) return undefined
  return ELEMENT_KO_MAP[el] || el
}
function normalizeStrength(level?: string): CycleStrengthContext['strength'] {
  if (!level) return 'balanced'
  if (level.includes('극강') || level.includes('태강')) return 'very_strong'
  if (level.includes('극약') || level.includes('태약')) return 'very_weak'
  if (level.includes('신강') || level.includes('강')) return 'strong'
  if (level.includes('신약') || level.includes('약')) return 'weak'
  return 'balanced'
}
function stemToElementKo(stem: string): string | undefined {
  const el = STEM_TO_ELEMENT[stem as keyof typeof STEM_TO_ELEMENT]
  return el ? normalizeElement(String(el)) : undefined
}

// shinsalActivation hits → scoreInput boolean flags (iljin/seun)
function injectShinsalFlags(
  hits: Array<{ kind: string }>,
  target: 'iljin' | 'seun',
): Record<string, boolean> {
  const flags: Record<string, boolean> = {}
  const kinds = new Set(hits.map((h) => h.kind))
  if (target === 'iljin') {
    if (kinds.has('천을귀인')) flags.hasCheoneulGwiin = true
    if (kinds.has('건록')) flags.hasGeonrok = true
    if (kinds.has('역마')) flags.hasYeokma = true
    if (kinds.has('도화')) flags.hasDohwa = true
    if (kinds.has('화개')) flags.hasHwagae = true
    if (kinds.has('공망')) flags.hasGongmang = true
    if (kinds.has('원진')) flags.hasWonjin = true
    if (kinds.has('양인')) flags.hasYangin = true
    if (kinds.has('귀문관')) flags.hasGuimungwan = true
    if (kinds.has('천덕귀인')) flags.hasCheondeokGwiin = true
    if (kinds.has('월덕귀인')) flags.hasWoldeokGwiin = true
  }
  if (target === 'seun') {
    // 삼재 상쇄용 — 천을/천덕/월덕 어느 하나라도 있으면 귀인
    if (kinds.has('천을귀인') || kinds.has('천덕귀인') || kinds.has('월덕귀인')) {
      flags.hasGwiin = true
    }
  }
  return flags
}

// 양인 자리 검사 — 일간별 양인 지지 (양인격 특수 룰용)
const YANGIN_BY_DAY_STEM: Record<string, string> = {
  甲: '卯', 乙: '辰', 丙: '午', 丁: '未', 戊: '午',
  己: '未', 庚: '酉', 辛: '戌', 壬: '子', 癸: '丑',
}

// 삼재: 본명 년지 → 12년 주기 3년 흉년
const SAMJAE_BY_YEAR_BRANCH: Record<string, string[]> = {
  寅: ['申', '酉', '戌'], 午: ['申', '酉', '戌'], 戌: ['申', '酉', '戌'],
  巳: ['寅', '卯', '辰'], 酉: ['寅', '卯', '辰'], 丑: ['寅', '卯', '辰'],
  申: ['巳', '午', '未'], 子: ['巳', '午', '未'], 辰: ['巳', '午', '未'],
  亥: ['亥', '子', '丑'], 卯: ['亥', '子', '丑'], 未: ['亥', '子', '丑'],
}
function isSamjaeYear(natalYearBranch: string, seunBranch: string): boolean {
  const samjae = SAMJAE_BY_YEAR_BRANCH[natalYearBranch]
  return samjae?.includes(seunBranch) ?? false
}

/**
 * 삼재 단계 판정 — 정통: 3년 중 어느 해인지로 강도 다름.
 *   1년차 = 들어삼재 (입삼재): 조심 단계, 변화 시작
 *   2년차 = 누운삼재 (눌삼재): 정점 흉, 가장 무거움
 *   3년차 = 나는삼재 (출삼재): 풀려가는 단계
 */
function getSamjaePhase(
  natalYearBranch: string,
  seunBranch: string,
): 'enter' | 'middle' | 'exit' | undefined {
  const samjae = SAMJAE_BY_YEAR_BRANCH[natalYearBranch]
  if (!samjae) return undefined
  const idx = samjae.indexOf(seunBranch)
  if (idx === 0) return 'enter'
  if (idx === 1) return 'middle'
  if (idx === 2) return 'exit'
  return undefined
}

// ─────────────────────────────────────────────────────────────────
// 십신 한글 ↔ scorer 라벨 매핑
// ─────────────────────────────────────────────────────────────────
const SIBSIN_KO_TO_LABEL: Record<string, string> = {
  정인: 'inseong',
  편인: 'inseong',
  정재: 'jaeseong',
  편재: 'jaeseong',
  비견: 'bijeon',
  겁재: 'bijeon',
  식신: 'siksang',
  상관: 'siksang',
  정관: 'gwansal',
  편관: 'gwansal',
}
function mapSibsin(ko?: string): string | undefined {
  if (!ko) return undefined
  return SIBSIN_KO_TO_LABEL[ko]
}

// ─────────────────────────────────────────────────────────────────
// 운(cycle) 입력 transformer
//   대운/세운/월운 ganji + 본명 일주에서 보이는 boolean flags 추출
// ─────────────────────────────────────────────────────────────────
function buildCycleInput(
  cycleStem: string,
  cycleBranch: string,
  cycleSibsinCheon: string | undefined,
  natalDayBranch: string,
  context: CycleStrengthContext,
): SajuScoreInput['daeun'] {
  const sibsin = mapSibsin(cycleSibsinCheon)

  // 지지합 (육합): 대운 지지 - 본명 일지
  const hasYukhap = YUKHAP[cycleBranch] === natalDayBranch

  // 지지충: 대운 지지 - 본명 일지
  const hasChung = CHUNG[cycleBranch] === natalDayBranch

  // 삼합: 대운 지지 + 본명 일지가 같은 삼합국에 속하는지
  let hasSamhapPositive = false
  let hasSamhapNegative = false
  for (const [, branches] of Object.entries(SAMHAP)) {
    if (branches.includes(cycleBranch) && branches.includes(natalDayBranch)) {
      hasSamhapPositive = true
      break
    }
  }

  // 관살은 sibsin이 gwansal이면 자동 표시
  const hasGwansal = sibsin === 'gwansal'

  return {
    sibsin,
    hasYukhap,
    hasSamhapPositive,
    hasChung,
    hasGwansal,
    hasSamhapNegative,
    ...context,
    cycleStemElement: stemToElementKo(cycleStem) ?? context.cycleStemElement,
  }
}

// ─────────────────────────────────────────────────────────────────
// 일진 transformer (천간 + 지지 십신 + 신살 boolean들)
// ─────────────────────────────────────────────────────────────────
function buildIljinInput(
  iljinStem: string,
  iljinBranch: string,
  iljinSibsinCheon: string | undefined,
  iljinSibsinJi: string | undefined,
  natalDayBranch: string,
  context: CycleStrengthContext,
): SajuScoreInput['iljin'] {
  const sibsin = mapSibsin(iljinSibsinCheon)
  const branchSibsin = mapSibsin(iljinSibsinJi)

  const hasYukhap = YUKHAP[iljinBranch] === natalDayBranch
  const hasChung = CHUNG[iljinBranch] === natalDayBranch
  const hasXing = (XING[iljinBranch] || []).includes(natalDayBranch)
  const hasHai = HAI[iljinBranch] === natalDayBranch

  let hasSamhapPositive = false
  let hasSamhapNegative = false
  for (const [, branches] of Object.entries(SAMHAP)) {
    if (branches.includes(iljinBranch) && branches.includes(natalDayBranch)) {
      hasSamhapPositive = true
      break
    }
  }

  return {
    sibsin,
    branchSibsin,
    hasYukhap,
    hasSamhapPositive,
    hasSamhapNegative,
    hasChung,
    hasXing,
    hasHai,
    ...context,
    cycleStemElement: stemToElementKo(iljinStem) ?? context.cycleStemElement,
  }
}

export interface MainSajuInput {
  birthDate: string // YYYY-MM-DD
  birthTime: string // HH:mm
  gender: 'male' | 'female'
  timezone?: string // default 'Asia/Seoul'
  targetDate?: Date // 운 분석 기준일 (default 오늘)
}

export interface MainSajuOutput {
  /** 엔진 메타 (브랜드·버전·차원) */
  engine: typeof SAJU_ENGINE_META
  /** 4기둥 명식 (年/月/日/時 + 일주 정체성) */
  pillars: {
    year: { stem: string; branch: string; sibsin?: string }
    month: { stem: string; branch: string; sibsin?: string }
    day: {
      stem: string
      branch: string
      sibsin?: string
      element: string
      yinYang: string
      ganzhi: string
    }
    time: { stem: string; branch: string; sibsin?: string }
  }
  /** 오행 분포 */
  fiveElements: Record<string, number>
  /** 강약 + 격국 + 용신 + 기신 */
  advanced: {
    strength: { level: string; score: number }
    geokguk: { type: string; basis?: string }
    yongsin: { primary: string; secondary?: string; basis?: string; unfavorable?: string[] }
    johuYongsin?: { primary: string; secondary?: string; description: string; season: string }
  }
  /** 십신/지장간/12운성/공망/삼기 등 ultra-advanced */
  ultraAdvanced: ReturnType<typeof performUltraAdvancedAnalysis>
  /** 운 (cycle) — 대운/세운/월운/일진 */
  cycles: {
    daeunCycles: Array<{
      age: number
      ganji?: string
      heavenlyStem?: string
      earthlyBranch?: string
    }>
    daeunsu: number
    currentDaeun?: {
      age: number
      heavenlyStem: string
      earthlyBranch: string
      sibsin?: unknown
      /** 대운 5/5 단계 — 정통: 大運 10년 = 천간 5년 + 지지 5년 */
      phase?: 'stem' | 'branch'
      /** 현재 단계 진입 나이 */
      phaseStartAge?: number
      /** 단계 안에서의 진행도 (0-1) */
      phaseProgress?: number
    }
  }
  /** 점수 (대운/세운/월운/일진/용신) — 운 단위 점수 */
  scores: {
    daeunScore: number
    seunScore: number
    wolunScore: number
    iljinScore: number
  }
  /** cycle별 정통 분석 — Phase 1 narrative 기초 데이터 */
  cycleAnalysis: {
    daeun?: CycleEntry
    seun?: CycleEntry
    wolun?: CycleEntry
    iljin?: CycleEntry
  }
  /** Phase 2 narrative — cycleAnalysis 데이터 기반 deterministic 정통 narrative */
  narratives: {
    daeun?: CycleNarrative
    seun?: CycleNarrative
    wolun?: CycleNarrative
    iljin?: CycleNarrative
  }
  /** 인생 전체 — 대운 10개 모두에 대한 챕터 narrative + 종합 테마 */
  lifeNarrative?: {
    chapters: Array<{
      age: number // 대운 시작 나이
      ageRange: string // "32~41세"
      ganji: string // 甲戌
      isCurrent: boolean
      score: number // /8
      narrative: CycleNarrative
    }>
    summary: {
      peakChapters: Array<{ age: number; ageRange: string; ganji: string; score: number }>
      valleyChapters: Array<{ age: number; ageRange: string; ganji: string; score: number }>
      overallTheme: string
      stageThemes: Array<{ stage: string; ages: string; theme: string }>
    }
  }
  /** 점수 입력 transformer 결과 (근거 표시용) */
  scoreInputs: {
    daeun: SajuScoreInput['daeun']
    seun: SajuScoreInput['seun']
    wolun: SajuScoreInput['wolun']
    iljin: SajuScoreInput['iljin']
  }
  /** 본명 자체의 텍스트 출력 (확장 분석 narrative) */
  extended: ReturnType<typeof analyzeExtendedSaju> | null
  /** 입력 정보 */
  input: MainSajuInput
}

export interface CycleEntry {
  twelveStages: TwelveStageAnalysis
  pillarInteractions: PillarInteractionsAnalysis
  rootedness: RootednessAnalysis
  shinsalActivation: ShinsalActivationAnalysis
  geokgukShift: GeokgukShiftAnalysis
  johuShift: JohuShiftAnalysis
  hwaTransform: HwaTransformAnalysis
  samgi: SamgiCycleAnalysis
  hiddenStemHap: HiddenStemHapAnalysis
}

/**
 * 메인 사주 엔진 — 한 본명에 대해 가능한 모든 사주 계산을 실행.
 */
export function runMainSaju(input: MainSajuInput): MainSajuOutput {
  const tz = input.timezone || 'Asia/Seoul'
  const target = input.targetDate || new Date()

  // -- 1) 명식 (4기둥 + 대운 cycles + 五行 분포)
  const sajuResult = calculateSajuData(
    input.birthDate,
    input.birthTime,
    input.gender,
    'solar',
    tz,
  )
  const p = sajuResult.pillars

  const dayMaster = p.day.heavenlyStem.name
  const dayElement = STEM_TO_ELEMENT[dayMaster as keyof typeof STEM_TO_ELEMENT] || 'earth'
  const dayYinYang = p.day.heavenlyStem.yin_yang

  // -- 2) 강약 + 격국 + 용신
  // analyzeAdvancedSaju 는 core.ts 의 정통 wrapper (내부적으로
  // strength.ts + geokguk.ts + yongsin.ts 호출). 결과는
  // AdvancedSajuAnalysis = { strength, geokguk, yongsin }.
  const advanced = analyzeAdvancedSaju(
    {
      name: dayMaster,
      element: dayElement,
      yin_yang: dayYinYang,
    } as Parameters<typeof analyzeAdvancedSaju>[0],
    {
      yearPillar: sajuResult.yearPillar,
      monthPillar: sajuResult.monthPillar,
      dayPillar: sajuResult.dayPillar,
      timePillar: sajuResult.timePillar,
    } as Parameters<typeof analyzeAdvancedSaju>[1],
  )

  // -- 3) 조후 용신 (계절 기반)
  let johuYongsin: { primary: string; secondary?: string; description: string; season: string } | undefined
  try {
    const jh = analyzeJohuYongsin(dayMaster, p.month.earthlyBranch.name)
    if (jh) {
      johuYongsin = {
        primary: String(jh.primary),
        secondary: String(jh.secondary),
        description: jh.description,
        season: jh.season,
      }
    }
  } catch {
    // ignore — johu yongsin not always derivable
  }

  // -- 4) Ultra-advanced (종격, 화격, 일주 깊이, 공망 깊이, 삼기)
  // performUltraAdvancedAnalysis takes SajuPillars (uses .year/.month/.day/.time)
  const pillarsForUltra = sajuResult.pillars as Parameters<typeof performUltraAdvancedAnalysis>[0]
  const ultra = performUltraAdvancedAnalysis(pillarsForUltra)

  // -- 5) Extended saju report (격국 narrative + 운기 흐름 텍스트)
  let extended: ReturnType<typeof analyzeExtendedSaju> | null = null
  try {
    extended = analyzeExtendedSaju(
      {
        name: dayMaster,
        element: dayElement,
        yin_yang: dayYinYang,
      } as Parameters<typeof analyzeExtendedSaju>[0],
      {
        yearPillar: sajuResult.yearPillar,
        monthPillar: sajuResult.monthPillar,
        dayPillar: sajuResult.dayPillar,
        timePillar: sajuResult.timePillar,
      } as Parameters<typeof analyzeExtendedSaju>[1],
    )
  } catch {
    extended = null
  }

  // -- 6) 운 점수 — 대운/세운/월운/일진 (cycle 점수)
  // sajuResult.daeWoon.{current,list} + sajuResult.unse.{daeun,annual,monthly}
  const dw = (
    sajuResult as unknown as {
      daeWoon?: {
        startAge?: number
        isForward?: boolean
        current?: Record<string, unknown>
        list?: Array<Record<string, unknown>>
      }
    }
  ).daeWoon
  const unse =
    (sajuResult as { unse?: { daeun?: unknown[]; annual?: unknown[]; monthly?: unknown[] } })
      .unse || {}

  // 본명 일지 (기준점)
  const natalDayBranch = p.day.earthlyBranch.name

  // 정통 강약/용신 컨텍스트 — 모든 cycle 점수에 주입
  const yongsinPrimary = normalizeElement(String(advanced.yongsin.primary || ''))
  const yongsinSecondary = advanced.yongsin.secondary
    ? normalizeElement(String(advanced.yongsin.secondary))
    : undefined
  const kibsinElements = (advanced.yongsin.unfavorable as string[] | undefined)
    ?.map(normalizeElement)
    .filter((x): x is string => Boolean(x))
  const cycleContext: CycleStrengthContext = {
    strength: normalizeStrength(String(advanced.strength.level || '')),
    yongsinPrimary,
    yongsinSecondary,
    kibsinElements,
  }

  // 대운 input — sajuResult.daeWoon.current에서 ganji + 십신 추출
  const cur = dw?.current as
    | {
        heavenlyStem?: string
        earthlyBranch?: string
        sibsin?: { cheon?: string; ji?: string }
      }
    | undefined
  const daeunInput: SajuScoreInput['daeun'] = cur
    ? buildCycleInput(
        cur.heavenlyStem || '',
        cur.earthlyBranch || '',
        cur.sibsin?.cheon,
        natalDayBranch,
        cycleContext,
      )
    : ({ ...cycleContext } as SajuScoreInput['daeun'])

  // 세운 input — unse.annual[0]에서 추출 (이번해 운)
  const seunRaw = unse.annual?.[0] as
    | {
        heavenlyStem?: string
        earthlyBranch?: string
        sibsin?: { cheon?: string; ji?: string }
      }
    | undefined
  const seunInput: SajuScoreInput['seun'] = seunRaw
    ? buildCycleInput(
        seunRaw.heavenlyStem || '',
        seunRaw.earthlyBranch || '',
        seunRaw.sibsin?.cheon,
        natalDayBranch,
        cycleContext,
      )
    : ({ ...cycleContext } as SajuScoreInput['seun'])
  // 삼재 자동 검출 — 본명 년지 vs 세운 지지 (단계 포함)
  if (seunRaw?.earthlyBranch) {
    seunInput.isSamjaeYear = isSamjaeYear(p.year.earthlyBranch.name, seunRaw.earthlyBranch)
    seunInput.samjaePhase = getSamjaePhase(p.year.earthlyBranch.name, seunRaw.earthlyBranch)
  }

  // 월운 input — unse.monthly[0]
  const wolunRaw = unse.monthly?.[0] as
    | {
        heavenlyStem?: string
        earthlyBranch?: string
        sibsin?: { cheon?: string; ji?: string }
      }
    | undefined
  const wolunInput: SajuScoreInput['wolun'] = wolunRaw
    ? buildCycleInput(
        wolunRaw.heavenlyStem || '',
        wolunRaw.earthlyBranch || '',
        wolunRaw.sibsin?.cheon,
        natalDayBranch,
        cycleContext,
      )
    : ({ ...cycleContext } as SajuScoreInput['wolun'])

  // 일진 input — 오늘 ganji vs 본명 일간 십신 계산
  const iljinInput: SajuScoreInput['iljin'] = (() => {
    try {
      const todayResult = calculateSajuData(
        target.toISOString().slice(0, 10),
        '12:00',
        input.gender,
        'solar',
        tz,
      )
      const ip = todayResult.pillars.day
      const iljinStem = ip.heavenlyStem.name
      const iljinBranch = ip.earthlyBranch.name
      // 본명 일간(辛) vs 오늘 일주 천간 → 천간 십신
      const sibsinKoCheon = computeSibsinKo(dayMaster, iljinStem)
      // 본명 일간(辛) vs 오늘 일주 지지 정기 천간 → 지지 십신
      const branchStem = branchMainStem(iljinBranch)
      const sibsinKoJi = branchStem ? computeSibsinKo(dayMaster, branchStem) : undefined
      return buildIljinInput(
        iljinStem,
        iljinBranch,
        sibsinKoCheon,
        sibsinKoJi,
        natalDayBranch,
        cycleContext,
      )
    } catch {
      return { ...cycleContext } as SajuScoreInput['iljin']
    }
  })()

  // Phase 1 정통 cycle 분석 — 점수 계산 전에 미리 빌드해서 결과를 scoreInputs 에 주입
  const cycleAnalysis: MainSajuOutput['cycleAnalysis'] = {}
  const natalForInteractions = {
    year: { stem: p.year.heavenlyStem.name, branch: p.year.earthlyBranch.name },
    month: { stem: p.month.heavenlyStem.name, branch: p.month.earthlyBranch.name },
    day: { stem: dayMaster, branch: p.day.earthlyBranch.name },
    time: { stem: p.time.heavenlyStem.name, branch: p.time.earthlyBranch.name },
  }
  const natalCore = {
    dayStem: dayMaster,
    dayBranch: p.day.earthlyBranch.name,
    monthBranch: p.month.earthlyBranch.name,
    pillarBranches: {
      year: p.year.earthlyBranch.name,
      month: p.month.earthlyBranch.name,
      day: p.day.earthlyBranch.name,
      time: p.time.earthlyBranch.name,
    },
  }
  const buildCycleEntry = (stem?: string, branch?: string): CycleEntry | undefined => {
    if (!stem || !branch) return undefined
    try {
      const pi = analyzePillarInteractions(stem, branch, natalForInteractions)
      const monthEntry = pi.pillars.find((p) => p.pillar === 'month')
      const branchInterWithMonth = monthEntry?.branchRelation ?? null

      const cycleStemSibsinKo = computeSibsinKo(dayMaster, stem)
      const cycleBranchMainStem = branchMainStem(branch)
      const cycleBranchSibsinKo = cycleBranchMainStem
        ? computeSibsinKo(dayMaster, cycleBranchMainStem)
        : undefined

      return {
        twelveStages: analyzeTwelveStages(stem, branch, dayMaster, {
          year: { branch: p.year.earthlyBranch.name },
          month: { branch: p.month.earthlyBranch.name },
          day: { branch: p.day.earthlyBranch.name },
          time: { branch: p.time.earthlyBranch.name },
        }),
        pillarInteractions: pi,
        rootedness: analyzeRootedness(stem, branch, natalForInteractions),
        shinsalActivation: analyzeShinsalActivation(stem, branch, natalCore),
        geokgukShift: analyzeGeokgukShift({
          cycleStem: stem,
          cycleBranch: branch,
          cycleStemSibsin: cycleStemSibsinKo,
          cycleBranchSibsin: cycleBranchSibsinKo,
          geokgukType: String(advanced.geokguk.type || ''),
          monthBranch: p.month.earthlyBranch.name,
          branchInteractionWithMonth: branchInterWithMonth,
          cycleBranchIsYangin: YANGIN_BY_DAY_STEM[dayMaster] === branch,
        }),
        johuShift: analyzeJohuShift({
          cycleStem: stem,
          cycleBranch: branch,
          johuYongsin: johuYongsin?.primary
            ? normalizeElement(johuYongsin.primary)
            : undefined,
        }),
        hwaTransform: analyzeHwaTransform({
          cycleStem: stem,
          natalStems: {
            year: p.year.heavenlyStem.name,
            month: p.month.heavenlyStem.name,
            day: dayMaster,
            time: p.time.heavenlyStem.name,
          },
          monthBranch: p.month.earthlyBranch.name,
        }),
        samgi: analyzeCycleSamgi({
          cycleStem: stem,
          natalStems: [
            p.year.heavenlyStem.name,
            p.month.heavenlyStem.name,
            dayMaster,
            p.time.heavenlyStem.name,
          ],
        }),
        hiddenStemHap: analyzeHiddenStemHap(branch, {
          year: { branch: p.year.earthlyBranch.name },
          month: { branch: p.month.earthlyBranch.name },
          day: { branch: p.day.earthlyBranch.name },
          time: { branch: p.time.earthlyBranch.name },
        }),
      }
    } catch {
      return undefined
    }
  }
  const daeunEntry = buildCycleEntry(cur?.heavenlyStem, cur?.earthlyBranch)
  if (daeunEntry) cycleAnalysis.daeun = daeunEntry
  const seunEntry = buildCycleEntry(seunRaw?.heavenlyStem, seunRaw?.earthlyBranch)
  if (seunEntry) cycleAnalysis.seun = seunEntry
  const wolunEntry = buildCycleEntry(wolunRaw?.heavenlyStem, wolunRaw?.earthlyBranch)
  if (wolunEntry) cycleAnalysis.wolun = wolunEntry
  // 일진은 오늘 ganji 다시 계산
  try {
    const todayResult = calculateSajuData(
      target.toISOString().slice(0, 10),
      '12:00',
      input.gender,
      'solar',
      tz,
    )
    const entry = buildCycleEntry(
      todayResult.pillars.day.heavenlyStem.name,
      todayResult.pillars.day.earthlyBranch.name,
    )
    if (entry) cycleAnalysis.iljin = entry
  } catch {
    // ignore
  }

  // ── cycleAnalysis 결과 → scoreInputs 주입 (점수↔분석 일관성)
  const injectAnalysis = (
    target: SajuScoreInput['daeun'] | SajuScoreInput['seun'] | SajuScoreInput['wolun'] | SajuScoreInput['iljin'],
    entry: CycleEntry | undefined,
    cycleKind: 'iljin' | 'seun' | 'daeun' | 'wolun',
  ) => {
    if (!entry) return
    target.geokgukShift = entry.geokgukShift.shift
    target.geokgukShiftIntensity = entry.geokgukShift.intensity
    const kinds = new Set(entry.shinsalActivation.hits.map((h) => h.kind))
    if (kinds.has('공망풀림')) target.hasGongmangResolution = true
    if (kinds.has('공망묶임')) target.hasGongmangLock = true
    // 진짜 化 만 hasHwaCompletion=true (단순 합·假合은 제외)
    const hwa = entry.hwaTransform.primaryEvent
    if (hwa && hwa.quality === 'true') {
      target.hasHwaCompletion = true
    }
    if (entry.samgi.state === 'cycle_completes') target.hasSamgiCompletion = true
    // 추가: 신살을 scoreInputs flags 로 한번 더 주입 (이전 injectShinsalFlags 대체)
    Object.assign(target, injectShinsalFlags(entry.shinsalActivation.hits, cycleKind === 'seun' ? 'seun' : 'iljin'))
  }
  injectAnalysis(daeunInput, cycleAnalysis.daeun, 'daeun')
  injectAnalysis(seunInput, cycleAnalysis.seun, 'seun')
  injectAnalysis(wolunInput, cycleAnalysis.wolun, 'wolun')
  injectAnalysis(iljinInput, cycleAnalysis.iljin, 'iljin')

  // 점수 계산 (cycleAnalysis 결과 반영된 후)
  const scores = {
    daeunScore: safeScore(() => calculateDaeunScore(daeunInput)),
    seunScore: safeScore(() => calculateSeunScore(seunInput)),
    wolunScore: safeScore(() => calculateWolunScore(wolunInput)),
    iljinScore: safeScore(() => calculateIljinScore(iljinInput)),
  }
  const scoreInputs = {
    daeun: daeunInput,
    seun: seunInput,
    wolun: wolunInput,
    iljin: iljinInput,
  }

  // 대운 5/5 phase 미리 계산 — narrative 에서 사용
  const userAge = target.getFullYear() - new Date(input.birthDate).getFullYear()
  const curRaw = dw?.current as
    | { age: number; heavenlyStem: string; earthlyBranch: string; sibsin?: unknown }
    | undefined
  let daeunPhase: { phase: 'stem' | 'branch'; progress: number; phaseStartAge: number } | undefined
  if (curRaw) {
    const yearsIntoDaeun = userAge - curRaw.age
    const phase: 'stem' | 'branch' = yearsIntoDaeun < 5 ? 'stem' : 'branch'
    const phaseStartAge = phase === 'stem' ? curRaw.age : curRaw.age + 5
    const yearsIntoPhase = userAge - phaseStartAge
    const progress = Math.max(0, Math.min(1, yearsIntoPhase / 5))
    daeunPhase = { phase, progress: Math.round(progress * 100) / 100, phaseStartAge }
  }

  // Phase 2 narrative — cycleAnalysis + score 받아서 정통 narrative 생성
  const narratives: MainSajuOutput['narratives'] = {}
  const buildGanji = (stem?: string, branch?: string) =>
    stem && branch ? `${stem}${branch}` : '?'
  // 본명 12운성 분포 (일간 기준 4기둥 단계)
  const natalTwelveStages = (() => {
    try {
      return getTwelveStagesForPillars(p)
    } catch {
      return undefined
    }
  })()

  // 본명 천간 충극 검출 — 천간 4쌍 비교
  const STEM_CHUNG: Record<string, string> = {
    甲: '庚', 庚: '甲', 乙: '辛', 辛: '乙',
    丙: '壬', 壬: '丙', 丁: '癸', 癸: '丁',
  }
  const natalStems = [
    { pillar: 'year', stem: p.year.heavenlyStem.name },
    { pillar: 'month', stem: p.month.heavenlyStem.name },
    { pillar: 'day', stem: dayMaster },
    { pillar: 'time', stem: p.time.heavenlyStem.name },
  ]
  const natalStemConflicts: string[] = []
  for (let i = 0; i < natalStems.length; i++) {
    for (let j = i + 1; j < natalStems.length; j++) {
      if (STEM_CHUNG[natalStems[i].stem] === natalStems[j].stem) {
        natalStemConflicts.push(`${natalStems[i].stem}${natalStems[j].stem}충 (${natalStems[i].pillar}↔${natalStems[j].pillar})`)
      }
    }
  }

  // 본명 자체 신살 — ultra.iljuDeep 와 ultra.gongmang 에 일부 있음
  const iljuDeep = ultra.iljuDeep as
    | { iljuCharacter?: string; characteristics?: string[]; strengths?: string[]; weaknesses?: string[] }
    | undefined
  const natalShinsalKinds: string[] = []
  // 양인 / 백호 / 괴강 검사 (간단)
  const dayGanzhi = `${dayMaster}${p.day.earthlyBranch.name}`
  const BAEKHO = new Set(['戊辰', '丁丑', '丙戌', '乙未', '甲辰', '癸丑', '壬戌'])
  const GOEGANG = new Set(['庚辰', '庚戌', '壬辰', '壬戌', '戊戌'])
  if (BAEKHO.has(dayGanzhi)) natalShinsalKinds.push('백호')
  if (GOEGANG.has(dayGanzhi)) natalShinsalKinds.push('괴강')
  // 본명 천을귀인 보유 (일간 기준 본명 4기둥 지지에 천을귀인이 있는지)
  const cheoneulMap: Record<string, string[]> = {
    甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'],
    乙: ['子', '申'], 己: ['子', '申'],
    丙: ['亥', '酉'], 丁: ['亥', '酉'],
    壬: ['卯', '巳'], 癸: ['卯', '巳'],
    辛: ['寅', '午'],
  }
  const allBranches = [
    p.year.earthlyBranch.name,
    p.month.earthlyBranch.name,
    p.day.earthlyBranch.name,
    p.time.earthlyBranch.name,
  ]
  if ((cheoneulMap[dayMaster] || []).some((b) => allBranches.includes(b))) {
    natalShinsalKinds.push('천을귀인')
  }

  // 본명 보조 정보 (이중 격국 / 희신 / 보조 조후 + 본명 enrichment)
  const natalContext = {
    geokgukSecondary: (advanced.geokguk as { secondary?: string }).secondary,
    yongsinPrimary: yongsinPrimary,
    yongsinSecondary: yongsinSecondary,
    kibsinElements: kibsinElements,
    johuYongsinSecondary: johuYongsin?.secondary
      ? normalizeElement(johuYongsin.secondary)
      : undefined,
    iljuCharacter: iljuDeep?.iljuCharacter,
    iljuStrengths: iljuDeep?.strengths,
    iljuWeaknesses: iljuDeep?.weaknesses,
    natalShinsalKinds: natalShinsalKinds.length > 0 ? natalShinsalKinds : undefined,
    natalTwelveStages: natalTwelveStages,
    natalStemConflicts: natalStemConflicts.length > 0 ? natalStemConflicts : undefined,
  }
  if (cycleAnalysis.daeun && cur) {
    narratives.daeun = narrateCycle(cycleAnalysis.daeun, {
      cycleKind: 'daeun',
      cycleGanji: buildGanji(cur.heavenlyStem, cur.earthlyBranch),
      score: scores.daeunScore,
      scoreMax: 8,
      daeunPhase,
      natalContext,
    })
  }
  if (cycleAnalysis.seun && seunRaw) {
    narratives.seun = narrateCycle(cycleAnalysis.seun, {
      cycleKind: 'seun',
      cycleGanji: buildGanji(seunRaw.heavenlyStem, seunRaw.earthlyBranch),
      score: scores.seunScore,
      scoreMax: 10,
      samjaePhase: seunInput.samjaePhase,
      natalContext,
    })
  }
  if (cycleAnalysis.wolun && wolunRaw) {
    narratives.wolun = narrateCycle(cycleAnalysis.wolun, {
      cycleKind: 'wolun',
      cycleGanji: buildGanji(wolunRaw.heavenlyStem, wolunRaw.earthlyBranch),
      score: scores.wolunScore,
      scoreMax: 7,
      natalContext,
    })
  }
  if (cycleAnalysis.iljin) {
    // iljin ganji 다시 추출
    let iljinGanji = '?'
    try {
      const t = calculateSajuData(
        target.toISOString().slice(0, 10),
        '12:00',
        input.gender,
        'solar',
        tz,
      )
      iljinGanji = `${t.pillars.day.heavenlyStem.name}${t.pillars.day.earthlyBranch.name}`
    } catch {
      // ignore
    }
    narratives.iljin = narrateCycle(cycleAnalysis.iljin, {
      cycleKind: 'iljin',
      cycleGanji: iljinGanji,
      score: scores.iljinScore,
      scoreMax: 12,
      natalContext,
    })
  }

  // ── 인생 전체 narrative — 대운 10개 모두 분석 ──
  const daeunListRaw = (dw?.list as Array<{
    age: number
    ganji?: string
    heavenlyStem?: string
    earthlyBranch?: string
  }>) || []
  const lifeChapters: NonNullable<MainSajuOutput['lifeNarrative']>['chapters'] = []
  for (const c of daeunListRaw) {
    if (!c.heavenlyStem || !c.earthlyBranch) continue
    const stem = c.heavenlyStem
    const branch = c.earthlyBranch
    const ageStart = c.age
    const ageEnd = ageStart + 9
    const ganji = `${stem}${branch}`
    const isCurrent = !!curRaw && curRaw.age === ageStart

    const entry = buildCycleEntry(stem, branch)
    if (!entry) continue

    // 점수 입력 빌드
    const sibsinKo = computeSibsinKo(dayMaster, stem)
    const chapterInput = buildCycleInput(stem, branch, sibsinKo, natalDayBranch, cycleContext)
    // 분석 결과 주입
    chapterInput.geokgukShift = entry.geokgukShift.shift
    chapterInput.geokgukShiftIntensity = entry.geokgukShift.intensity
    const kinds = new Set(entry.shinsalActivation.hits.map((h) => h.kind))
    if (kinds.has('공망풀림')) chapterInput.hasGongmangResolution = true
    if (kinds.has('공망묶임')) chapterInput.hasGongmangLock = true
    const hwa = entry.hwaTransform.primaryEvent
    if (hwa && hwa.quality === 'true') chapterInput.hasHwaCompletion = true
    if (entry.samgi.state === 'cycle_completes') chapterInput.hasSamgiCompletion = true
    Object.assign(chapterInput, injectShinsalFlags(entry.shinsalActivation.hits, 'iljin'))

    const chapterScore = safeScore(() => calculateDaeunScore(chapterInput))

    // 챕터 narrative — daeunPhase 는 현재 챕터에만 의미 있음
    const chapterNarrative = narrateCycle(entry, {
      cycleKind: 'daeun',
      cycleGanji: ganji,
      score: chapterScore,
      scoreMax: 8,
      daeunPhase: isCurrent ? daeunPhase : undefined,
      natalContext,
    })

    lifeChapters.push({
      age: ageStart,
      ageRange: `${ageStart}~${ageEnd}세`,
      ganji,
      isCurrent,
      score: chapterScore,
      narrative: chapterNarrative,
    })
  }

  let lifeNarrative: MainSajuOutput['lifeNarrative']
  if (lifeChapters.length > 0) {
    const sortedByScore = [...lifeChapters].sort((a, b) => b.score - a.score)
    const peakChapters = sortedByScore.slice(0, 2).map((c) => ({
      age: c.age, ageRange: c.ageRange, ganji: c.ganji, score: c.score,
    }))
    const valleyChapters = sortedByScore.slice(-2).reverse().map((c) => ({
      age: c.age, ageRange: c.ageRange, ganji: c.ganji, score: c.score,
    }))

    // 인생 단계별 테마: 초년(0-21) / 청년(22-31) / 중년(32-41) / 장년(42-61) / 말년(62+)
    const stages: Array<{ stage: string; minAge: number; maxAge: number }> = [
      { stage: '초년', minAge: 0, maxAge: 21 },
      { stage: '청년', minAge: 22, maxAge: 31 },
      { stage: '중년', minAge: 32, maxAge: 41 },
      { stage: '장년', minAge: 42, maxAge: 61 },
      { stage: '말년', minAge: 62, maxAge: 120 },
    ]
    const stageThemes = stages.map((s) => {
      const inStage = lifeChapters.filter(
        (c) => c.age + 9 >= s.minAge && c.age <= s.maxAge,
      )
      if (inStage.length === 0) return { stage: s.stage, ages: '', theme: '데이터 없음' }
      // 십신 분포 → 우세 십신
      const sibsinCount: Record<string, number> = {}
      for (const c of inStage) {
        const sibsin = computeSibsinKo(dayMaster, c.ganji.charAt(0))
        if (!sibsin) continue
        sibsinCount[sibsin] = (sibsinCount[sibsin] || 0) + 1
      }
      const dominant = Object.entries(sibsinCount).sort((a, b) => b[1] - a[1])[0]?.[0]
      const stageThemeMap: Record<string, string> = {
        정관: '규율·학업·체계 시기',
        편관: '도전·시련·돌파 시기',
        정재: '본업 안정·재물 축적 시기',
        편재: '외향 활동·이재 시기',
        정인: '학문·도움 받음·내면 다지기',
        편인: '자기 탐구·전문 영역 시기',
        식신: '표현·창작·여유 시기',
        상관: '자기 표현·반항·비판 시기',
        비견: '독립·동료 활동 시기',
        겁재: '경쟁·손실 주의 시기',
      }
      const avgScore = inStage.reduce((s, c) => s + c.score, 0) / inStage.length
      const trendDesc = avgScore >= 6 ? '호운' : avgScore >= 4 ? '평운' : '주의기'
      const ages = `${inStage[0].age}~${inStage[inStage.length - 1].age + 9}세`
      const theme = dominant
        ? `${stageThemeMap[dominant] || dominant + ' 흐름'} (${trendDesc}, 평균 ${avgScore.toFixed(1)}/8)`
        : `${trendDesc} 흐름`
      return { stage: s.stage, ages, theme }
    }).filter((s) => s.theme !== '데이터 없음')

    // 종합 1줄
    const overallTheme = stageThemes
      .map((s) => `${s.stage}(${s.ages}) — ${s.theme}`)
      .join(' / ')

    lifeNarrative = {
      chapters: lifeChapters,
      summary: { peakChapters, valleyChapters, overallTheme, stageThemes },
    }
  }

  // 대운 cycles
  const daeunCycles =
    (dw?.list as Array<{
      age: number
      ganji?: string
      heavenlyStem?: string
      earthlyBranch?: string
    }>) || []
  const daeunsu = dw?.startAge ?? 0
  const currentDaeun: MainSajuOutput['cycles']['currentDaeun'] = curRaw
    ? {
        ...curRaw,
        phase: daeunPhase?.phase,
        phaseStartAge: daeunPhase?.phaseStartAge,
        phaseProgress: daeunPhase?.progress,
      }
    : undefined

  return {
    engine: SAJU_ENGINE_META,
    pillars: {
      year: {
        stem: p.year.heavenlyStem.name,
        branch: p.year.earthlyBranch.name,
        sibsin: p.year.heavenlyStem.sibsin,
      },
      month: {
        stem: p.month.heavenlyStem.name,
        branch: p.month.earthlyBranch.name,
        sibsin: p.month.heavenlyStem.sibsin,
      },
      day: {
        stem: dayMaster,
        branch: p.day.earthlyBranch.name,
        sibsin: p.day.heavenlyStem.sibsin,
        element: dayElement,
        yinYang: dayYinYang,
        ganzhi: `${dayMaster}${p.day.earthlyBranch.name}`,
      },
      time: {
        stem: p.time.heavenlyStem.name,
        branch: p.time.earthlyBranch.name,
        sibsin: p.time.heavenlyStem.sibsin,
      },
    },
    fiveElements:
      (sajuResult as { fiveElements?: Record<string, number> }).fiveElements || {},
    advanced: {
      strength: {
        level: String(advanced.strength.level || ''),
        score: Number((advanced.strength as { score?: number; total?: number }).score ?? 0),
      },
      geokguk: {
        type: String(advanced.geokguk.type || ''),
        basis: (advanced.geokguk as { basis?: string }).basis,
      },
      yongsin: {
        primary: String(advanced.yongsin.primary || ''),
        secondary: advanced.yongsin.secondary
          ? String(advanced.yongsin.secondary)
          : undefined,
        basis: (advanced.yongsin as { basis?: string }).basis,
        unfavorable: advanced.yongsin.unfavorable as string[] | undefined,
      },
      johuYongsin,
    },
    ultraAdvanced: ultra,
    cycles: {
      daeunCycles,
      daeunsu,
      currentDaeun,
    },
    scores,
    scoreInputs,
    cycleAnalysis,
    narratives,
    lifeNarrative,
    extended,
    input: { ...input, timezone: tz, targetDate: target },
  }
}

function safeScore(fn: () => number): number {
  try {
    const v = fn()
    return Number.isFinite(v) ? v : 0
  } catch {
    return 0
  }
}
