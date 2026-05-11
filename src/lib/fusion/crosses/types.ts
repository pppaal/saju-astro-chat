// fusion/crosses/types.ts
// 테마 × 시기 차원 곱 cross 공통 타입.

import type { SajuThemeAnalysis, SajuThemeKey } from '@/lib/saju/themes/types'
import type { AstroThemeAnalysis } from '@/lib/astrology/themes/types'
import type { SajuTimingAnalysis } from '@/lib/saju/timing/types'
import type { AstroTimingAnalysis } from '@/lib/astrology/timing/types'

export type ThemeKey = SajuThemeKey  // 18 테마 (Saju·Astro 동일)

export type TimingUnit =
  | 'lifelong'
  | 'decadal'
  | 'yearly'
  | 'monthly'
  | 'daily'
  | 'hourly'

export type CrossTone = 'strong-positive' | 'positive' | 'mixed' | 'cautious' | 'strong-negative' | 'neutral'

export interface ThemeTimingCross {
  theme: ThemeKey
  timing: { unit: TimingUnit; periodLabel?: string }
  sajuView: {
    theme: SajuThemeAnalysis
    timings?: SajuTimingAnalysis[]   // 여러 layer (decadal/yearly/monthly/daily/hourly)
  }
  astroView: {
    theme: AstroThemeAnalysis
    timings?: AstroTimingAnalysis[]
  }
  crossView: {
    tone: CrossTone
    /** 연속 점수 0..100 (50 = 중립, 0 = 최악, 100 = 최고) */
    score: number
    /** 사주 측 normalized -1..+1 */
    sajuScore: number
    /** 점성 측 normalized -1..+1 */
    astroScore: number
    consensus: string
    factors: string[]
  }
}
