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
import { STEM_TO_ELEMENT } from './Saju/constants'
import {
  calculateDaeunScore,
  calculateSeunScore,
  calculateWolunScore,
  calculateIljinScore,
} from './destiny-map/calendar/scoring'

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
  /** 본명 자체의 텍스트 출력 (확장 분석 narrative) */
  extended: ReturnType<typeof analyzeExtendedSaju> | null
  /** 입력 정보 */
  input: MainSajuInput
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

  const daeunInput = (dw?.current || {}) as Parameters<typeof calculateDaeunScore>[0]
  const seunInput = ((unse.annual?.[0] as object) || {}) as Parameters<
    typeof calculateSeunScore
  >[0]
  const wolunInput = ((unse.monthly?.[0] as object) || {}) as Parameters<
    typeof calculateWolunScore
  >[0]
  // 일진은 따로 계산 필요. unse에 iljin 없으면 빈 입력.
  const iljinInput = {} as Parameters<typeof calculateIljinScore>[0]

  const scores = {
    daeunScore: safeScore(() => calculateDaeunScore(daeunInput)),
    seunScore: safeScore(() => calculateSeunScore(seunInput)),
    wolunScore: safeScore(() => calculateWolunScore(wolunInput)),
    iljinScore: safeScore(() => calculateIljinScore(iljinInput)),
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
