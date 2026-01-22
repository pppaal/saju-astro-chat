/**
 * @file History page type definitions
 * Extracted from page.tsx for modularity
 */

export type ServiceRecord = {
  id: string;
  date: string;
  service: string;
  theme?: string;
  summary?: string;
  type: string;
  content?: string;
};

export type DailyHistory = {
  date: string;
  records: ServiceRecord[];
};

export type DestinyMapContent = {
  id: string;
  theme: string;
  summary: string;
  fullReport?: string;
  createdAt: string;
  locale?: string;
  userQuestion?: string;
};

export type IChingContent = {
  question?: string;
  primaryHexagram: {
    number: number;
    name: string;
    symbol: string;
    binary?: string;
    judgment?: string;
    image?: string;
  };
  hexagramLines?: { value: number; isChanging: boolean }[];
  changingLines?: { index: number; text: string }[];
  resultingHexagram?: {
    number: number;
    name: string;
    symbol: string;
    binary?: string;
    judgment?: string;
  } | null;
  aiInterpretation?: {
    overview: string;
    changing: string;
    advice: string;
  } | null;
  locale?: string;
  timestamp?: string;
};

export type CalendarContent = {
  id: string;
  date: string;
  grade: number;
  score: number;
  title: string;
  description: string;
  summary?: string;
  categories: string[];
  bestTimes?: string[];
  sajuFactors?: string[];
  astroFactors?: string[];
  recommendations?: string[];
  warnings?: string[];
  createdAt: string;
};

export type TarotCard = {
  name: string;
  nameKo?: string;
  isReversed: boolean;
  position?: string;
  image?: string;
};

export type TarotCardInsight = {
  position: string;
  card_name: string;
  is_reversed: boolean;
  interpretation: string;
};

export type TarotContent = {
  categoryId: string;
  spreadId: string;
  spreadTitle: string;
  cards: TarotCard[];
  userQuestion?: string;
  overallMessage?: string;
  cardInsights?: TarotCardInsight[];
  guidance?: string;
  affirmation?: string;
};

export type NumerologyContent = {
  birthDate: string;
  name: string;
  lifePath: number;
  expression: number;
  soulUrge: number;
  personality: number;
  personalYear?: number;
  date: string;
};

export type ICPContent = {
  id: string;
  primaryStyle: string;
  secondaryStyle: string | null;
  dominanceScore: number;
  affiliationScore: number;
  octantScores: Record<string, number>;
  analysisData: {
    description: string;
    descriptionKo?: string;
    strengths: string[];
    strengthsKo?: string[];
    challenges: string[];
    challengesKo?: string[];
  };
  createdAt: string;
};

export type PersonalityCompatibilityContent = {
  id: string;
  person1: {
    name?: string;
    icp: {
      primaryStyle: string;
      secondaryStyle: string | null;
      dominanceScore: number;
      affiliationScore: number;
      octantScores: Record<string, number>;
    };
    persona: {
      typeCode: string;
      personaName: string;
      energyScore: number;
      cognitionScore: number;
      decisionScore: number;
      rhythmScore: number;
    };
  };
  person2: {
    name?: string;
    icp: {
      primaryStyle: string;
      secondaryStyle: string | null;
      dominanceScore: number;
      affiliationScore: number;
      octantScores: Record<string, number>;
    };
    persona: {
      typeCode: string;
      personaName: string;
      energyScore: number;
      cognitionScore: number;
      decisionScore: number;
      rhythmScore: number;
    };
  };
  compatibility: {
    crossSystemScore: number;
    icpScore: number;
    personaScore: number;
    level: string;
    levelKo?: string;
    description: string;
    descriptionKo?: string;
  };
  createdAt: string;
};

export type DestinyMatrixContent = {
  id: string;
  reportType: 'timing' | 'themed';
  period?: 'daily' | 'monthly' | 'yearly' | 'comprehensive';
  theme?: 'love' | 'career' | 'wealth' | 'health' | 'family';
  title: string;
  summary?: string;
  overallScore?: number;
  grade?: string;
  reportData: any; // Full TimingAIPremiumReport or ThemedAIPremiumReport
  pdfGenerated: boolean;
  locale: string;
  createdAt: string;
  updatedAt: string;
};

export type ServiceConfig = {
  icon: string;
  titleKey: string;
  descKey: string;
  color: string;
};
