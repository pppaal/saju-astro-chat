// astrology/timing — 타이밍 단위별 해석 wrapper.
// Saju/timing 와 mirror — 함수명 패턴: analyze{Decadal|Yearly|Monthly|Daily|Hourly|Lifetime}Astro

export type {
  AstroTimingUnit,
  AstroTimingTone,
  AstroTimingHighlight,
  AstroTimingAnalysis,
} from './types'

export { analyzeYearlyAstro } from './yearly'
export { analyzeMonthlyAstro } from './monthly'
export { analyzeDailyAstro } from './daily'
export {
  analyzeHourlyAstro,
  type PlanetaryHourPlanet,
  type PlanetaryHourInput,
} from './hourly'
export { analyzeLifetimeAstro } from './lifetime'
