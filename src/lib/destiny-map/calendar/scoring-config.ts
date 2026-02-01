/**
 * Destiny Calendar Scoring Configuration
 * 운명 캘린더 점수 체계 설정 (v2 - 논리적 개선)
 *
 * ============================================================
 * 점수 시스템 설계 원칙 (개선됨)
 * ============================================================
 *
 * 1. 총점 100점 만점 시스템
 *    - 사주(四柱) 분석: 50점 (전통 동양 명리학)
 *    - 점성술 분석: 50점 (서양 점성학)
 *    - 교차검증 보너스: ±3점 (양쪽 일치시)
 *
 * 2. 사주 50점 배분 (시간 주기별 - v3 분포 개선)
 *    - 대운(大運): 8점 (10년 주기, 배경 기운)
 *    - 세운(歲運): 10점 (1년 주기 - 12→10 하향, 연간 쏠림 완화)
 *    - 월운(月運): 7점 (1개월 주기 - 12→7 하향, 월간 쏠림 완화)
 *    - 일진(日辰): 20점 (당일 운세 - 13→20 상향, 일별 변동성 확대)
 *    - 용신/격국: 5점 (개인 사주 특성 반영)
 *
 * 3. 점성술 50점 배분 (개선)
 *    - 트랜짓 태양: 8점 (계절/월간 에너지)
 *    - 트랜짓 달: 12점 (일일 감정/직관 - 상향, 일일 영향 크므로)
 *    - 주요 행성 트랜짓: 15점 (수금화목토)
 *    - 달 위상: 8점 (보름달/신월 등 - 하향, 밸런스)
 *    - Solar Return/Progressions: 7점 (상향)
 *
 * 4. 등급 기준 (v3 분포 개선 - 일진 비중↑으로 분산 확보)
 *    - Grade 0 (천운): 68+ (~5-8%)
 *    - Grade 1 (좋음): 62-67 (~15%)
 *    - Grade 2 (보통): 42-61 (~50%)
 *    - Grade 3 (안좋음): 28-41 (~25%)
 *    - Grade 4 (최악): 0-27 (~5%)
 *
 * 5. 삼재 처리 (개선)
 *    - 삼재년이라도 매일 감점하지 않음
 *    - 삼재+충이 겹칠 때만 추가 감점
 *    - 삼재+귀인이 있으면 상쇄
 */

// ============================================================
// 카테고리별 최대 점수 (개선)
// ============================================================

export const CATEGORY_MAX_SCORES = {
  // 사주 영역 (총 50점) - v3 분포 개선: 일진 비중 ↑, 월운/세운 비중 ↓
  saju: {
    daeun: 8,      // 대운 (10년 주기)
    seun: 10,      // 세운 (1년 주기) - 12→10 하향 (연간 쏠림 완화)
    wolun: 7,      // 월운 (1개월 주기) - 12→7 하향 (월간 쏠림 완화)
    iljin: 20,     // 일진 (당일) - 13→20 상향 (일별 변동성 확대)
    yongsin: 5,    // 용신/격국
    total: 50,
  },
  // 점성술 영역 (총 50점) - 밸런스 개선
  astro: {
    transitSun: 8,     // 트랜짓 태양 - 10→8 하향
    transitMoon: 12,   // 트랜짓 달 - 10→12 상향 (일일 영향)
    majorPlanets: 15,  // 수금화목토
    lunarPhase: 8,     // 달 위상 - 10→8 하향
    solarReturn: 7,    // Solar Return - 5→7 상향
    total: 50,
  },
  // 교차검증 보너스 - 3점으로 축소 (너무 극단적이었음)
  crossBonus: 3,
  // 총점
  grandTotal: 100,
} as const;

// ============================================================
// 사주 요소별 점수 (개선 - 더 완만한 분포)
// ============================================================

/**
 * 대운 점수 요소 (최대 8점)
 * 10년 주기이므로 일일 영향은 배경 기운 정도
 */
export const DAEUN_SCORES = {
  positive: {
    inseong: 0.25,      // 인성: 도움받는 대운
    jaeseong: 0.22,     // 재성: 재물운
    bijeon: 0.15,       // 비견: 힘 보충
    siksang: 0.12,      // 식상: 창작/표현
    yukhap: 0.15,       // 육합: 화합
    samhapPositive: 0.20,// 삼합(길)
  },
  negative: {
    chung: -0.20,       // 충: 충돌 (완화)
    gwansal: -0.18,     // 관살: 압박 (완화)
    samhapNegative: -0.12,
  },
  maxRaw: 0.5,
} as const;

/**
 * 세운 점수 요소 (최대 10점 - v3: 12→10 하향)
 * 1년 단위 영향, 해당 연도의 전반적 기운
 */
