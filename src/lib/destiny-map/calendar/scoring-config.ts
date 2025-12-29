/**
 * Destiny Calendar Scoring Configuration
 * 운명 캘린더 점수 체계 설정
 *
 * ============================================================
 * 점수 시스템 설계 원칙
 * ============================================================
 *
 * 1. 총점 100점 만점 시스템
 *    - 사주(四柱) 분석: 50점 (전통 동양 명리학)
 *    - 점성술 분석: 50점 (서양 점성학)
 *    - 교차검증 보너스: ±5점 (양쪽 일치시)
 *
 * 2. 사주 50점 배분 (시간 주기별)
 *    - 대운(大運): 5점 (10년 주기, 큰 흐름이지만 일일 영향 작음)
 *    - 세운(歲運): 10점 (1년 주기, 해당 연도 기운)
 *    - 월운(月運): 10점 (1개월 주기)
 *    - 일진(日辰): 20점 (당일 운세, 가장 직접적)
 *    - 용신/격국: 5점 (개인 사주 특성 반영)
 *
 * 3. 점성술 50점 배분
 *    - 트랜짓 태양: 10점 (계절/월간 에너지)
 *    - 트랜짓 달: 10점 (일일 감정/직관)
 *    - 주요 행성 트랜짓: 15점 (수금화목토)
 *    - 달 위상: 10점 (보름달/신월 등)
 *    - Solar Return/Progressions: 5점
 *
 * 4. 등급 기준 (정규분포 목표)
 *    - Grade 0 (천운): 90+ (상위 3%)
 *    - Grade 1 (아주좋음): 75-89 (상위 12%)
 *    - Grade 2 (좋음): 55-74 (25%)
 *    - Grade 3 (보통): 35-54 (45%)
 *    - Grade 4 (나쁨): 0-34 (하위 15%)
 */

// ============================================================
// 카테고리별 최대 점수
// ============================================================

export const CATEGORY_MAX_SCORES = {
  // 사주 영역 (총 50점)
  saju: {
    daeun: 5,      // 대운 (10년 주기)
    seun: 10,      // 세운 (1년 주기)
    wolun: 10,     // 월운 (1개월 주기)
    iljin: 20,     // 일진 (당일)
    yongsin: 5,    // 용신/격국
    total: 50,
  },
  // 점성술 영역 (총 50점)
  astro: {
    transitSun: 10,    // 트랜짓 태양
    transitMoon: 10,   // 트랜짓 달
    majorPlanets: 15,  // 수금화목토
    lunarPhase: 10,    // 달 위상
    solarReturn: 5,    // Solar Return + Progressions
    total: 50,
  },
  // 교차검증 보너스
  crossBonus: 5,
  // 총점
  grandTotal: 100,
} as const;

// ============================================================
// 사주 요소별 점수 (0~1 범위로 정규화 후 카테고리 최대점수 적용)
// ============================================================

/**
 * 대운 점수 요소 (최대 5점)
 * 근거: 10년 주기로 변화하므로 일일 영향은 미미하지만 배경 기운 제공
 */
export const DAEUN_SCORES = {
  // 긍정 요소 (합산 후 정규화)
  positive: {
    inseong: 0.4,       // 인성: 도움받는 대운
    jaeseong: 0.35,     // 재성: 재물운
    bijeon: 0.25,       // 비견: 힘 보충
    siksang: 0.15,      // 식상: 창작/표현
    yukhap: 0.2,        // 육합: 화합
    samhapPositive: 0.3,// 삼합(길): 좋은 기운
  },
  // 부정 요소
  negative: {
    chung: -0.4,        // 충: 충돌
    gwansal: -0.35,     // 관살: 압박
    samhapNegative: -0.25, // 삼합(흉)
  },
  maxRaw: 1.0,  // 정규화 기준
} as const;

/**
 * 세운 점수 요소 (최대 10점)
 * 근거: 1년 단위 영향, 해당 연도의 전반적 기운
 */
export const SEUN_SCORES = {
  positive: {
    inseong: 0.3,
    jaeseong: 0.25,
    bijeon: 0.2,
    siksang: 0.15,
    yukhap: 0.25,
    samhapPositive: 0.3,
  },
  negative: {
    chung: -0.35,
    gwansal: -0.3,
    samhapNegative: -0.2,
    samjae: -0.15,      // 삼재년
  },
  maxRaw: 1.0,
} as const;

