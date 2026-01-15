/**
 * Destiny Calendar Service (운명 캘린더 서비스)
 * 사주 + 점성술 교차 검증 기반 중요 날짜 계산
 *
 * ═══════════════════════════════════════════════════════════════
 * 이 파일은 calendar 모듈의 re-export 역할만 합니다.
 * 실제 구현은 ./calendar/ 디렉토리의 개별 모듈에 있습니다.
 * ═══════════════════════════════════════════════════════════════
 *
 * 주요 기능:
 * - 세운(歲運) 분석: 연간 운세 흐름
 * - 월운(月運) 분석: 월간 운세 흐름
 * - 일진(日辰) 분석: 일별 상세 분석
 * - 천을귀인(天乙貴人): 특별히 좋은 날 감지
 * - 지장간(支藏干): 숨은 천간 분석
 * - 영역별 분석: 재물/연애/건강/직업 세부 점수
 * - 점성술 트랜짓: 태양/달 위상 분석
 * - 교차 검증: 사주+점성술 시너지/경고
 * - 고급 예측: 공망/신살/에너지/시간대 최적화 (ultraPrecisionEngine)
 * - 대운-트랜짓 동기화: 목성회귀/토성회귀 (daeunTransitSync)
 *
 * 모듈 구조:
 * - date-analysis-orchestrator.ts: 날짜 분석 핵심 로직 (analyzeDate)
 * - public-api.ts: 외부 공개 API (getDailyFortuneScore, calculateYearlyImportantDates 등)
 * - saju-temporal-scoring.ts: 사주 시간 운세 점수 (대운/세운/월운/일진)
 * - transit-analysis.ts: 행성 트랜짓 분석
 * - planetary-hours.ts: 행성 시간 및 일월식 분석
 * - scoring.ts: 점수 계산 시스템
 * - grading.ts: 등급 결정 로직
 * - constants.ts: 상수 정의
 * - utils.ts: 유틸리티 함수
 */

// ═══════════════════════════════════════════════════════════════
// Types (타입 정의)
// ═══════════════════════════════════════════════════════════════
export type {
  ImportanceGrade,
  EventCategory,
  ImportantDate,
  UserSajuProfile,
  UserAstroProfile,
} from './calendar/date-analysis-orchestrator';

export type { CalendarMonth, DailyFortuneResult } from './calendar/public-api';

// ═══════════════════════════════════════════════════════════════
// Public API Functions (공개 API)
// ═══════════════════════════════════════════════════════════════
export {
  calculateYearlyImportantDates,
  findBestDatesForCategory,
  calculateMonthlyImportantDates,
  extractSajuProfile,
  extractAstroProfile,
  calculateSajuProfileFromBirthDate,
  calculateAstroProfileFromBirthDate,
  getDailyFortuneScore,
  getGanzhiForDate,
} from './calendar/public-api';

// ═══════════════════════════════════════════════════════════════
// Temporal Scoring Functions (시간 운세 점수)
// ═══════════════════════════════════════════════════════════════
export {
  getYearGanzhi,
  getMonthGanzhi,
} from './calendar/saju-temporal-scoring';

// ═══════════════════════════════════════════════════════════════
// Internal exports (내부 사용 - 다른 모듈에서 필요시)
// ═══════════════════════════════════════════════════════════════

// 날짜 분석 핵심 함수
export { analyzeDate } from './calendar/date-analysis-orchestrator';

// 그레이딩 함수
export {
  calculateGrade,
  getGradeKeys,
  getGradeRecommendations,
  filterWarningsByGrade,
} from './calendar/grading';

// 점수 계산 시스템
export {
  calculateTotalScore,
  type SajuScoreInput,
  type AstroScoreInput,
  type ScoreResult,
} from './calendar/scoring';

// 상수
export {
  STEMS,
  BRANCHES,
  STEM_TO_ELEMENT,
  BRANCH_TO_ELEMENT,
  ZODIAC_TO_ELEMENT,
  ELEMENT_RELATIONS,
  SAMHAP,
  YUKHAP,
  CHUNG,
  XING,
  HAI,
  JIJANGGAN,
} from './calendar/constants';

// 유틸리티 함수
export {
  normalizeElement,
  getSipsin,
  isCheoneulGwiin,
  isDohwaDay,
  isGeonrokDay,
  isSamjaeYear,
  isSonEomneunDay,
  isYeokmaDay,
  approximateLunarDay,
} from './calendar/utils';
