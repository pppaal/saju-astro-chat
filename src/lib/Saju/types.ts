// src/lib/Saju/types.ts

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
  name: string;            // 표기명(한글)
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
  name: string;             // 간지명(예: 갑, 자 등)
  element: FiveElement;     // 해당 간지의 오행
  sibsin: SibsinKind | string; // 십성: 가능한 한 SibsinKind 사용, 불명/특수는 string 허용
}

// 지장간: 지지별로 최대 3층(초기/중기/정기)
// 일부 지지는 2개 또는 1개만 있을 수 있으므로 선택적 필드로
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