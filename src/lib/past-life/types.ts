// src/lib/past-life/types.ts
/**
 * Shared types for Past Life feature
 */

export interface PastLifeResult {
  // Soul Pattern
  soulPattern: {
    type: string;
    emoji: string;
    title: string;
    description: string;
    traits: string[];
  };
  // Past Life Theme
  pastLife: {
    likely: string;
    talents: string;
    lessons: string;
    era?: string;
  };
  // Soul Journey (South Node -> North Node)
  soulJourney: {
    pastPattern: string;
    releasePattern: string;
    currentDirection: string;
    lessonToLearn: string;
  };
  // Karmic Debts
  karmicDebts: Array<{
    area: string;
    description: string;
    healing: string;
  }>;
  // Saturn Lesson
  saturnLesson: {
    lesson: string;
    challenge: string;
    mastery: string;
  };
  // Talents Carried
  talentsCarried: string[];
  // This Life Mission
  thisLifeMission: {
    core: string;
    expression: string;
    fulfillment: string;
  };
  // Karma Score
  karmaScore: number;
  // Combined Narrative - 개인화된 전생 스토리 (무료 버전)
  combinedNarrative?: string;
  // Raw data for display
  geokguk?: string;
  northNodeHouse?: number;
  saturnHouse?: number;
  dayMaster?: string;
}