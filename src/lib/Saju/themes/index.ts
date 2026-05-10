// Saju/themes — 테마별 해석 wrapper. astrology/themes 와 mirror.

export type {
  SajuThemeKey,
  SajuThemeTone,
  SajuThemeFactor,
  SajuThemeAnalysis,
} from './types'

// Core 6
export { analyzeLoveSaju } from './love'
export { analyzeMoneySaju } from './money'
export { analyzeCareerSaju, type CareerAnalysis } from './career'
export { analyzeFamilySaju } from './family'
export { analyzeHealthSaju, type HealthAnalysis } from './health'
export { analyzePersonalitySaju } from './personality'

// Extended 12
export { analyzeStudySaju } from './study'
export { analyzeChildrenSaju } from './children'
export { analyzeParentsSaju } from './parents'
export { analyzeTravelSaju } from './travel'
export { analyzeSocialSaju } from './social'
export { analyzeBusinessSaju } from './business'
export { analyzeReputationSaju } from './reputation'
export { analyzeSpiritualitySaju } from './spirituality'
export { analyzeKarmaSaju } from './karma'
export { analyzeCrisisSaju } from './crisis'
export { analyzeCreativitySaju } from './creativity'
export { analyzeLegalSaju } from './legal'