/**
 * 월운 점수 요소 (최대 10점)
 * 근거: 1개월 단위, 세운보다 직접적
 */
export const WOLUN_SCORES = {
  positive: {
    inseong: 0.25,
    jaeseong: 0.2,
    bijeon: 0.15,
    siksang: 0.1,
    yukhap: 0.2,
    samhapPositive: 0.25,
  },
  negative: {
    chung: -0.3,
    gwansal: -0.25,
    samhapNegative: -0.15,
  },
  maxRaw: 1.0,
} as const;

/**
 * 일진 점수 요소 (최대 20점) - 가장 중요!
 * 근거: 당일 직접 영향, 실제 체감하는 운세
 */
export const ILJIN_SCORES = {
  // 십신(十神) 점수 - 일간과의 관계
  sipsin: {
    jeongyin: 0.15,    // 정인: 도움/보호
    pyeonyin: 0.1,     // 편인: 학습/변화
    jeongchaae: 0.12,  // 정재: 안정적 재물
    pyeonchaae: 0.08,  // 편재: 투기적 재물
    sikshin: 0.1,      // 식신: 창작/표현
    sanggwan: -0.08,   // 상관: 충돌/반항
    jeongwan: 0.12,    // 정관: 질서/권위
    pyeonwan: -0.1,    // 편관: 압박/시련
    bijeon: 0.05,      // 비견: 경쟁
    gyeobjae: -0.05,   // 겁재: 손실 위험
  },
  // 지지 상호작용
  branch: {
    yukhap: 0.15,       // 육합: 화합/인연
    samhapPositive: 0.2,// 삼합(길)
    samhapNegative: -0.15, // 삼합(흉)
    chung: -0.2,        // 충: 충돌/변화
    xing: -0.15,        // 형: 긴장/마찰
    hai: -0.1,          // 해: 방해
  },
  // 특수 길일
  special: {
    cheoneulGwiin: 0.25,  // 천을귀인: 귀인의 도움
    geonrok: 0.15,        // 건록: 록지
    sonEomneun: 0.1,      // 손없는 날
    yeokma: 0.08,         // 역마: 이동/활동
    dohwa: 0.05,          // 도화: 인연
  },
  maxRaw: 1.0,
} as const;

/**
 * 용신/격국 점수 요소 (최대 5점)
 * 근거: 개인 사주 특성에 맞는 에너지
 */
export const YONGSIN_SCORES = {
  positive: {
    primaryMatch: 0.4,    // 용신 천간 일치
    secondaryMatch: 0.2,  // 희신 일치
    branchMatch: 0.25,    // 용신 지지 일치
    support: 0.15,        // 용신 생해주는 오행
  },
  negative: {
    kibsinMatch: -0.5,    // 기신 일치 (가장 나쁨)
    kibsinBranch: -0.3,   // 기신 지지
    harm: -0.2,           // 용신 극하는 오행
  },
  geokguk: {
    favor: 0.25,          // 격국이 좋아하는 십신
    avoid: -0.25,         // 격국이 싫어하는 십신
    strengthBalance: 0.1, // 신강/신약 균형
    strengthImbalance: -0.1,
  },
  maxRaw: 1.0,
} as const;

// ============================================================
// 점성술 요소별 점수
// ============================================================

/**
 * 트랜짓 태양 점수 (최대 10점)
 * 근거: 태양 별자리 에너지, 계절적 영향
 */
export const TRANSIT_SUN_SCORES = {
  elementRelation: {
    same: 0.4,          // 같은 원소: 에너지 공명
    generatedBy: 0.3,   // 생해주는 관계: 지원
    generates: 0.1,     // 내가 생하는 관계: 소모
    controlledBy: -0.3, // 극당하는 관계: 도전
    controls: 0.15,     // 내가 극하는 관계: 성취
  },
  maxRaw: 1.0,
} as const;

/**
 * 트랜짓 달 점수 (최대 10점)
 * 근거: 달은 감정/직관에 직접 영향
 */
