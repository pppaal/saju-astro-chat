/**
 * 특별한 날 관련 설정 (삼재, 역마, 도화, 건록 등)
 *
 * 이 파일은 하위 호환성을 위한 barrel export입니다.
 * 실제 코드는 다음 파일들로 분리되었습니다:
 * - specialDays.data.ts: 순수 데이터/lookup 테이블
 * - specialDays.utils.ts: 헬퍼 함수들
 * - ../calendar/specialDays-analysis.ts: 복잡한 분석 로직
 */

// ============================================================
// Data exports (데이터/lookup 테이블)
// ============================================================
export {
  // 로컬 상수 (내부 사용 - STEMS/BRANCHES는 elements.config에서 export)
  STEMS_LOCAL,
  BRANCHES_LOCAL,
  // 삼재, 역마, 도화, 건록
  SAMJAE_BY_YEAR_BRANCH,
  YEOKMA_BY_YEAR_BRANCH,
  DOHWA_BY_YEAR_BRANCH,
  GEONROK_BY_DAY_STEM,
  // 십신
  SIPSIN_RELATIONS,
  // 지지 관계
  WONJIN,
  GWIMUN,
  BRANCH_MAIN_STEM,
  STEM_COMBO_PAIRS,
  PA,
  HAE,
  // 천간합
  CHUNGAN_HAP,
  // 귀인/신살
  HWAGAE_BY_YEAR_BRANCH,
  GEOBSAL_BY_YEAR_BRANCH,
  BAEKHO_BY_YEAR_BRANCH,
  CHEONDEOK_BY_MONTH_BRANCH,
  WOLDEOK_BY_MONTH_BRANCH,
  CHEONHEE_BY_YEAR_BRANCH,
  HONGYEOM_BY_YEAR_BRANCH,
  CHEONUI_BY_MONTH_BRANCH,
  JANGSEONG_BY_YEAR_BRANCH,
  BANAN_BY_YEAR_BRANCH,
  MUNCHANG_BY_DAY_STEM,
  HAKDANG_BY_DAY_STEM,
  // 납음
  NAPEUM_ELEMENT_TABLE,
  // 12신살, 28수
  TWELVE_SPIRITS,
  TWELVE_SPIRITS_MEANINGS,
  TWENTY_EIGHT_MANSIONS,
  // 시간대별
  HOUR_BRANCH_MEANINGS,
  // 절기
  SOLAR_TERMS,
  // 삼합/방합
  SAMHAP_GROUPS,
  BANGHAP_GROUPS,
  // 신살 조합
  SPECIAL_SAL_COMBINATIONS,
  // 오행
  STEM_ELEMENTS,
  BRANCH_ELEMENTS,
  ELEMENT_RELATIONS_LOCAL,
  // Types
  type SolarTermInfo,
  type SalCombination,
} from './specialDays.data';

// ============================================================
// Utility function exports (헬퍼 함수들)
// ============================================================
export {
  // 기본 신살 체크
  isSamjaeYear,
  isYeokmaDay,
  isDohwaDay,
  isGeonrokDay,
  getSipsin,
  isSonEomneunDay,
  approximateLunarDay,
  // 공망
  getGongmang,
  isGongmangDay,
  // 지지 관계
  isWonjinDay,
  isGwimunDay,
  isAmhap,
  isPaDay,
  isHaeDay,
  // 천간합
  isChunganHap,
  // 귀인/신살 체크
  isHwagaeDay,
  isGeobsalDay,
  isBaekhoDay,
  isCheondeokDay,
  isWoldeokDay,
  isCheonheeDay,
  isHongyeomDay,
  isCheonuiDay,
  isJangseongDay,
  isBananDay,
  isMunchangDay,
  isHakdangDay,
  // 납음
  getNapeumElement,
  // 12신살, 28수
  getTwelveSpiritForDay,
  get28MansionForDay,
  // 절기
  getSolarTermForDate,
  getDaysToNextSolarTerm,
  // 일식/월식
  checkEclipsePotential,
  // 역행
  getMercuryRetrogradePhase,
  getVenusRetrogradePhase,
  getMarsRetrogradePhase,
  // 행성 입궁
  getPlanetSignChange,
  // 시주/일진 분석
  analyzeHourPillarWithDay,
  // 대운 전환기
  analyzeDaeunTransition,
  // 사주 원국 관계
  analyzeNatalDayRelation,
  // 삼합 분석
  analyzeSamhapWithDay,
  // 신살 조합 분석
  analyzeSalCombinations,
  // 오행 관계 헬퍼
  getElementRelationship,
  // Types
  type EclipseInfo,
  type RetrogradePhase,
  type SamhapAnalysis,
} from './specialDays.utils';

// ============================================================
// Analysis function exports (분석 로직)
// ============================================================
export {
  // 12운성
  setTwelveStarSchool,
  getTwelveStarSchool,
  analyzeTwelveFortuneStar,
  analyzeDayTwelveStars,
  // 세운/월운
  analyzeFortuneFlow,
  // 시간대 추천
  getHourlyRecommendation,
  // 음력 분석
  analyzeLunarDate,
  // 사주-점성술 매핑
  analyzeElementCompatibility,
  ELEMENT_ASTRO_MAPPING,
  // 용신 추천
  getYongsinRecommendations,
  ELEMENT_RECOMMENDATIONS,
  // Types
  type TwelveStarSchool,
  type TwelveFortuneStarInfo,
  type TwelveStarAnalysis,
  type FortuneFlowAnalysis,
  type HourlyRecommendation,
  type LunarAnalysis,
  type ElementMappingDetail,
  type YongsinRecommendation,
} from '../calendar/specialDays-analysis';
