/**
 * Past Life Data Types
 * 전생 분석 데이터 타입 정의
 */

export type GeokgukType = 'siksin' | 'sanggwan' | 'jeonggwan' | 'pyeongwan' | 'jeongjae' | 'pyeonjae' | 'jeongin' | 'pyeongin';
export type HeavenlyStem = '갑' | '을' | '병' | '정' | '무' | '기' | '경' | '신' | '임' | '계';
export type HouseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface BilingualText {
  ko: string;
  en: string;
}

export interface SoulPatternData {
  type: BilingualText;
  emoji: string;
  title: BilingualText;
  description: BilingualText;
  traits: { ko: string[]; en: string[] };
}

export interface PastLifeThemeData {
  likely: BilingualText;
  talents: BilingualText;
  lessons: BilingualText;
  era?: BilingualText;
}

export interface NodeJourneyData {
  pastPattern: BilingualText;
  release: BilingualText;
  direction: BilingualText;
  lesson: BilingualText;
}

export interface SaturnLessonData {
  lesson: BilingualText;
  challenge: BilingualText;
  mastery: BilingualText;
}

export interface DayMasterMissionData {
  core: BilingualText;
  expression: BilingualText;
  fulfillment: BilingualText;
}
