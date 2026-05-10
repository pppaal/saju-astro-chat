// astrology/themes — 테마별 해석 wrapper
// Saju/{familyLineage, healthCareer, sibsinAnalysis} 와 mirror 구조.

export type {
  AstroThemeKey,
  AstroThemeTone,
  AstroThemeFactor,
  AstroThemeAnalysis,
} from './types'

// Core 6
export { analyzeLoveAstro } from './love'
export { analyzeMoneyAstro } from './money'
export { analyzeCareerAstro } from './career'
export { analyzeFamilyAstro } from './family'
export { analyzeHealthAstro } from './health'
export { analyzePersonalityAstro } from './personality'

// Extended 12
export { analyzeStudyAstro } from './study'
export { analyzeChildrenAstro } from './children'
export { analyzeParentsAstro } from './parents'
export { analyzeTravelAstro } from './travel'
export { analyzeSocialAstro } from './social'
export { analyzeBusinessAstro } from './business'
export { analyzeReputationAstro } from './reputation'
export { analyzeSpiritualityAstro } from './spirituality'
export { analyzeKarmaAstro } from './karma'
export { analyzeCrisisAstro } from './crisis'
export { analyzeCreativityAstro } from './creativity'
export { analyzeLegalAstro } from './legal'
