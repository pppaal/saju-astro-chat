// src/lib/Saju/types.ts

// --- 기본 타입 ---
export type FiveElement = '목' | '화' | '토' | '금' | '수';
export type YinYang = '양' | '음';
export type CalendarType = 'solar' | 'lunar';

// --- 간지(干支) 및 십성(十星) 관련 타입 ---

export interface StemBranchInfo {
  name: string;
  element: FiveElement;
  yin_yang: YinYang;
}

export interface DayMaster extends StemBranchInfo {}

export interface SibsinInput {
  element: FiveElement;
  yin_yang: YinYang;
}

// --- 사주 팔자 구조 관련 타입 ---

export interface PillarGanjiData {
  name: string;
  element: FiveElement;
  sibsin: string;
}

export interface JijangganData {
  chogi: { name: string; sibsin: string; };
  junggi: { name: string; sibsin: string; };
  jeonggi: { name: string; sibsin: string; };
}

export interface PillarData {
  heavenlyStem: PillarGanjiData;
  earthlyBranch: PillarGanjiData;
  jijanggan: JijangganData;
}

// --- 운세(運勢) 관련 타입 ---

export interface UnseData {
  heavenlyStem: string;
  earthlyBranch: string;
  sibsin: {
    cheon: string;
    ji: string;
  };
}

export interface DaeunData extends UnseData {
  age: number;
}

export interface YeonunData extends UnseData {
  year: number;
}

export interface WolunData extends UnseData {
  year: number;
  month: number;
}

export interface IljinData extends UnseData {
  year: number;
  month: number;
  day: number;
  isCheoneulGwiin: boolean;
}