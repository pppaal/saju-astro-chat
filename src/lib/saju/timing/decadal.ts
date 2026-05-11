// Saju/timing/decadal.ts
// 대운 (10년) 분석 wrapper. astrology에는 정확한 10년 대응 없음 (사주 단독).
// unseAnalysis.ts:analyzeDaeunPeriod 를 mirror naming 으로 노출.

export {
  analyzeDaeunPeriod as analyzeDecadalSaju,
  type DaeunPeriodAnalysis,
} from '../unseAnalysis'
