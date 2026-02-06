// src/lib/astrology/advanced/options.ts
export type AstroTheme = "western" | "saju" | "hybrid";

export type HouseSystemType = "Placidus" | "WholeSign" | "Koch" | "Equal" | "Campanus";

export type AstroOptions = {
  theme?: AstroTheme;
  houseSystem?: HouseSystemType;
  nodeType?: "true" | "mean";
  includeMinorAspects?: boolean;
  includeAsteroids?: boolean;
  includeFixedStars?: boolean;
  includeChiron?: boolean;
  includeLilith?: boolean;
  aspectOrb?: number;
  enable?: {
    chiron?: boolean;
    lilith?: false | "true" | "mean";
    pof?: boolean;
  };
};

export const defaultOptions: Required<AstroOptions> = {
  theme: "western",
  houseSystem: "Placidus",
  nodeType: "true",
  includeMinorAspects: false,
  includeAsteroids: false,
  includeFixedStars: false,
  includeChiron: false,
  includeLilith: false,
  aspectOrb: 8,
  enable: { chiron: false, lilith: false, pof: false },
};

export const presets: Record<AstroTheme, Partial<AstroOptions>> = {
  western: {
    houseSystem: "Placidus",
    nodeType: "true",
    includeMinorAspects: false,
    enable: { chiron: true, lilith: "true", pof: true },
  },
  saju: {
    houseSystem: "WholeSign",
    nodeType: "mean",
    includeMinorAspects: false,
    enable: { chiron: false, lilith: false, pof: false },
  },
  hybrid: {
    houseSystem: "WholeSign",
    nodeType: "true",
    includeMinorAspects: true,
    enable: { chiron: true, lilith: "mean", pof: true },
  },
};

export function resolveOptions(input?: AstroOptions): Required<AstroOptions> {
  const theme = input?.theme ?? defaultOptions.theme;
  const base = { ...defaultOptions, ...(presets[theme] ?? {}) };
  return {
    theme,
    houseSystem: (input?.houseSystem ?? base.houseSystem),
    nodeType: (input?.nodeType ?? base.nodeType),
    includeMinorAspects: input?.includeMinorAspects ?? base.includeMinorAspects,
    includeAsteroids: input?.includeAsteroids ?? base.includeAsteroids,
    includeFixedStars: input?.includeFixedStars ?? base.includeFixedStars,
    includeChiron: input?.includeChiron ?? base.includeChiron,
    includeLilith: input?.includeLilith ?? base.includeLilith,
    aspectOrb: input?.aspectOrb ?? base.aspectOrb,
    enable: {
      chiron: input?.enable?.chiron ?? base.enable?.chiron ?? false,
      lilith: input?.enable?.lilith ?? base.enable?.lilith ?? false,
      pof: input?.enable?.pof ?? base.enable?.pof ?? false,
    },
  };
}