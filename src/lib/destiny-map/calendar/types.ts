/**
 * Destiny Calendar Types
 * 운명 캘린더 관련 타입 정의
 */

// ============================================================
// Core Types
// ============================================================

export type ImportanceGrade = 0 | 1 | 2 | 3 | 4;
export type EventCategory = "wealth" | "career" | "love" | "health" | "travel" | "study" | "general";

/**
 * 트랜짓 어스펙트 근거 (점성). 구 transit-analysis.ts 의 동명 타입에서 이관한
 * 최소 정의 — 응답 타입 계층(calendarMatrixEvidenceSupport)이 읽는 필드만.
 * v2 경로는 이 필드를 생성하지 않으므로(항상 undefined) 타입 호환용으로만 유지.
 */
export interface TransitAspectEvidence {
  key: string;
  planetA: string;
  planetB: string;
  signA: string;
  signB: string;
  aspect: string;
  orb: number;
  tone: string;
  impactScore: number;
  context?: unknown;
}

export interface ImportantDate {
  date: string;
  grade: ImportanceGrade;
  score: number;
  rawScore?: number;
  adjustedScore?: number;
  displayScore?: number;
  categories: EventCategory[];     // 복수 카테고리 지원
  titleKey: string;                // i18n key for title
  descKey: string;                 // i18n key for description
  ganzhi: string;                  // 干支
  crossVerified: boolean;          // 사주+점성술 모두 확인
  transitSunSign: string;          // 트랜짓 태양 별자리
  sajuFactorKeys: string[];        // 사주 분석 요소 키
  astroFactorKeys: string[];       // 점성술 분석 요소 키
  recommendationKeys: string[];    // 추천 활동 키
  warningKeys: string[];           // 주의사항 키
  confidence?: number;
  confidenceNote?: string;
  crossAgreementPercent?: number;
  /** 사주 ↔ 점성 교차 확인 한 줄 + 신뢰도 % */
  crossCheck?: { line: string; agreementPercent: number };
  /** 대운 / 세운 / 월운 / 일운 — 본명 일간 기준 십신까지 박은 풀 흐름 컨텍스트 */
  longCycleContext?: {
    daeun?: {
      ganji: string;
      ageStart: number;
      ageEnd: number;
      sibsinStem?: string;
      yearsToNext?: number;
      transitionImminent?: boolean;
      nextGanji?: string;
      nextSibsinStem?: string;
    };
    sewoon?: { ganji: string; year: number; sibsinStem?: string };
    wolwoon?: { ganji: string; sibsinStem?: string };
    iljin?: { ganji: string; sibsinStem?: string; sibsinBranch?: string };
  };
  /** 운끼리의 충/합/형 */
  cycleInteractions?: Array<{
    pair: string;
    kind: '천간합' | '천간충' | '지지합' | '지지충' | '지지형' | '지지해' | '지지파' | '자형';
    blurb: string;
  }>;
  /** 점수 분해 — 사주축 / 점성축 표시값 + 두 축 일치도 + 최종 점수. */
  scoreBreakdown?: {
    sajuAxis: number;
    astroAxis: number;
    sajuAxisRaw: number;
    astroAxisRaw: number;
    axisAgreement: 'aligned' | 'mixed' | 'opposed';
    finalScore: number;
  };
  // ── 구 엔진 호환 필드 (v2 경로는 미생성, 응답 타입 계층 호환용) ──
  gongmangStatus?: {
    isEmpty: boolean;
    emptyBranches: string[];
    affectedAreas: string[];
  };
  shinsalActive?: {
    name: string;
    type: 'lucky' | 'unlucky' | 'special';
    affectedArea: string;
  }[];
  energyFlow?: {
    strength: 'very_strong' | 'strong' | 'moderate' | 'weak' | 'very_weak';
    dominantElement: string;
    tonggeunCount: number;
    tuechulCount: number;
  };
  bestHours?: {
    hour: number;
    siGan: string;
    quality: 'excellent' | 'good' | 'neutral' | 'caution';
  }[];
  transitSync?: {
    isMajorTransitYear: boolean;
    transitType?: string;
    synergyType?: 'amplify' | 'clash' | 'balance' | 'neutral';
    synergyScore?: number;
  };
  activityScores?: {
    marriage?: number;
    career?: number;
    investment?: number;
    moving?: number;
    surgery?: number;
    study?: number;
  };
  timeContext?: {
    isPast: boolean;
    isFuture: boolean;
    isToday: boolean;
    daysFromToday: number;
    retrospectiveNote?: string;
  };
  astroAspectEvidence?: TransitAspectEvidence[];
}

