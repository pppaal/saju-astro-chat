/**
 * src/lib/destiny-map/types.ts
 * 타입 정의 전용 — DestinyMap 내부 데이터 구조 타입 선언
 */

export interface Pillar {
  heavenlyStem?: string;
  earthlyBranch?: string;
  ganji?: string;
}

export interface SajuResult {
  dayMaster?: { name?: string; element?: string };
  fiveElements?: Record<string, number>;
  pillars?: { year?: Pillar; month?: Pillar; day?: Pillar; time?: Pillar };
  unse?: {
    daeun?: Array<{ age?: number; ganji?: string }>;
  };
}

export interface AstrologyResult {
  facts?: {
    sun?: { sign?: string };
    moon?: { sign?: string };
    venus?: { sign?: string };
    mars?: { sign?: string };
    elementRatios?: Record<string, number>;
  };
  ascendant?: { sign?: string };
  dominantElement?: string;
  dominantPlanet?: string;
}

export interface CombinedResult {
  saju: SajuResult;
  astrology: AstrologyResult;
  summary?: string;
}