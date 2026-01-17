/**
 * @file Calendar API types
 * Extracted from route.ts for modularity
 */

import type { EventCategory, ImportanceGrade } from "@/lib/destiny-map/destinyCalendar";

// Helper type for accessing pillar data with various formats
export interface SajuPillarAccessor {
  heavenlyStem?: { name?: string } | string;
  earthlyBranch?: { name?: string } | string;
  stem?: { name?: string } | string;
  branch?: { name?: string } | string;
}

// Formatted response shape
export interface FormattedDate {
  date: string;
  grade: ImportanceGrade;
  score: number;
  categories: EventCategory[];
  title: string;
  description: string;
  summary: string; // 한줄 요약
  bestTimes: string[]; // 추천 시간대
  sajuFactors: string[];
  astroFactors: string[];
  recommendations: string[];
  warnings: string[];
}

// Location coordinates type
export interface LocationCoord {
  lat: number;
  lng: number;
  tz: string;
}
