/**
 * Lightweight astrology “engine” that fabricates a deterministic chart from
 * birth data. This keeps the UI responsive without needing an external
 * ephemeris. Replace with a proper library (e.g., Swiss Ephemeris) when ready.
 */

export type AstrologyEngineInput = {
  date: string; // ISO-like: YYYY-MM-DD
  time: string; // 24h: HH:mm or HH:mm:ss
  latitude: number;
  longitude: number;
};

export type AstroPlanet = {
  name: string;
  sign: string;
  house: number;
  degree: number;
  retrograde: boolean;
};

export type AstroHouse = {
  index: number;
  cusp: number;
  sign: string;
};

export type AstroAspect = {
  from: string;
  to: string;
  type: "conjunction" | "sextile" | "square" | "trine" | "opposition";
  orb: number;
};

export type AstrologyEngineResult = {
  metadata: {
    date: string;
    time: string;
    latitude: number;
    longitude: number;
    localSiderealTime: string;
  };
  dominantElement: "Fire" | "Earth" | "Air" | "Water";
  modalityEmphasis: "Cardinal" | "Fixed" | "Mutable";
  planets: AstroPlanet[];
  houses: AstroHouse[];
  aspects: AstroAspect[];
  summary: string;
  error?: string;
};

const SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

const ELEMENT_BY_SIGN: Record<string, AstrologyEngineResult["dominantElement"]> = {
  Aries: "Fire",
  Taurus: "Earth",
  Gemini: "Air",
  Cancer: "Water",
  Leo: "Fire",
  Virgo: "Earth",
  Libra: "Air",
  Scorpio: "Water",
  Sagittarius: "Fire",
  Capricorn: "Earth",
  Aquarius: "Air",
  Pisces: "Water",
};

const MODALITY_BY_SIGN: Record<string, AstrologyEngineResult["modalityEmphasis"]> = {
  Aries: "Cardinal",
  Taurus: "Fixed",
  Gemini: "Mutable",
  Cancer: "Cardinal",
  Leo: "Fixed",
  Virgo: "Mutable",
  Libra: "Cardinal",
  Scorpio: "Fixed",
  Sagittarius: "Mutable",
  Capricorn: "Cardinal",
  Aquarius: "Fixed",
  Pisces: "Mutable",
};

const PLANET_NAMES = [
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
];

function hashString(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return Math.abs(h >>> 0);
}

function randomFromHash(hash: number, min = 0, max = 1) {
  const normalized = (hash % 10000) / 10000;
  return min + normalized * (max - min);
}

function pick<T>(arr: T[], hash: number): T {
  const idx = Math.floor(randomFromHash(hash, 0, arr.length));
  return arr[idx];
}

