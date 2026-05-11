// astrology/timing/types.ts
// 타이밍 단위별 해석 wrapper 공통 타입.
// Saju/unseAnalysis 의 대운/세운 분석과 mirror.

export type AstroTimingUnit =
  | 'lifetime'  // Secondary Progressions (사주에 대응 없음)
  | 'yearly'    // Solar Return ↔ 사주 세운
  | 'monthly'   // Lunar Return ↔ 사주 월운
  | 'daily'     // Daily Transit ↔ 사주 일진
  | 'hourly'    // Planetary Hour ↔ 사주 시진

export type AstroTimingTone = 'positive' | 'mixed' | 'cautious' | 'neutral'

export interface AstroTimingHighlight {
  source: string         // "Sun in 7H, Mars opp natal Venus" 등
  meaning: string        // 합성된 해석 텍스트
  tone: AstroTimingTone
}

export interface AstroTimingAnalysis {
  unit: AstroTimingUnit
  periodLabel: string    // "Solar Return 2026", "Daily 2026-05-09" 등
  highlights: AstroTimingHighlight[]
  summary: string        // 전체 narrative 한 줄
}