export const TRANSIT_MOON_SCORES = {
  elementRelation: {
    same: 0.35,
    generatedBy: 0.25,
    generates: 0.1,
    controlledBy: -0.25,
    controls: 0.1,
  },
  voidOfCourse: -0.3,   // 보이드 오브 코스
  maxRaw: 1.0,
} as const;

/**
 * 주요 행성 트랜짓 점수 (최대 15점)
 * 행성별 가중치 합이 1.0이 되도록 설계
 */
export const MAJOR_PLANETS_SCORES = {
  // 행성별 가중치 (총합 1.0)
  weights: {
    mercury: 0.15,   // 소통/계약
    venus: 0.20,     // 사랑/재물
    mars: 0.15,      // 행동/에너지
    jupiter: 0.30,   // 행운/확장 (가장 중요)
    saturn: 0.20,    // 시련/성장
  },
  // 각 행성의 어스펙트 점수 (-1 ~ +1)
  aspects: {
    conjunction: 0.5,  // 합 (강력, 행성에 따라 길흉)
    trine: 0.4,        // 삼분 (120도, 가장 조화로움)
    sextile: 0.25,     // 육분 (60도, 좋은 기회)
    square: -0.3,      // 사분 (90도, 긴장/도전)
    opposition: -0.2,  // 충 (180도, 균형 필요)
  },
  // 역행 페널티
  retrograde: {
    mercury: -0.2,    // 소통/계약 주의
    venus: -0.15,     // 관계/재정 주의
    mars: -0.1,       // 행동 지연
    jupiter: -0.05,   // 미미한 영향
    saturn: -0.05,    // 미미한 영향
  },
  maxRaw: 1.0,
} as const;

/**
 * 달 위상 점수 (최대 10점)
 * 근거: 달의 8단계 주기
 */
export const LUNAR_PHASE_SCORES = {
  newMoon: 0.3,         // 신월: 새로운 시작
  waxingCrescent: 0.15, // 초승달: 성장 시작
  firstQuarter: -0.05,  // 상현달: 긴장/도전
  waxingGibbous: 0.2,   // 상현망: 성숙
  fullMoon: 0.4,        // 보름달: 완성/성취 (가장 강력)
  waningGibbous: 0.1,   // 하현망: 수확
  lastQuarter: -0.1,    // 하현달: 반성/정리
  waningCrescent: -0.05,// 그믐달: 휴식/준비
  maxRaw: 0.4,  // fullMoon 기준 정규화
} as const;

/**
 * Solar Return / Progressions 점수 (최대 5점)
 */
export const SOLAR_RETURN_SCORES = {
  exactBirthday: 0.5,     // 생일 당일
  nearBirthday1: 0.35,    // ±1일
  nearBirthday3: 0.2,     // ±3일
  nearBirthday7: 0.1,     // ±7일
  progressionSupport: 0.15,
  progressionChallenge: -0.1,
  maxRaw: 0.5,
} as const;

// ============================================================
// 교차검증 보너스/페널티
// ============================================================

export const CROSS_VERIFICATION_SCORES = {
  bothPositive: 5,        // 사주+점성 모두 긍정
  bothNegative: -3,       // 사주+점성 모두 부정
  mixed: 0,               // 혼합 신호
  elementAlign: 2,        // 일진 오행과 트랜짓 태양 오행 일치
} as const;

// ============================================================
// 등급 임계값
// ============================================================

export const GRADE_THRESHOLDS = {
  grade0: 78,  // 천운: 78점 이상 (~3-8%)
  grade1: 65,  // 아주좋음: 65~77점 (~18-25%)
  grade2: 52,  // 좋음: 52~64점 (~25-35%)
  grade3: 42,  // 보통: 42~51점 (~25-35%)
  // grade4: 42 미만 (나쁨) (~10-15%)
} as const;

// ============================================================
// 점수 계산 헬퍼 함수
// ============================================================

/**
 * 원시 점수를 카테고리 최대 점수로 변환
 */
export function normalizeToCategory(
  rawScore: number,
  maxRaw: number,
  categoryMax: number
): number {
  // rawScore를 0~1 범위로 정규화
  const normalized = Math.max(0, Math.min(1, (rawScore + maxRaw) / (2 * maxRaw)));
  // 카테고리 최대 점수에 매핑 (0 ~ categoryMax)
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
