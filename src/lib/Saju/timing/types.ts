// Saju/timing/types.ts
// 타이밍 단위별 해석 wrapper 공통 타입. astrology/timing 와 동일 형태.

export type SajuTimingUnit =
  | 'decadal'  // 대운 (10년) — 사주 단독, 점성에는 정확 대응 없음
  | 'yearly'   // 세운 (1년) ↔ astrology Solar Return
  | 'monthly'  // 월운 (1개월) ↔ astrology Lunar Return
  | 'daily'    // 일진 (1일) ↔ astrology Daily Transit
  | 'hourly'   // 시진 (1시간) ↔ astrology Planetary Hour

export type SajuTimingTone = 'positive' | 'mixed' | 'cautious' | 'neutral'

export interface SajuTimingHighlight {
  source: string
  meaning: string
  tone: SajuTimingTone
}

export interface SajuTimingAnalysis {
  unit: SajuTimingUnit
  periodLabel: string
  highlights: SajuTimingHighlight[]
  summary: string
}