export interface CalendarMonth {
  year: number;
  month: number;
  dates: ImportantDate[];
}

// ============================================================
// User Profile Types
// ============================================================

export interface DaeunCycle {
  age: number;
  heavenlyStem: string;
  earthlyBranch: string;
  sibsin?: { cheon: string; ji: string };
}

export interface UserSajuProfile {
  dayMaster: string;
  dayMasterElement: string;
  dayBranch?: string;
  yearBranch?: string;       // 연지 - 삼재/역마/도화 계산용
  birthYear?: number;        // 대운 계산용
  daeunCycles?: DaeunCycle[]; // 대운 10주기
  daeunsu?: number;          // 대운 시작 나이
  // 고급 분석 - 용신/격국
  yongsin?: {
    primary: string;         // 주용신 (목/화/토/금/수)
    secondary?: string;      // 보조용신
    type: string;            // 용신 유형 (억부/조후/통관/병약)
    kibsin?: string;         // 기신 (피해야 할 오행)
  };
  geokguk?: {
    type: string;            // 격국 유형 (정격/편격/종격 등)
    strength: string;        // 신강/신약
  };
  // 사주 원국 정보 (고급 분석용)
  pillars?: {
    year?: { stem: string; branch: string };
    month?: { stem: string; branch: string };
    day?: { stem: string; branch: string };
    time?: { stem: string; branch: string };
  };
}

export interface UserAstroProfile {
  sunSign: string;
  sunElement: string;
  sunLongitude?: number; // 태양 경도 (어스펙트 분석용)
  birthMonth?: number;   // 생일 월 (Solar Return 분석용)
  birthDay?: number;     // 생일 일 (Solar Return 분석용)
  birthDate?: Date | string; // 생년월일 (프로그레스드 문 분석용)
  moonSign?: string;     // 달 별자리 (프로그레스드 문 분석용)
  mcLongitude?: number;  // MC 경도 (Solar Arc 분석용)
  ascLongitude?: number; // ASC 경도 (Solar Arc 분석용)
  // 네이탈 행성 위치 (정확한 어스펙트 분석용)
  natalPlanets?: {
    moon?: number;       // 달 경도
    mercury?: number;    // 수성 경도
    venus?: number;      // 금성 경도
    mars?: number;       // 화성 경도
    jupiter?: number;    // 목성 경도
    saturn?: number;     // 토성 경도
    uranus?: number;
    neptune?: number;
    pluto?: number;
    chiron?: number;
    northNode?: number;
    southNode?: number;
  };
}

// ============================================================
// Fortune Result Types
// ============================================================

// 옛 DailyFortuneResult (love/career/wealth/health 가짜 score 등급) — DB
// 모델 (DailyFortune) + zod schema + interface 통째 정리 (2026-06-06).
// 운명/궁합 LLM 에서 자연어 해석으로 대체.

export interface MonthlyThemeResult {
  year: number;
  month: number;
  mainTheme: string;
  subThemes: string[];
  luckyDays: number[];
  challenges: string[];
  advice: string;
  score: number;
  monthGanzhi: { stem: string; branch: string };
  yongsinMatch: boolean;
}

export interface WeeklyThemeResult {
  startDate: string;
  endDate: string;
  mainTheme: string;
  subThemes: string[];
  luckyDays: number[];
  challenges: string[];
  advice: string;
  score: number;
  bestDayOfWeek: number;
}

export interface PrecomputeResult {
  currentMonth: CalendarMonth;
  nextMonth: CalendarMonth;
  weeklyThemes: WeeklyThemeResult[];
}

// ============================================================
// Retrograde Types
// ============================================================

export interface DynamicRetrogradeInfo {
  planet: string;
  isRetrograde: boolean;
  speed: number;       // 일일 이동 속도 (도/일)
  phase: "direct" | "retrograde" | "stationary-retrograde" | "stationary-direct";
  meaning: string;
  score: number;
}

// ============================================================
// Analysis Types
// ============================================================

export interface YongsinInfo {
  primary: string;      // 주용신 (wood/fire/earth/metal/water)
  secondary?: string;   // 보조용신
  type: string;         // 용신 유형 (억부/조후/통관/병약)
  kibsin?: string;      // 기신 (피해야 할 오행)
}

export interface GeokgukInfo {
  type: string;         // 격국 유형
  strength: string;     // 신강/신약
}

export interface GanzhiResult {
  stem: string;
  branch: string;
  stemElement: string;
  branchElement: string;
}
