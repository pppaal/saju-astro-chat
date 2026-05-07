/**
 * 메인 사주 엔진 — 한 곳에 모은 사주 계산 통합 진입점.
 *
 * 흩어져 있던 사주 모듈들을 하나의 함수 `runMainSaju(birth)` 로 묶어
 * 본명 + 강약/격국/용신 + 충합형해 + 12운성 + 신살 + 공망 + 운(대운/세운/
 * 월운/일진) 점수까지 한 번에 뽑아낸다. 점성·교차는 별도 진입점.
 */
import { calculateSajuData } from './Saju/saju'
import {
  analyzeAdvancedSaju,
  analyzeJohuYongsin,
  analyzeExtendedSaju,
} from './Saju/astrologyengine'
import { performUltraAdvancedAnalysis } from './Saju/advancedSajuCore'
import {
  analyzeTwelveStages,
  type TwelveStageAnalysis,
} from './Saju/cycle-analysis/twelveStages'
import {
  analyzePillarInteractions,
  type PillarInteractionsAnalysis,
} from './Saju/cycle-analysis/pillarInteractions'
import {
  analyzeRootedness,
  type RootednessAnalysis,
} from './Saju/cycle-analysis/rootedness'
import {
  analyzeShinsalActivation,
  type ShinsalActivationAnalysis,
} from './Saju/cycle-analysis/shinsalActivation'
import {
  analyzeGeokgukShift,
  type GeokgukShiftAnalysis,
} from './Saju/cycle-analysis/geokgukShift'
import {
  analyzeJohuShift,
  type JohuShiftAnalysis,
} from './Saju/cycle-analysis/johuShift'
import {
  analyzeHwaTransform,
  type HwaTransformAnalysis,
} from './Saju/cycle-analysis/hwaTransform'
import {
  STEM_TO_ELEMENT,
  YUKHAP,
  CHUNG,
  SAMHAP,
  XING,
  HAI,
  JIJANGGAN,
} from './Saju/constants'
import {
  calculateDaeunScore,
  calculateSeunScore,
  calculateWolunScore,
  calculateIljinScore,
  type SajuScoreInput,
  type CycleStrengthContext,
} from './destiny-map/calendar/scoring'

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
  // 삼재 자동 검출 — 본명 년지 vs 세운 지지
  if (seunRaw?.earthlyBranch) {
    seunInput.isSamjaeYear = isSamjaeYear(p.year.earthlyBranch.name, seunRaw.earthlyBranch)
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

  // 신살 활성화 결과를 scoreInputs 에 주입 (귀인/공망/역마 등이 점수에 반영)
  const natalCoreForShinsal = {
    dayStem: dayMaster,
    dayBranch: natalDayBranch,
    monthBranch: p.month.earthlyBranch.name,
  }
  if (seunRaw?.heavenlyStem && seunRaw?.earthlyBranch) {
    const seunShinsal = analyzeShinsalActivation(
      seunRaw.heavenlyStem,
      seunRaw.earthlyBranch,
      natalCoreForShinsal,
    )
    Object.assign(seunInput, injectShinsalFlags(seunShinsal.hits, 'seun'))
  }
  // 일진은 try block 안에서 만들어진 ganji가 필요 — recompute
  try {
    const t = calculateSajuData(
      target.toISOString().slice(0, 10),
      '12:00',
      input.gender,
      'solar',
      tz,
    )
    const iljinShinsal = analyzeShinsalActivation(
      t.pillars.day.heavenlyStem.name,
      t.pillars.day.earthlyBranch.name,
      natalCoreForShinsal,
    )
    Object.assign(iljinInput, injectShinsalFlags(iljinShinsal.hits, 'iljin'))
  } catch {
    // ignore
  }

  const scores = {
    daeunScore: safeScore(() => calculateDaeunScore(daeunInput)),
    seunScore: safeScore(() => calculateSeunScore(seunInput)),
    wolunScore: safeScore(() => calculateWolunScore(wolunInput)),
    iljinScore: safeScore(() => calculateIljinScore(iljinInput)),
  }

  // Score breakdown (디버그용 — 입력 자체도 노출)
  const scoreInputs = {
    daeun: daeunInput,
    seun: seunInput,
    wolun: wolunInput,
    iljin: iljinInput,
  }

  // Phase 1 정통 cycle 분석 — 12운성 + 4기둥 상호작용
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

  // 대운 cycles
  const daeunCycles =
    (dw?.list as Array<{
      age: number
      ganji?: string
      heavenlyStem?: string
      earthlyBranch?: string
    }>) || []
  const daeunsu = dw?.startAge ?? 0
  const currentDaeun = dw?.current as
    | { age: number; heavenlyStem: string; earthlyBranch: string; sibsin?: unknown }
    | undefined

  return {
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
