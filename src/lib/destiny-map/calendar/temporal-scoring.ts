/**
 * Temporal Scoring Module (시간 운세 점수 계산 통합 모듈)
 *
 * 여러 모듈에 분산된 시간 운세 관련 함수들을 통합 export합니다.
 * date-analysis-orchestrator.ts와 public-api.ts에서 사용합니다.
 *
 * @module temporal-scoring
 */

// Re-export from saju-temporal-scoring (대운/세운/월운/일진 점수)
export {
  getYearGanzhi,
  calculateSeunScore,
  getMonthGanzhi,
  calculateWolunScore,
  calculateIljinScore,
  getCurrentDaeun,
  calculateDaeunScore,
  calculateTotalTemporalScore,
  type GanzhiResult,
  type DaeunCycle,
  type TemporalScoreResult,
  type SeunScoreResult,
  type WolunScoreResult,
  type IljinScoreResult,
} from './saju-temporal-scoring';

// Re-export from saju-analysis (getGanzhiForDate, analyzeYongsin, etc.)
export {
  getGanzhiForDate,
  analyzeYongsin,
  analyzeGeokguk,
  analyzeSolarReturn,
  analyzeProgressions,
  type YongsinAnalysis,
  type GeokgukInfo,
} from './saju-analysis';

// Re-export from astrology-analysis (getLunarPhase)
export { getLunarPhase } from './astrology-analysis';
