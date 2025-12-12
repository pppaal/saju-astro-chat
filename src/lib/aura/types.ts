export interface AuraQuizAnswers {
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

export type AuraAxisKey = 'energy' | 'cognition' | 'decision' | 'rhythm';
export type AuraPole =
  | 'radiant' | 'grounded'
  | 'visionary' | 'structured'
  | 'logic' | 'empathic'
  | 'flow' | 'anchor';

export interface AuraAxisResult {
  pole: AuraPole;
  score: number; // 0-100 toward the dominant pole
}

export interface AuraArchetype {
  code: string;          // e.g., RVLA
  name: string;          // e.g., "Starforge Navigator"
  summary: string;
  strengths: string[];
  cautions: string[];
  idealRoles: string[];
  growth: string[];
  compatibilityHint: string;
}

export interface AuraAnalysis {
  // Core persona
  title: string;
  summary: string;
  typeCode: string;
  personaName: string;
  axes: Record<AuraAxisKey, AuraAxisResult>;
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
  keyMotivations: string[];
  recommendedRoles: string[];
  compatibilityHint: string;

  // Legacy profile for existing consumers
  profile: PersonalityProfile;
}
