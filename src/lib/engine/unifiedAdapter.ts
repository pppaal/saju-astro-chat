/**
 * 통합 엔진 어댑터 — 옛 분석기 17개에 새 운명력(자평력+천기력+매트릭스+운명력)
 * 데이터를 주입하기 위한 슬라이스 추출기.
 *
 * 사용:
 *   const unified = await getUnifiedSlice(birthInput)
 *   getCareerAnalysis(saju, astro, lang, unified)  // 분석기에 추가 인자
 *
 * 분석기는 unified 가 있으면 새 narrative · advice 출력에 추가.
 */
import type { UnifiedOutput } from '@/lib/engine/types'
import { runUnifiedEngine } from '@/lib/engine'
import type { ThemeKind, Horizon, ThemeSignal, ThemeTiming, CrossAxes, HorizonSynthesis } from '@/lib/matrix/cross'
import type { UnifiedDomainScore } from '@/lib/engine/enrichers/scoreReconciler'
import type { MainSajuOutput, CycleEntry } from '@/lib/saju/engine'
import type { CycleNarrative } from '@/lib/saju/cycle-analysis/narrative'

export interface UnifiedBirthInput {
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
  latitude?: number
  longitude?: number
  timezone?: string
  segment?: {
    employment?: 'employed' | 'self_employed' | 'student' | 'unemployed'
    maritalStatus?: 'single' | 'married' | 'divorced'
    hasChildren?: boolean
  }
}

/** 옛 분석기 17개에 주입할 슬라이스 — 한 번 계산 후 모든 분석기에서 공유 */
export interface UnifiedSlice {
  life?: MainSajuOutput['lifeNarrative']
  narratives: { daeun?: CycleNarrative; seun?: CycleNarrative; wolun?: CycleNarrative; iljin?: CycleNarrative }
  cycleAnalysis?: { daeun?: CycleEntry; seun?: CycleEntry; wolun?: CycleEntry; iljin?: CycleEntry }
  themeMatrix: Record<ThemeKind, Record<Horizon, ThemeSignal>>
  themeTimings?: Record<ThemeKind, ThemeTiming>
  unifiedScores: Record<string, UnifiedDomainScore>
  header?: { currentChapter?: string; currentDaeun?: string; daeunPhase?: string }
  horizonSynthesis?: Record<Horizon, HorizonSynthesis>
  axes?: CrossAxes
}

/**
 * 한 번 호출해서 17 분석기 + 8 탭 모두 공유할 슬라이스 추출.
 * FreeReport.tsx 에서 한 번 호출하고 prop 으로 분석기에 전달.
 */
export async function getUnifiedSlice(
  input: UnifiedBirthInput,
): Promise<UnifiedSlice | null> {
  try {
    const out = await runUnifiedEngine({
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      gender: input.gender,
      latitude: input.latitude,
      longitude: input.longitude,
      timezone: input.timezone,
      segment: input.segment,
    })

    // matrix → 6×5 lookup 만들기
    const themeMatrix = {} as Record<ThemeKind, Record<Horizon, ThemeSignal>>
    if (out.cross?.matrix) {
      for (const cell of out.cross.matrix) {
        if (!themeMatrix[cell.theme]) {
          themeMatrix[cell.theme] = {} as Record<Horizon, ThemeSignal>
        }
        themeMatrix[cell.theme][cell.horizon] = cell.signal
      }
    }

    return {
      life: out.saju?.lifeNarrative,
      narratives: out.saju?.narratives || {},
      cycleAnalysis: out.saju?.cycleAnalysis,
      themeMatrix,
      themeTimings: out.cross?.themeTimings,
      unifiedScores: out.unified?.scores.domains || {},
      header: out.cross?.headerContext,
      horizonSynthesis: out.cross?.horizonSynthesis,
      axes: out.cross?.axes,
    }
  } catch (e) {
    // 통합 엔진 실패 시 null 반환 — 분석기는 옛 로직만 사용
    return null
  }
}

/**
 * 분석기별 slice 추출 헬퍼 — 각 분석기가 필요한 부분만 가져감.
 */
export const sliceFor = {
  career: (u: UnifiedSlice) => ({
    matrix: u.themeMatrix?.career,
    timing: u.themeTimings?.career,
    score: u.unifiedScores?.career,
  }),
  wealth: (u: UnifiedSlice) => ({
    matrix: u.themeMatrix?.wealth,
    timing: u.themeTimings?.wealth,
    score: u.unifiedScores?.wealth,
  }),
  love: (u: UnifiedSlice) => ({
    matrix: u.themeMatrix?.love,
    timing: u.themeTimings?.love,
    score: u.unifiedScores?.love,
  }),
  health: (u: UnifiedSlice) => ({
    matrix: u.themeMatrix?.health,
    timing: u.themeTimings?.health,
    score: u.unifiedScores?.health,
  }),
  growth: (u: UnifiedSlice) => ({
    matrix: u.themeMatrix?.growth,
    timing: u.themeTimings?.growth,
    score: u.unifiedScores?.growth,
  }),
  family: (u: UnifiedSlice) => ({
    matrix: u.themeMatrix?.family,
    timing: u.themeTimings?.family,
    score: u.unifiedScores?.family,
  }),
  /** 인생 전체 narrative (karma/timing/destiny 용) */
  life: (u: UnifiedSlice) => u.life,
  /** 4 tier narratives (대운·세운·월운·일진) */
  narratives: (u: UnifiedSlice) => u.narratives,
  /** cycle 9차원 분석 (flow/sibsin/yongsin 용) */
  cycle: (u: UnifiedSlice) => u.cycleAnalysis,
  /** 5축 (cross/personality 용) */
  axes: (u: UnifiedSlice) => u.axes,
  /** 헤더 (모든 분석기에서 사용 가능) */
  header: (u: UnifiedSlice) => u.header,
}
