export type Phase = 'birth-input' | 'dream-input' | 'analyzing' | 'result';

export interface UserProfile {
  name?: string;
  birthDate?: string;
  birthTime?: string;
  birthCity?: string;
  gender?: 'M' | 'F';
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export interface GuestBirthInfo {
  birthDate: string;
  birthTime: string;
  gender: 'M' | 'F';
  birthCity?: string;
}

export interface Recommendation {
  title: string;
  detail: string;
}

export interface InsightResponse {
  summary?: string;
  fromFallback?: boolean;
  dreamSymbols?: {
    label: string;
    meaning: string;
    interpretations?: {
      jung?: string;
      stoic?: string;
      tarot?: string;
    };
  }[];
  crossInsights?: string[];
  recommendations?: (string | Recommendation)[];
  themes?: { label: string; weight: number }[];
  culturalNotes?: {
    korean?: string;
    western?: string;
    chinese?: string;
    islamic?: string;
  };
  luckyElements?: {
    luckyNumbers?: number[];
    luckyColors?: string[];
    advice?: string;
  };
  celestial?: {
    moon_phase?: {
      name?: string;
      korean?: string;
      emoji?: string;
      dream_meaning?: string;
    };
  };
  cosmicInfluence?: {
    moonPhaseEffect?: string;
    planetaryInfluence?: string;
    overallEnergy?: string;
  };
  premium_features?: {
    taemong?: {
      is_taemong?: boolean;
      primary_symbol?: {
        symbol?: string;
        child_trait?: string;
        gender_hint?: string;
        interpretation?: string;
      };
    };
    combinations?: {
      combination?: string;
      meaning?: string;
      interpretation?: string;
      is_lucky?: boolean;
    }[];
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