export const SEUN_SCORES = {
  positive: {
    inseong: 0.18,       // 0.22→0.18
    jaeseong: 0.15,      // 0.18→0.15
    bijeon: 0.10,
    siksang: 0.08,       // 0.10→0.08
    yukhap: 0.12,        // 0.15→0.12
    samhapPositive: 0.15,// 0.20→0.15
  },
  negative: {
    chung: -0.15,        // -0.18→-0.15
    gwansal: -0.12,      // -0.15→-0.12
    samhapNegative: -0.08,// -0.10→-0.08
    // 삼재는 여기서 제거 - 별도 로직으로 처리
  },
  // 삼재 특별 처리 (조건부)
  samjae: {
    base: -0.05,           // 삼재 기본 페널티 (매우 약함)
    withChung: -0.10,      // 삼재 + 충 = 추가 페널티 (-0.12→-0.10)
    withGwiin: 0.05,       // 삼재 + 귀인 = 상쇄
  },
  maxRaw: 0.45,           // 0.5→0.45
} as const;

/**
 * 월운 점수 요소 (최대 7점 - v3: 12→7 하향, 월간 쏠림 방지)
 * 월운은 배경 기운 역할로 축소, 일진이 주도적 역할
 */
export const WOLUN_SCORES = {
  positive: {
    inseong: 0.15,       // 0.18→0.15
    jaeseong: 0.12,      // 0.15→0.12
    bijeon: 0.08,        // 0.10→0.08
    siksang: 0.06,       // 0.08→0.06
    yukhap: 0.10,        // 0.12→0.10
    samhapPositive: 0.12,// 0.15→0.12
  },
  negative: {
    chung: -0.12,        // -0.15→-0.12
    gwansal: -0.10,      // -0.12→-0.10
    samhapNegative: -0.06,// -0.08→-0.06
  },
  maxRaw: 0.35,          // 0.4→0.35
} as const;

/**
 * 일진 점수 요소 (최대 20점 - v3: 13→20 상향)
 * 당일 직접 영향 - 일별 변동폭을 극대화하여 같은 달 내 분산 확보
 */
export const ILJIN_SCORES = {
  // 십신(十神) 점수 - v3: 일진이 주도적이므로 영향력 상향
  sipsin: {
    jeongyin: 0.20,    // 정인: 도움/보호 (0.18→0.20)
    pyeonyin: 0.14,    // 편인: 학습/변화 (0.12→0.14)
    jeongchaae: 0.18,  // 정재: 안정적 재물 (0.15→0.18)
    pyeonchaae: 0.12,  // 편재: 투기적 재물 (0.10→0.12)
    sikshin: 0.14,     // 식신: 창작/표현 (0.12→0.14)
    sanggwan: -0.12,   // 상관: 충돌/반항 (-0.10→-0.12)
    jeongwan: 0.16,    // 정관: 질서/권위 (0.14→0.16)
    pyeonwan: -0.14,   // 편관: 압박/시련 (-0.12→-0.14)
    bijeon: 0.06,      // 비견: 경쟁 (0.05→0.06)
    gyeobjae: -0.08,   // 겁재: 손실 위험 (-0.06→-0.08)
  },
  // 지지 상호작용 - v3: 충/합의 변동성 확대
  branch: {
    yukhap: 0.18,        // 육합: 화합/인연 (0.15→0.18)
    samhapPositive: 0.22,// 삼합(길) (0.20→0.22)
    samhapNegative: -0.14,// (-0.12→-0.14)
    chung: -0.22,        // 충: 충돌/변화 (-0.18→-0.22)
    xing: -0.15,         // 형: 긴장/마찰 (-0.12→-0.15)
    hai: -0.10,          // 해: 방해 (-0.08→-0.10)
  },
  // 특수 길일 - 천운 달성을 위해 유지
  special: {
    cheoneulGwiin: 0.35,  // 천을귀인: 귀인의 도움
    taegukGwiin: 0.30,    // 태극귀인
    cheondeokGwiin: 0.25, // 천덕귀인
    woldeokGwiin: 0.20,   // 월덕귀인
    geonrok: 0.25,        // 건록: 록지
    sonEomneun: 0.15,     // 손없는 날
    yeokma: 0.10,         // 역마: 이동/활동
    dohwa: 0.08,          // 도화: 인연
    hwagae: 0.06,         // 화개: 예술/영적
  },
  // 추가 흉신 - v3: 부정 요소도 영향력 상향
  negative: {
    gongmang: -0.18,      // 공망: 허무 (-0.15→-0.18)
    wonjin: -0.14,        // 원진: 갈등 (-0.12→-0.14)
    yangin: -0.12,        // 양인: 위험 (-0.10→-0.12)
    goegang: -0.10,       // 괴강: 극단적 (-0.08→-0.10)
    backho: -0.12,        // 백호: 사고 (-0.10→-0.12)
    guimungwan: -0.14,    // 귀문관: 정신 혼란 (-0.12→-0.14)
  },
  maxRaw: 0.7,  // 상향 (0.6→0.7) - 20점 배분에 맞춤
} as const;

