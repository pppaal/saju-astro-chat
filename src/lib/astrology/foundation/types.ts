// src/lib/astrology/foundation/types.ts
export type ZodiacKo =
  | "양자리" | "황소자리" | "쌍둥이자리" | "게자리" | "사자자리" | "처녀자리"
  | "천칭자리" | "전갈자리" | "사수자리" | "염소자리" | "물병자리" | "물고기자리";

export type HouseSystem = "Placidus" | "WholeSign"; // 추후 "Koch" | "Equal" 확장 가능

export type AspectType =
  | "conjunction" | "sextile" | "square" | "trine" | "opposition"
  // optional minors
  | "semisextile" | "quincunx" | "quintile" | "biquintile";

export type AspectRules = {
  aspects?: AspectType[];
  includeMinor?: boolean; // true면 semisextile/quincunx/… 포함
  maxResults?: number; // default 50
  orbs?: {
    Sun?: number;
    Moon?: number;
    inner?: number;   // Mercury/Venus/Mars
    outer?: number;   // Jupiter..Pluto
    angles?: number;  // ASC/MC
    default?: number; // fallback
  };
  perAspectOrbs?: Partial<Record<AspectType, number>>; // 각별 기본 오브
  perPairOrbs?: Record<string, number>; // "Sun|Moon|trine": 6 처럼 세밀 제어
  scoring?: {
    weights?: { orb?: number; aspect?: number; speed?: number };
  };
};

export type PlanetBase = {
  name: string;       // "Sun" etc.
  longitude: number;  // 0–360
  sign: ZodiacKo;
  degree: number;     // 0–29
  minute: number;     // 0–59
  formatted: string;  // "양자리 12° 34'"
  house: number;      // 1–12
  speed?: number;     // deg/day
  retrograde?: boolean;
};

export type House = {
  index: number;      // 1–12
  cusp: number;       // 0–360
  sign: ZodiacKo;
  formatted: string;
};

export type ChartMeta = {
  jdUT: number;
  isoUTC: string;
  timeZone: string;
  latitude: number;
  longitude: number;
  houseSystem: HouseSystem;
};

export type Chart = {
  planets: PlanetBase[];
  ascendant: PlanetBase; // name: "Ascendant"
  mc: PlanetBase;        // name: "MC"
  houses: House[];
  meta?: ChartMeta;
};

export type NatalInput = {
  year: number; month: number; date: number;
  hour: number; minute: number;
  latitude: number; longitude: number; // East +, West -
  timeZone: string; // IANA
};

export type TransitInput = {
  iso: string;        // "YYYY-MM-DDTHH:mm:ss"
  latitude: number; longitude: number;
  timeZone: string;   // IANA
};

export type AspectEnd = { name: string; kind: "natal" | "transit" | "angle"; house?: number; sign?: ZodiacKo; longitude: number };

export type AspectHit = {
  from: AspectEnd;
  to:   AspectEnd;
  type: AspectType;
  orb: number;        // degrees
  applying?: boolean; // 접근중 여부
  score?: number;     // 가중 점수(정렬용)
};

// src/lib/astrology/foundation/types.ts

// --- (기존 코드 아래에 이어서 추가) ---

// 점성학 요약 정보(AI-Narrative용)
export interface AstrologyChartFacts {
  sun: PlanetBase;
  moon: PlanetBase;
  mercury?: PlanetBase;
  venus?: PlanetBase;
  mars?: PlanetBase;
  jupiter?: PlanetBase;
  saturn?: PlanetBase;
  uranus?: PlanetBase;
  neptune?: PlanetBase;
  pluto?: PlanetBase;
  asc?: PlanetBase;
  aspects?: Record<string, any>;
  elementRatios?: Record<string, number>; // 불-흙-공기-물 비율
}