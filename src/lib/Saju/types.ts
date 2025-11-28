 //src/lib/Saju/types.ts

// --- 기본 타입 ---
export type FiveElement = '목' | '화' | '토' | '금' | '수';
export type YinYang = '양' | '음';
export type CalendarType = 'solar' | 'lunar';

// 십성(예시 목록: 실제 프로젝트 정의에 맞게 보강 가능)
export type SibsinKind =
  | '비견' | '겁재'
  | '식신' | '상관'
  | '편재' | '정재'
  | '편관' | '정관'
  | '편인' | '정인';

// --- 간지(干支) 및 십성(十星) 관련 타입 ---

export interface StemBranchInfo {
  name: string;            // 표기명(간지 문자: 甲, 乙, 丙 ... / 子, 丑, 寅 ...)
  element: FiveElement;    // 오행
  yin_yang: YinYang;       // 음/양
  // 확장 포인트(선택): 한자/영문 등이 필요하면 아래 주석 해제
  // hanja?: string;
  // romanized?: string;
}

export interface DayMaster extends StemBranchInfo {}

export interface SibsinInput {
  element: FiveElement;
  yin_yang: YinYang;
}

// --- 사주 팔자 구조 관련 타입 ---

export interface PillarGanjiData {
  name: string;                 // 간지명(예: 甲, 子 등)
  element: FiveElement;         // 오행
  yin_yang: YinYang;            // 음/양 (추가)
  sibsin: SibsinKind | string;  // 십성: 가능한 한 SibsinKind 사용, 불명/특수는 string 허용
}

// 지장간: 지지별로 최대 3층(초기/중기/정기)
export interface JijangganSlot {
  name: string;
  sibsin: SibsinKind | string;
}
export interface JijangganData {
  chogi?: JijangganSlot;
  junggi?: JijangganSlot;
  jeonggi?: JijangganSlot;
  // 혹은 보다 유연하게:
  // slots: JijangganSlot[]; // 순서: 초기→중기→정기
}

export interface PillarData {
  heavenlyStem: PillarGanjiData;   // 천간
  earthlyBranch: PillarGanjiData;  // 지지
  jijanggan: JijangganData;        // 지장간
}

// 4주 컨테이너(사용 편의)
export interface SajuPillars {
  year: PillarData;
  month: PillarData;
  day: PillarData;
  time: PillarData;
}

// --- 공통 키 타입(관계/신살 등에서 사용) ---
export type PillarKind = 'year' | 'month' | 'day' | 'time';

// --- 관계(합/충/형/파/해/원진/삼합/육합/방합/공망) 결과 타입 ---
export interface RelationHit {
  kind:
    | '천간합' | '천간충'
    | '지지육합' | '지지삼합' | '지지방합'
    | '지지충' | '지지형' | '지지파' | '지지해' | '원진'
    | '공망';
  pillars: PillarKind[]; // 관계에 해당하는 기둥들
  detail?: string;       // 예: "甲-己 합화토", "子-丑 육합"
  note?: string;
}

// --- 12운성 타입 ---
export type TwelveStage =
  | '장생' | '목욕' | '관대' | '임관' | '왕지'
  | '쇠' | '병' | '사' | '묘' | '절' | '태' | '양';

// --- 신살 결과 타입 ---
export interface ShinsalHit {
  kind:
    | '장성' | '반안' | '재살' | '천살' | '월살' | '망신'
    | '역마' | '화개' | '겁살' | '육해' | '화해' | '괘살'
    | '길성' | '흉성';
  pillars: PillarKind[]; // 해당 기둥(들)
  target?: string;       // 해당 지지/천간 이름
  detail?: string;       // 설명 노트
}

// --- 운세(運勢) 관련 타입 ---

export interface UnseData {
  heavenlyStem: string; // 운세 천간명
  earthlyBranch: string; // 운세 지지명
  sibsin: {
    cheon: SibsinKind | string; // 천간 기준 십성
    ji: SibsinKind | string;    // 지지 기준 십성
  };
}

export interface DaeunData extends UnseData {
  age: number; // 시작 나이 또는 해당 대운의 기준 나이
}

export interface YeonunData extends UnseData {
  year: number; // 해당 연도(서기)
}

export interface WolunData extends UnseData {
  year: number;
  month: number; // 1~12
}

export interface IljinData extends UnseData {
  year: number;
  month: number;
  day: number;
  isCheoneulGwiin: boolean; // 천을귀인 여부
}

// --- 요약 분석 결과 타입 (AI Narrative / 분석용) ---
export interface SajuFacts {
  /** 일간 (예: 갑목, 을목...) */
  dayMaster: string;

  /** 십신 리스트 (중복 가능, ex: ["비견","편재","정재"]) */
  sibsin: SibsinKind[] | string[];

  /** 주요 신살 리스트 (표현형) */
  shinsal: string[];

  /** 오행 비율 (목화토금수 값 비율, 0~1 합계=1) */
  elementStats?: Record<FiveElement, number>;

  /** 음양 비율 */
  yinYangRatio?: { yin: number; yang: number };

  /** 대운/세운 등 (필요 최소치만) */
  unse?: {
    대운?: string;
    세운?: string;
    월운?: string;
    일운?: string;
  };

  /** 관계 해석 결과 (optional) */
  relations?: {
    합충형?: string;
    관성관계?: string;
    기타?: string;
  };

  /** 요약 점수 혹은 분석 지수 */
  fateIndex?: number;
}