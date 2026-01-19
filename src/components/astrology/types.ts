// src/components/astrology/types.ts
// Type definitions for ResultDisplay component

export interface HouseData {
  cusp: number;
  formatted: string;
  sign?: string;
}

export interface AspectData {
  planet1?: string;
  planet2?: string;
  type?: string;
  orb?: number;
  from?: string | { name?: string };
  to?: string | { name?: string };
  aspect?: string;
  score?: number;
}

export interface AdvancedPoint {
  name?: string;
  key?: string;
  formatted?: string;
  sign?: string;
  house?: number;
  speed?: number;
  retrograde?: boolean;
  rx?: boolean;
}

export interface AdvancedOptions {
  houseSystem?: string;
  theme?: string;
  nodeType?: string;
  includeMinorAspects?: boolean;
  enable?: {
    chiron?: boolean;
    lilith?: boolean;
    pof?: boolean;
  };
  [key: string]: unknown;
}

export interface AdvancedMeta {
  engine?: string;
  version?: string;
  seVersion?: string;
  sweVersion?: string;
  nodeType?: string;
  houseSystem?: string;
  includeMinorAspects?: boolean;
  [key: string]: unknown;
}

export interface AdvancedData {
  options?: AdvancedOptions;
  meta?: AdvancedMeta;
  houses?: HouseData[];
  points?: AdvancedPoint[];
  aspectsPlus?: AspectData[];
}

// Localized planet type (extends PlanetData with localized name)
export interface LocalizedPlanet {
  name: string;
  formatted: string;
  house?: number;
  speed?: number;
  retrograde?: boolean;
}

export interface LocalizedHouse {
  cusp: number;
  formatted: string;
}

export type LocaleKey = 'en' | 'ko' | 'zh' | 'ar' | 'es';