/**
 * 용신/격국 점수 요소 (최대 5점)
 */
export const YONGSIN_SCORES = {
  positive: {
    primaryMatch: 0.30,    // 용신 천간 일치
    secondaryMatch: 0.15,  // 희신 일치
    branchMatch: 0.18,     // 용신 지지 일치
    support: 0.10,         // 용신 생해주는 오행
  },
  negative: {
    kibsinMatch: -0.25,    // 기신 일치 (완화)
    kibsinBranch: -0.15,   // 기신 지지 (완화)
    harm: -0.10,           // 용신 극하는 오행
  },
  geokguk: {
    favor: 0.15,
    avoid: -0.12,
    strengthBalance: 0.08,
    strengthImbalance: -0.05,
  },
  maxRaw: 0.5,
} as const;

// ============================================================
// 점성술 요소별 점수 (개선)
// ============================================================

/**
 * 트랜짓 태양 점수 (최대 8점)
 */
export const TRANSIT_SUN_SCORES = {
  elementRelation: {
    same: 0.30,          // 같은 원소: 에너지 공명
    generatedBy: 0.22,   // 생해주는 관계: 지원
    generates: 0.08,     // 내가 생하는 관계: 소모
    controlledBy: -0.15, // 극당하는 관계: 도전 (완화)
    controls: 0.12,      // 내가 극하는 관계: 성취
  },
  maxRaw: 0.4,
} as const;

/**
 * 트랜짓 달 점수 (최대 12점) - 일일 영향이 크므로 상향
 */
export const TRANSIT_MOON_SCORES = {
  elementRelation: {
    same: 0.28,
    generatedBy: 0.20,
    generates: 0.05,
    controlledBy: -0.12, // 완화
    controls: 0.08,
  },
  voidOfCourse: -0.15,   // 보이드 오브 코스 (완화)
  maxRaw: 0.4,
} as const;

/**
 * 주요 행성 트랜짓 점수 (최대 15점) - 역행 강화
 *
 * v7 변경: 역행 페널티 강화 (특히 수성)
 * 이유: 전통 점성학에서 역행은 중요한 요소
 */
export const MAJOR_PLANETS_SCORES = {
  weights: {
    mercury: 0.20,
    venus: 0.25,
    mars: 0.20,
    jupiter: 0.40,   // 행운/확장 (가장 중요)
    saturn: 0.25,
  },
  aspects: {
    conjunction: 0.45,  // 합 (0.50 → 0.45)
    trine: 0.40,        // 삼분 (0.45 → 0.40)
    sextile: 0.25,      // 육분 (0.30 → 0.25)
    square: -0.30,      // 사분 (-0.35 → -0.30)
    opposition: -0.22,  // 충 (-0.25 → -0.22)
  },
  retrograde: {
    mercury: -0.28,    // 수성 역행 강화 (-0.20 → -0.28)
    venus: -0.18,      // 금성 역행 강화 (-0.15 → -0.18)
    mars: -0.15,       // 화성 역행 강화 (-0.12 → -0.15)
    jupiter: -0.10,    // 목성 역행 강화 (-0.08 → -0.10)
    saturn: -0.10,     // 토성 역행 강화 (-0.08 → -0.10)
  },
  maxRaw: 0.7,  // 0.8 → 0.7 조정
} as const;

/**
 * 달 위상 점수 (최대 8점) - 균형 조정
 *
 * v7 변경: 보름달/신월 가중치 하향 (0.45/0.35 → 0.28/0.22)
 * 이유: 달 위상이 8점 중 3~4점을 차지하는 과도한 영향 완화
 */
export const LUNAR_PHASE_SCORES = {
  newMoon: 0.22,         // 신월: 새로운 시작 (0.35 → 0.22 하향)
  waxingCrescent: 0.15,  // 초승달: 성장 시작
  firstQuarter: -0.06,   // 상현달: 긴장/도전
  waxingGibbous: 0.18,   // 상현망: 성숙
  fullMoon: 0.28,        // 보름달: 완성/성취 (0.45 → 0.28 하향)
  waningGibbous: 0.12,   // 하현망: 수확
  lastQuarter: -0.08,    // 하현달: 반성/장애
  waningCrescent: -0.04, // 그믐달: 휴식/피로
  maxRaw: 0.35,          // 0.45 → 0.35 하향
} as const;

