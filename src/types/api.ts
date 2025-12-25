/**
 * Shared TypeScript types for API requests and responses
 * Ensures type safety across frontend and backend communication
 */

// ============================================================
// Common Types
// ============================================================

export type Lang = "ko" | "en" | "ja" | "zh" | "es" | "fr" | "de" | "pt" | "ru";

export type Gender = "male" | "female" | "other" | "prefer_not";

export type Theme =
  | "love"
  | "career"
  | "health"
  | "wealth"
  | "today"
  | "month"
  | "year"
  | "family"
  | "life"
  | "chat";

// ============================================================
// Chart Data Types
// ============================================================

export interface ChartData {
  saju?: Record<string, unknown>;
  astro?: Record<string, unknown>;
  advancedAstro?: Record<string, unknown>;
}

export interface BirthInfo {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  gender: Gender;
  latitude: number;
  longitude: number;
  city?: string;
  timezone?: string;
}

// ============================================================
// Counselor API Types
// ============================================================

export interface CounselorPersona {
  sessionCount?: number;
  lastTopics?: string[];
  emotionalTone?: string;
  recurringIssues?: string[];
}

export interface CounselorSession {
  id: string;
  theme?: string;
  summary?: string;
  keyTopics?: string[];
  lastMessageAt?: string;
  createdAt?: string;
}

export interface UserContext {
  persona?: CounselorPersona;
  recentSessions?: CounselorSession[];
  personalityType?: {
    typeCode: string;
    personaName: string;
  };
}

export interface CounselorInitRequest {
  saju?: Record<string, unknown>;
  astro?: Record<string, unknown>;
  advancedAstro?: Record<string, unknown>;
  theme?: Theme;
  birth?: BirthInfo;
}

export interface CounselorInitResponse {
  status: "success" | "error";
  session_id?: string;
  prefetch_time_ms?: number;
  data_summary?: {
    graph_nodes?: number;
    corpus_quotes?: number;
  };
  message?: string;
}

export interface CounselorContextResponse {
  success: boolean;
  persona?: CounselorPersona;
  sessions?: CounselorSession[];
  isReturningUser?: boolean;
  message?: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  id?: string;
}

export interface ChatStreamRequest {
  profile: {
    name?: string;
    birthDate: string;
    birthTime: string;
    city?: string;
    gender: Gender;
    latitude: number;
    longitude: number;
  };
  theme: Theme;
  lang: Lang;
  messages: ChatMessage[];
  cvText?: string;
  saju?: Record<string, unknown>;
  astro?: Record<string, unknown>;
  advancedAstro?: Record<string, unknown>;
  userContext?: UserContext;
}

// ============================================================
// Feedback API Types
// ============================================================

export interface FeedbackRequest {
  service: string;
  theme: Theme;
  sectionId: string;
  helpful: boolean;
  locale: Lang;
  userHash?: string;
  recordId?: string;
  rating?: number;
  userQuestion?: string;
  consultationSummary?: string;
  comment?: string;
}

export interface FeedbackResponse {
  success: boolean;
  message?: string;
}

// ============================================================
// Saju API Types
// ============================================================

export interface SajuCalculationRequest {
  birthDate: string;
  birthTime: string;
  gender: Gender;
  calendarType?: "solar" | "lunar";
  timezone?: string;
  lunarLeap?: boolean;
}

export interface SajuData {
  dayMaster?: {
    heavenlyStem?: string;
    earthlyBranch?: string;
  };
  yearPillar?: {
    heavenlyStem?: string;
    earthlyBranch?: string;
  };
  monthPillar?: {
    heavenlyStem?: string;
    earthlyBranch?: string;
  };
  hourPillar?: {
    heavenlyStem?: string;
    earthlyBranch?: string;
  };
  fiveElements?: Record<string, number>;
  [key: string]: unknown;
}

// ============================================================
// Astrology API Types
// ============================================================

export interface AstrologyCalculationRequest {
  year: number;
  month: number;
  date: number;
  hour: number;
  minute: number;
  latitude: number;
  longitude: number;
  timeZone?: string;
}

export interface PlanetData {
  name: string;
  sign?: string;
  degree?: number;
  house?: number;
  [key: string]: unknown;
}

export interface AstrologyData {
  sun?: PlanetData;
  moon?: PlanetData;
  mercury?: PlanetData;
  venus?: PlanetData;
  mars?: PlanetData;
  jupiter?: PlanetData;
  saturn?: PlanetData;
  ascendant?: {
    sign?: string;
    degree?: number;
  };
  [key: string]: unknown;
}

// ============================================================
// Error Types
// ============================================================

export interface ApiError {
  error: string;
  message?: string;
  details?: unknown;
  statusCode?: number;
}

// ============================================================
// Tarot API Types
// ============================================================

export interface TarotCard {
  id: string;
  name: string;
  nameKo?: string;
  suit?: string;
  number?: number;
  reversed?: boolean;
  image?: string;
}

export interface TarotReading {
  cards: TarotCard[];
  spread: string;
  question?: string;
  interpretation?: string;
}

// ============================================================
// Type Guards
// ============================================================

export function isApiError(response: unknown): response is ApiError {
  return (
    typeof response === "object" &&
    response !== null &&
    "error" in response &&
    typeof (response as ApiError).error === "string"
  );
}

export function isCounselorInitResponse(
  response: unknown
): response is CounselorInitResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    "status" in response &&
    (response as CounselorInitResponse).status === "success"
  );
}
