export interface PersonaQuizAnswers {
  [questionId: string]: string | undefined;
}

// Legacy Big 5 / MBTI-like profile kept for backward compatibility
export interface PersonalityProfile {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;

  introversion: number;
  intuition: number;
  thinking: number;
  perceiving: number;

  enneagram: { [type: string]: number };
}

export type PersonaAxisKey = 'energy' | 'cognition' | 'decision' | 'rhythm';
export type PersonaPole =
  | 'radiant' | 'grounded'
  | 'visionary' | 'structured'
  | 'logic' | 'empathic'
  | 'flow' | 'anchor';

export interface PersonaAxisResult {
  pole: PersonaPole;
  score: number; // 0-100 position on spectrum (0=left/grounded/structured/empathic/anchor, 100=right/radiant/visionary/logic/flow)
}

export interface PersonaArchetype {
  code: string;          // e.g., RVLA
  name: string;          // e.g., "Starforge Navigator"
  summary: string;
  strengths: string[];
  cautions: string[];
  idealRoles: string[];
  growth: string[];
  compatibilityHint: string;
}

export interface PersonaAnalysis {
  // Core persona
  title: string;
  summary: string;
  typeCode: string;
  personaName: string;
  axes: Record<PersonaAxisKey, PersonaAxisResult>;
  consistencyScore?: number;
  consistencyLabel?: string;

  // Colors + highlights
  primaryColor: string;
  secondaryColor: string;
  strengths: string[];
  challenges: string[];
  career: string;
  relationships: string;
  guidance: string;
  growthTips: string[];
  keyMotivations: string[];
  recommendedRoles: string[];
  compatibilityHint: string;

  // Legacy profile for existing consumers
  profile: PersonalityProfile;
}
