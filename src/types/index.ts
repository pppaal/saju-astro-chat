/**
 * Shared type definitions for the application
 * Centralizes common interfaces used across components and API
 */

// Import types for local use
import type {
  Locale as LocaleType,
  BirthData as BirthDataType,
  Gender as GenderType,
  DestinyMapRequest as DestinyMapRequestType,
  TarotCard as TarotCardType,
  TarotInterpretRequest as TarotInterpretRequestType,
  DreamRequest as DreamRequestType,
  IChingReadingRequest as IChingReadingRequestType,
  ApiError as ApiErrorType,
  FeedbackRequest as FeedbackRequestType,
  ConsultationTheme as ConsultationThemeType,
} from "@/lib/api/schemas";

// Re-export Zod-inferred types
export type Locale = LocaleType;
export type BirthData = BirthDataType;
export type Gender = GenderType;
export type DestinyMapRequest = DestinyMapRequestType;
export type TarotCard = TarotCardType;
export type TarotInterpretRequest = TarotInterpretRequestType;
export type DreamRequest = DreamRequestType;
export type IChingReadingRequest = IChingReadingRequestType;
export type ApiError = ApiErrorType;
export type FeedbackRequest = FeedbackRequestType;
export type ConsultationTheme = ConsultationThemeType;

// ==========================================
// Five Elements (Ohaeng)
// ==========================================

export type FiveElement = "Wood" | "Fire" | "Earth" | "Metal" | "Water";
export type FiveElementKorean = "목" | "화" | "토" | "금" | "수";

export interface FiveElementBalance {
  Wood: number;
  Fire: number;
  Earth: number;
  Metal: number;
  Water: number;
}

// ==========================================
// Saju Types
// ==========================================

export interface HeavenlyStem {
  korean: string;
  chinese: string;
  english: string;
  element: FiveElement;
  yin_yang: "Yin" | "Yang";
}

export interface EarthlyBranch {
  korean: string;
  chinese: string;
  english: string;
  element: FiveElement;
  animal: string;
  yin_yang: "Yin" | "Yang";
}

export interface Pillar {
  stem: HeavenlyStem;
  branch: EarthlyBranch;
}

export interface FourPillars {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar;
}

export interface DayMaster {
  stem: string;
  element: FiveElement;
  yin_yang: "Yin" | "Yang";
  strength: "strong" | "weak" | "balanced";
}

export interface SajuProfile {
  pillars: FourPillars;
  dayMaster: DayMaster;
  fiveElements: FiveElementBalance;
  hiddenStems?: Record<string, string[]>;
}

// ==========================================
// Astrology Types
// ==========================================

export type ZodiacSign =
  | "Aries"
  | "Taurus"
  | "Gemini"
  | "Cancer"
  | "Leo"
  | "Virgo"
  | "Libra"
  | "Scorpio"
  | "Sagittarius"
  | "Capricorn"
  | "Aquarius"
  | "Pisces";

export type Planet =
  | "Sun"
  | "Moon"
  | "Mercury"
  | "Venus"
  | "Mars"
  | "Jupiter"
  | "Saturn"
  | "Uranus"
  | "Neptune"
  | "Pluto";

export type AspectType =
  | "conjunction"
  | "opposition"
  | "trine"
  | "square"
  | "sextile";

export interface PlanetPosition {
  planet: Planet;
  sign: ZodiacSign;
  degree: number;
  house: number;
  retrograde: boolean;
}

export interface Aspect {
  planet1: Planet;
  planet2: Planet;
  type: AspectType;
  orb: number;
  applying: boolean;
}

export interface NatalChart {
  planets: PlanetPosition[];
  houses: number[];
  aspects: Aspect[];
  ascendant: {
    sign: ZodiacSign;
    degree: number;
  };
  midheaven: {
    sign: ZodiacSign;
    degree: number;
  };
}

// ==========================================
// Tarot Types
// ==========================================

export type TarotSuit = "Major" | "Wands" | "Cups" | "Swords" | "Pentacles";

export interface TarotCardInfo {
  id: string;
  name: string;
  nameKorean: string;
  suit: TarotSuit;
  number: number;
  keywords: string[];
  keywordsKorean: string[];
  upright: string;
  reversed: string;
  element?: FiveElement;
  zodiac?: ZodiacSign;
}

export interface DrawnCard {
  card: TarotCardInfo;
  isReversed: boolean;
  position: string;
  positionMeaning?: string;
}

export interface TarotReading {
  cards: DrawnCard[];
  spread: string;
  theme: string;
  interpretation: string;
  guidance: string;
  affirmation?: string;
}

// ==========================================
// API Response Types
// ==========================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    status: number;
  };
  meta?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
}

// ==========================================
// User Types
// ==========================================

export interface UserProfile {
  id: string;
  email?: string;
  name?: string;
  birthData?: BirthData;
  preferredLocale: string;
  isPremium: boolean;
  createdAt: Date;
}

export interface ConsultationRecord {
  id: string;
  userId: string;
  theme: string;
  locale: string;
  result: string;
  rating?: number;
  feedback?: string;
  createdAt: Date;
}

// ==========================================
// Backend Response Types
// ==========================================

export interface BackendHealthResponse {
  status: "success" | "error";
  message?: string;
  capabilities?: {
    realtime_transits: boolean;
    chart_generation: boolean;
    user_memory: boolean;
    iching_premium: boolean;
    persona_embeddings: boolean;
    tarot_premium: boolean;
    rlhf_learning: boolean;
    badge_system: boolean;
    agentic_rag: boolean;
    hybrid_rag: boolean;
  };
  version?: string;
}

export interface PerformanceMetrics {
  duration_ms: number;
  cached: boolean;
}
