/**
 * @file KarmaTab types
 * Extracted from KarmaTab.tsx for modularity
 */

// Extended SajuData for Karma tab specific fields
export interface SajuDataExtended {
  dayMaster?: { name?: string; element?: string; heavenlyStem?: string };
  fourPillars?: {
    day?: { heavenlyStem?: string };
    [key: string]: unknown;
  };
  fiveElements?: Record<string, number>;
  advancedAnalysis?: {
    sinsal?: {
      luckyList?: Array<string | { name?: string; shinsal?: string }>;
      unluckyList?: Array<string | { name?: string; shinsal?: string }>;
    };
  };
}

export interface PlanetData {
  name?: string;
  house?: number;
  sign?: string;
}

export interface DayMasterInfo {
  emoji: string;
  simpleKo: string;
  simpleEn: string;
  metaphorKo: string;
  metaphorEn: string;
  strengthKo: string;
  strengthEn: string;
  watchOutKo: string;
  watchOutEn: string;
  luckyColorKo: string;
  luckyColorEn: string;
}

export interface FiveElementInfo {
  emoji: string;
  nameKo: string;
  nameEn: string;
  simpleKo: string;
  simpleEn: string;
  likeKo: string;
  likeEn: string;
  tooMuchKo: string;
  tooMuchEn: string;
  tooLittleKo: string;
  tooLittleEn: string;
}

export interface ShinsalInfo {
  emoji: string;
  typeKo: string;
  typeEn: string;
  simpleKo: string;
  simpleEn: string;
  storyKo: string;
  storyEn: string;
  adviceKo: string;
  adviceEn: string;
  isLucky: boolean;
}

export interface NorthNodeInfo {
  emoji: string;
  titleKo: string;
  titleEn: string;
  simpleKo: string;
  simpleEn: string;
  lessonKo: string;
  lessonEn: string;
  tipKo: string;
  tipEn: string;
}

export interface SaturnInfo {
  emoji: string;
  lessonKo: string;
  lessonEn: string;
  challengeKo: string;
  challengeEn: string;
  rewardKo: string;
  rewardEn: string;
}
