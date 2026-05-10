// fusion/crosses/themeTiming.ts
// 메인 cross 함수: 18 테마 × 5 시기 차원 곱 = 90 cross 자동.

import type { Chart } from '@/lib/astrology/foundation/types'
import type { SimpleSajuPillars, SajuThemeKey } from '@/lib/Saju/themes/types'
import type { SajuTimingAnalysis } from '@/lib/Saju/timing/types'
import type { AstroTimingAnalysis } from '@/lib/astrology/timing/types'
import { SAJU_THEME_FN, ASTRO_THEME_FN } from './themeFunctions'
import { synthesizeThemeCross } from './synthesizer'
import type { ThemeKey, ThemeTimingCross, TimingUnit } from './types'

export interface CrossInput {
  saju: SimpleSajuPillars
  astro: Chart
  theme: ThemeKey
  timing: {
    unit: TimingUnit
    periodLabel?: string
    sajuTiming?: SajuTimingAnalysis      // 미리 계산된 사주 timing
    astroTiming?: AstroTimingAnalysis    // 미리 계산된 점성 timing
  }
}

/**
 * 1개 테마 × 1개 시기 cross.
 */
export function crossThemeAtTime(input: CrossInput): ThemeTimingCross {
  const sajuTheme = SAJU_THEME_FN[input.theme](input.saju)
  const astroTheme = ASTRO_THEME_FN[input.theme](input.astro)

  const cross = synthesizeThemeCross({
    theme: input.theme,
    timing: { unit: input.timing.unit, periodLabel: input.timing.periodLabel },
    sajuTheme,
    astroTheme,
    sajuTiming: input.timing.sajuTiming,
    astroTiming: input.timing.astroTiming,
  })

  return {
    theme: input.theme,
    timing: { unit: input.timing.unit, periodLabel: input.timing.periodLabel },
    sajuView: { theme: sajuTheme, timing: input.timing.sajuTiming },
    astroView: { theme: astroTheme, timing: input.timing.astroTiming },
    crossView: cross,
  }
}

const ALL_THEMES: SajuThemeKey[] = [
  'love', 'money', 'career', 'family', 'health', 'personality',
  'study', 'children', 'parents', 'travel', 'social', 'business',
  'reputation', 'spirituality', 'karma', 'crisis', 'creativity', 'legal',
]

/**
 * 18 테마 × 1개 시기 — 한 시기에서 모든 테마 cross.
 */
export function crossAllThemesAtTime(
  saju: SimpleSajuPillars,
  astro: Chart,
  timing: CrossInput['timing'],
): ThemeTimingCross[] {
  return ALL_THEMES.map((theme) =>
    crossThemeAtTime({ saju, astro, theme, timing }),
  )
}

/**
 * 1 테마 × 여러 시기 — 한 테마의 시기별 흐름.
 */
export function crossThemeAcrossTimings(
  saju: SimpleSajuPillars,
  astro: Chart,
  theme: ThemeKey,
  timings: CrossInput['timing'][],
): ThemeTimingCross[] {
  return timings.map((timing) => crossThemeAtTime({ saju, astro, theme, timing }))
}

/**
 * 전체 차원 곱: 18 테마 × N 시기 단위.
 */
export function crossAllThemesAllTimings(
  saju: SimpleSajuPillars,
  astro: Chart,
  timings: CrossInput['timing'][],
): ThemeTimingCross[] {
  const out: ThemeTimingCross[] = []
  for (const theme of ALL_THEMES) {
    for (const timing of timings) {
      out.push(crossThemeAtTime({ saju, astro, theme, timing }))
    }
  }
  return out
}
