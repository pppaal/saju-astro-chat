// src/lib/icp/types.ts
/**
 * ICP (Interpersonal Circumplex) 타입 정의
 */

export type ICPQuizAnswers = Record<string, string>;

export type ICPOctantCode = 'PA' | 'BC' | 'DE' | 'FG' | 'HI' | 'JK' | 'LM' | 'NO';

export interface ICPOctant {
  code: ICPOctantCode;
  name: string;
  korean: string;
  traits: string[];
  traitsKo: string[];
  shadow: string;
  shadowKo: string;
  dominance: number; // -1 to 1
  affiliation: number; // -1 to 1
  description: string;
  descriptionKo: string;
  therapeuticQuestions: string[];
  therapeuticQuestionsKo: string[];
  growthRecommendations: string[];
  growthRecommendationsKo: string[];
}

export interface ICPAnalysis {
  // Axis scores (0-100)
  dominanceScore: number; // 0 = submissive, 100 = dominant
  affiliationScore: number; // 0 = hostile, 100 = friendly

  // Normalized to -1 to 1
  dominanceNormalized: number;
  affiliationNormalized: number;

  // Octant scores (each 0-1)
  octantScores: Record<ICPOctantCode, number>;

  // Primary and secondary styles
  primaryStyle: ICPOctantCode;
  secondaryStyle: ICPOctantCode | null;

  // Style details
  primaryOctant: ICPOctant;
  secondaryOctant: ICPOctant | null;

  // Summary
  summary: string;
  summaryKo: string;

  // Consistency score (how consistent the answers were)
  consistencyScore: number;
}

export interface ICPCompatibility {
  person1Style: ICPOctantCode;
  person2Style: ICPOctantCode;
  score: number; // 0-100
  level: string;
  levelKo: string;
  description: string;
  descriptionKo: string;
  dynamics: {
    strengths: string[];
    strengthsKo: string[];
    challenges: string[];
    challengesKo: string[];
    tips: string[];
    tipsKo: string[];
  };
}
