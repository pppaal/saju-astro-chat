// src/lib/astrology/foundation/types.ts

export type ZodiacKo =
  | "Aries" | "Taurus" | "Gemini" | "Cancer" | "Leo" | "Virgo"
  | "Libra" | "Scorpio" | "Sagittarius" | "Capricorn" | "Aquarius" | "Pisces";

export type HouseSystem = "Placidus" | "WholeSign";

export type AspectType =
  | "conjunction" | "sextile" | "square" | "trine" | "opposition"
  | "semisextile" | "quincunx" | "quintile" | "biquintile";

export type AspectRules = {
  aspects?: AspectType[];
  includeMinor?: boolean;
  maxResults?: number; // default 50
  orbs?: {
    Sun?: number;
    Moon?: number;
    inner?: number;   // Mercury/Venus/Mars
    outer?: number;   // Jupiter..Pluto
    angles?: number;  // ASC/MC
    default?: number; // fallback
  };
  perAspectOrbs?: Partial<Record<AspectType, number>>;
  perPairOrbs?: Record<string, number>;
  scoring?: {
    weights?: { orb?: number; aspect?: number; speed?: number };
  };
};

export type PlanetBase = {
  name: string;       // "Sun" etc.
  longitude: number;  // 0-360
  sign: ZodiacKo;
  degree: number;     // 0-29
  minute: number;     // 0-59
  formatted: string;  // "Aries 12deg 34'"
  house: number;      // 1-12
  speed?: number;     // deg/day
  retrograde?: boolean;
};

export type House = {
  index: number;      // 1-12
  cusp: number;       // 0-360
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

export type AspectEnd = { name: string; kind: "natal" | "transit" | "progressed" | "angle"; house?: number; sign?: ZodiacKo; longitude: number };

export type AspectHit = {
  from: AspectEnd;
  to:   AspectEnd;
  type: AspectType;
  orb: number;        // degrees
  applying?: boolean;
  score?: number;
};

// ===========================
// Extended Points & Returns
// ===========================

export type ProgressionInput = {
  natal: NatalInput;
  targetDate: string; // ISO date for which to calculate progressions
};

export type SolarReturnInput = {
  natal: NatalInput;
  year: number; // Year for which to calculate solar return
};

export type LunarReturnInput = {
  natal: NatalInput;
  month: number; // 1-12
  year: number;
};

export type ProgressedChart = Chart & {
  progressionType: "secondary" | "solarArc";
  yearsProgressed: number;
  progressedDate: string;
};

export type ReturnChart = Chart & {
  returnType: "solar" | "lunar";
  returnYear: number;
  returnMonth?: number;
  exactReturnTime: string; // ISO string of exact return moment
};

export type ExtraPoint = {
  name: string;
  longitude: number;
  sign: ZodiacKo;
  degree: number;
  minute: number;
  formatted: string;
  house: number;
  description?: string;
};

export type ExtendedChart = Chart & {
  chiron?: ExtraPoint;
  lilith?: ExtraPoint;       // Mean Black Moon Lilith
  trueNode?: ExtraPoint;     // already in planets as "True Node"
  partOfFortune?: ExtraPoint;
  vertex?: ExtraPoint;
};

// Narrative facts carrier
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
  chiron?: ExtraPoint;
  lilith?: ExtraPoint;
  partOfFortune?: ExtraPoint;
  vertex?: ExtraPoint;
  aspects?: Record<string, any>;
  elementRatios?: Record<string, number>;
}
