// fusion/crosses/types.ts
// 테마 × 시기 차원 곱 cross 공통 타입.

import type { SajuThemeAnalysis, SajuThemeKey } from '@/lib/Saju/themes/types'
import type { AstroThemeAnalysis } from '@/lib/astrology/themes/types'
import type { SajuTimingAnalysis } from '@/lib/Saju/timing/types'
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
    timing?: SajuTimingAnalysis
  }
  astroView: {
    theme: AstroThemeAnalysis
    timing?: AstroTimingAnalysis
  }
  crossView: {
    tone: CrossTone
    consensus: string
    factors: string[]
  }
}
