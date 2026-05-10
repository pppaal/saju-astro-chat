// fusion/crosses — 테마 × 시기 차원 곱 cross.

export type {
  ThemeKey,
  TimingUnit,
  CrossTone,
  ThemeTimingCross,
} from './types'

export {
  crossThemeAtTime,
  crossAllThemesAtTime,
  crossThemeAcrossTimings,
  crossAllThemesAllTimings,
  type CrossInput,
} from './themeTiming'

export { synthesizeThemeCross } from './synthesizer'
export { SAJU_THEME_FN, ASTRO_THEME_FN } from './themeFunctions'
