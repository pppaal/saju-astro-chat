// src/components/destiny-map/chat-types.ts
// Type definitions for Chat component - replacing 'any' types

import type { LangKey } from "./chat-i18n";
import type { Message, UserContext } from "./chat-constants";

// Profile type for chat component
export interface ChatProfile {
  name?: string;
  birthDate?: string;
  birthTime?: string;
  city?: string;
  gender?: string;
  latitude?: number;
  longitude?: number;
}

// Saju (Four Pillars) data structure
export interface SajuPillar {
  stem: string;
  branch: string;
  stemKo?: string;
  branchKo?: string;
  element?: string;
  animal?: string;
}

export interface SajuData {
  yearPillar?: SajuPillar;
  monthPillar?: SajuPillar;
  dayPillar?: SajuPillar;
  hourPillar?: SajuPillar;
  dayMaster?: string;
  dayMasterElement?: string;
  fiveElements?: Record<string, number>;
  dominantElement?: string;
  weakElement?: string;
  tenGods?: Record<string, string>;
  compatibility?: {
    harmonies?: string[];
    clashes?: string[];
  };
}

// Planet data for astrology
export interface Planet {
  name: string;
  sign: string;
  signKo?: string;
  degree?: number;
  house?: number;
  retrograde?: boolean;
}

// House data for astrology
export interface House {
  number: number;
  sign: string;
  degree?: number;
  planets?: string[];
}

// Aspect data for astrology
export interface Aspect {
  planet1: string;
  planet2: string;
  type: string;
  degree?: number;
  orb?: number;
}

// Main astrology data structure
export interface AstroData {
  planets?: Planet[];
  houses?: House[];
  aspects?: Aspect[];
  ascendant?: {
    sign: string;
    degree?: number;
  };
  midheaven?: {
    sign: string;
    degree?: number;
  };
  sunSign?: string;
  moonSign?: string;
  risingSign?: string;
}

// Advanced astrology features
export interface AdvancedAstroData {
  draconic?: {
    planets?: Planet[];
    ascendant?: { sign: string; degree?: number };
  };
  harmonics?: {
    harmonic: number;
    planets?: Planet[];
  }[];
  progressions?: {
    type: string;
    date: string;
    planets?: Planet[];
  };
  solarReturn?: {
    year: number;
    planets?: Planet[];
    houses?: House[];
  };
  lunarReturn?: {
    month: string;
    planets?: Planet[];
  };
  compositeChart?: AstroData;
}

// Chat component props
export interface ChatProps {
  profile: ChatProfile;
  initialContext?: string;
  lang?: LangKey;
  theme?: string;
  seedEvent?: string;
  saju?: SajuData;
  astro?: AstroData;
  advancedAstro?: AdvancedAstroData;
  // Premium features
  userContext?: UserContext;
  chatSessionId?: string;
  onSaveMessage?: (userMsg: string, assistantMsg: string) => void;
  autoScroll?: boolean;
  // RAG session ID from /counselor/init prefetch
  ragSessionId?: string;
  // Auto-send initial seeded question
  autoSendSeed?: boolean;
}

// Chat API request payload
export interface ChatPayload {
  name?: string;
  birthDate?: string;
  birthTime?: string;
  latitude?: number;
  longitude?: number;
  gender?: string;
  city?: string;
  theme: string;
  lang: LangKey;
  messages: Message[];
  cvText?: string;
  saju?: SajuData;
  astro?: AstroData;
  advancedAstro?: AdvancedAstroData;
  userContext?: UserContext;
}

// PDF text content item (from pdfjs-dist)
export interface PDFTextItem {
  str: string;
  dir?: string;
  transform?: number[];
  width?: number;
  height?: number;
  fontName?: string;
}