function pseudoLocalSiderealTime(date: string, time: string, lon: number): string {
  const baseHash = hashString(`${date}T${time}-${lon}`);
  const hours = Math.floor(randomFromHash(baseHash, 0, 24));
  const minutes = Math.floor(randomFromHash(baseHash >> 3, 0, 60));
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function fabricatePlanets(seed: string): AstroPlanet[] {
  return PLANET_NAMES.map((name, idx) => {
    const h = hashString(`${seed}-${name}-${idx}`);
    const degree = Number(randomFromHash(h, 0, 30).toFixed(2));
    const sign = pick(SIGNS, h >> 2);
    return {
      name,
      sign,
      house: Math.max(1, Math.min(12, Math.floor(randomFromHash(h >> 4, 1, 13)))),
      degree,
      retrograde: randomFromHash(h >> 6, 0, 1) > 0.65,
    };
  });
}

function fabricateHouses(seed: string): AstroHouse[] {
  const ascIndex = Math.floor(randomFromHash(hashString(`${seed}-asc`), 0, 12));
  return Array.from({ length: 12 }).map((_, i) => {
    const idx = (ascIndex + i) % 12;
    const cusp = Number(randomFromHash(hashString(`${seed}-house-${i}`), 0, 30).toFixed(2));
    return {
      index: i + 1,
      cusp,
      sign: SIGNS[idx],
    };
  });
}

function fabricateAspects(planets: AstroPlanet[], seed: string): AstroAspect[] {
  const aspects: AstroAspect[] = [];
  const aspectTypes: AstroAspect["type"][] = ["conjunction", "sextile", "square", "trine", "opposition"];

  for (let i = 0; i < planets.length; i += 1) {
    for (let j = i + 1; j < planets.length; j += 1) {
      const hash = hashString(`${seed}-${planets[i].name}-${planets[j].name}`);
      if (randomFromHash(hash, 0, 1) > 0.6) continue;
      aspects.push({
        from: planets[i].name,
        to: planets[j].name,
        type: pick(aspectTypes, hash),
        orb: Number(randomFromHash(hash >> 3, 0, 6).toFixed(2)),
      });
    }
  }
  return aspects.slice(0, 10);
}

function dominantElementFromPlanets(planets: AstroPlanet[]): AstrologyEngineResult["dominantElement"] {
  const tally: Record<AstrologyEngineResult["dominantElement"], number> = {
    Fire: 0,
    Earth: 0,
    Air: 0,
    Water: 0,
  };
  planets.forEach((planet) => {
    tally[ELEMENT_BY_SIGN[planet.sign]] += 1;
  });
  return (Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "Fire") as AstrologyEngineResult["dominantElement"];
}

function dominantModalityFromPlanets(planets: AstroPlanet[]): AstrologyEngineResult["modalityEmphasis"] {
  const tally: Record<AstrologyEngineResult["modalityEmphasis"], number> = {
    Cardinal: 0,
    Fixed: 0,
    Mutable: 0,
  };
  planets.forEach((planet) => {
    tally[MODALITY_BY_SIGN[planet.sign]] += 1;
  });
  return (Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "Cardinal") as AstrologyEngineResult["modalityEmphasis"];
}

function buildSummary(result: AstrologyEngineResult): string {
  const { planets, dominantElement, modalityEmphasis } = result;
  const sun = planets.find((p) => p.name === "Sun");
  const moon = planets.find((p) => p.name === "Moon");
  const asc = result.houses[0];
  const planetLines = planets
    .filter((p) => ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"].includes(p.name))
    .map((p) => `${p.name} in ${p.sign} house ${p.house}`)
    .join("; ");

  return [
    `Dominant element: ${dominantElement}.`,
    `Modal emphasis: ${modalityEmphasis}.`,
    sun ? `Sun: ${sun.sign} (house ${sun.house}).` : "",
    moon ? `Moon: ${moon.sign} (house ${moon.house}).` : "",
    asc ? `Ascendant sign: ${asc.sign}.` : "",
    planetLines ? `Key placements: ${planetLines}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Fabricates astrology data from birth input.
 */
export async function calculateAstrologyData(
  input: AstrologyEngineInput
): Promise<AstrologyEngineResult> {
  try {
    const { date, time, latitude, longitude } = input;
    const seed = `${date}T${time}-${latitude}-${longitude}`;

    const planets = fabricatePlanets(seed);
    const houses = fabricateHouses(seed);
    const aspects = fabricateAspects(planets, seed);

    const result: AstrologyEngineResult = {
      metadata: {
        date,
        time,
        latitude,
        longitude,
        localSiderealTime: pseudoLocalSiderealTime(date, time, longitude),
      },
      dominantElement: dominantElementFromPlanets(planets),
      modalityEmphasis: dominantModalityFromPlanets(planets),
      planets,
      houses,
      aspects,
      summary: "",
    };

    result.summary = buildSummary(result);

    return result;
  } catch (error) {
    return {
      metadata: {
        date: input.date,
        time: input.time,
        latitude: input.latitude,
        longitude: input.longitude,
        localSiderealTime: "00:00",
      },
      dominantElement: "Fire",
      modalityEmphasis: "Cardinal",
      planets: [],
      houses: [],
      aspects: [],
      summary: "",
      error: error instanceof Error ? error.message : "Unknown astrology engine error",
    };
  }
}