/**
 * Solar Return / Progressions 점수 (최대 7점) - 생일 보너스 합리화
 *
 * v7 변경: 생일 당일 0.50 → 0.35 하향
 * 이유: 생일만으로 7점 중 5점 이상 획득은 과도함
 */
export const SOLAR_RETURN_SCORES = {
  exactBirthday: 0.35,    // 생일 당일 (0.50 → 0.35 하향)
  nearBirthday1: 0.25,    // ±1일 (0.35 → 0.25)
  nearBirthday3: 0.15,    // ±3일
  nearBirthday7: 0.08,    // ±7일
  progressionSupport: 0.12,
  progressionChallenge: -0.06,
  maxRaw: 0.40,           // 0.50 → 0.40 하향
} as const;

// ============================================================
// 교차검증 보너스/페널티 (v7 - 회색지대 처리 개선)
// ============================================================

export const CROSS_VERIFICATION_SCORES = {
  bothPositive: 5,        // 사주+점성 모두 긍정 (25점 초과)
  bothNegative: -4,       // 사주+점성 모두 부정 (20점 미만)
  mixed: 0,               // 혼합 상태 (20~25점 사이)
  elementAlign: 2,        // 일진 오행과 트랜짓 태양 오행 일치
  // v7 추가: 교차검증 기준값 명확화
  positiveThreshold: 25,  // 긍정 기준: 50점 중 25점 초과
  negativeThreshold: 20,  // 부정 기준: 50점 중 20점 미만
  neutralMin: 20,         // 중립 구간 시작
  neutralMax: 25,         // 중립 구간 끝
} as const;

// ============================================================
// 등급 임계값 (5등급 시스템 - 목표 분포 최적화)
// 목표 분포:
//   최고 ~5%, 좋음 ~15%, 보통 ~50%, 안좋음 ~25%, 최악 ~5%
//
// grading.ts와 일관성 유지
// ============================================================

export const GRADE_THRESHOLDS = {
  grade0: 68,  // 최고: 68점 이상 AND 충/형 둘 다 없음 (~5-8%) - 72에서 낮춤
  grade1: 62,  // 좋음: 62~67점 (~15%)
  grade2: 42,  // 보통: 42~61점 (~50%)
  grade3: 28,  // 안좋음: 28~41점 (~25%)
  // grade4: 28 미만 (최악) (~5%)
} as const;

// ============================================================
// 점수 계산 헬퍼 함수
// ============================================================

/**
 * 원시 점수를 카테고리 최대 점수로 변환
 * 중앙값 기반 정규화 (50%가 중간 점수)
 */
export function normalizeToCategory(
  rawScore: number,
  maxRaw: number,
  categoryMax: number
): number {
  // rawScore를 0~1 범위로 정규화 (중앙이 0.5)
  const normalized = Math.max(0, Math.min(1, (rawScore + maxRaw) / (2 * maxRaw)));
  // 카테고리 최대 점수에 매핑
  return Math.round(normalized * categoryMax * 10) / 10;
}

/**
 * 여러 요소의 점수를 합산하고 정규화
 */
export function sumAndNormalize(
  scores: number[],
  maxRaw: number,
  categoryMax: number
): number {
  const sum = scores.reduce((a, b) => a + b, 0);
  return normalizeToCategory(sum, maxRaw, categoryMax);
}

/**
 * 직접 점수 계산 방식 (v7 - 균형 잡힌 분포)
 *
 * 핵심 변경 (v6 → v7):
 * - 기본값 40% → 45%로 상향 (중앙값에 가깝게)
 * - 증폭값 3.2배 → 2.2배로 하향 (과도한 변동성 완화)
 * - 목표 분포: 천운 ~3%, 아주좋음 ~12%, 좋음 ~25%, 보통 ~35%, 나쁨 ~17%, 아주나쁨 ~5%
 *
 * 변경 이유:
 * - 3.2배 증폭은 작은 요소 변화(±0.05)가 최종 점수에 ±0.8점 영향을 줘서 과도함
 * - 2.2배로 완화하여 점수 변동성을 합리적 수준으로 조정
 */
export function calculateAdjustedScore(
  categoryMax: number,
  adjustments: number[],
  _maxAdjustment: number = 0.5  // 하위 호환성 유지
): number {
  // 기본값: 카테고리 최대의 45% (중앙값에 가깝게 조정)
  const baseScore = categoryMax * 0.45;
  const totalAdj = adjustments.reduce((a, b) => a + b, 0);

  // 보정값 증폭: 2.2배로 적용 (3.2 → 2.2로 하향, 변동성 완화)
  const amplifiedAdj = totalAdj * 2.2;
  const adjScore = amplifiedAdj * categoryMax;

  return Math.round(Math.max(0, Math.min(categoryMax, baseScore + adjScore)) * 10) / 10;
}
