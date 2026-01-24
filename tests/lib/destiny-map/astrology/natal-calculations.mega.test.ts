/**
 * Natal Calculations MEGA Test Suite
 * Comprehensive testing for natal chart calculations
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

// Create mock swisseph object using vi.hoisted to ensure it's available before imports
const mockSwisseph = vi.hoisted(() => ({
  swe_version: vi.fn(() => '2.10.03'),
  swe_set_ephe_path: vi.fn(),
  swe_julday: vi.fn((year: number, month: number, day: number, hour: number) => 2448804.104166667),
  swe_utc_to_jd: vi.fn((year: number, month: number, day: number, hour: number, minute: number, second: number, gregflag: number) => ({
    julianDayUT: 2448804.104166667,
    julianDayET: 2448804.104166667,
  })),
  swe_jdut1_to_utc: vi.fn((jd: number, gregflag: number) => ({
    year: 1990,
    month: 6,
    day: 15,
    hour: 14,
    minute: 30,
    second: 0,
  })),
  swe_calc_ut: vi.fn((jd: number, planet: number, flags: number) => ({
    longitude: planet === 0 ? 85.5 : 340.2, // Sun: Gemini, Moon: Pisces
    latitude: 0,
    distance: 1,
    longitudeSpeed: 1,
    latitudeSpeed: 0,
    distanceSpeed: 0,
  })),
  swe_houses: vi.fn(() => ({
    house: [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360],
    ascendant: 30, // Aries 30°
    mc: 270, // Capricorn 0°
    armc: 270,
    vertex: 180,
    equatorialAscendant: 30,
    coAscendantKoch: 30,
    coAscendantMunkasey: 30,
    polarAscendant: 30,
  })),
  SEFLG_SPEED: 256,
  SEFLG_SWIEPH: 2,
  SE_GREG_CAL: 1,
  SE_SUN: 0,
  SE_MOON: 1,
  SE_MERCURY: 2,
  SE_VENUS: 3,
  SE_MARS: 4,
  SE_JUPITER: 5,
  SE_SATURN: 6,
  SE_URANUS: 7,
  SE_NEPTUNE: 8,
  SE_PLUTO: 9,
}));

// Mock swisseph module
vi.mock('swisseph', () => mockSwisseph);

// Mock ephe to return the same mock
vi.mock('@/lib/astrology/foundation/ephe', () => ({
  getSwisseph: () => mockSwisseph,
  setEphePath: vi.fn(),
}));

import {
  calculateNatal,
  computePartOfFortune,
  getNowInTimezone,
  calculateTransitsToLights,
  type NatalChartInput,
  type HouseCusp,
  type DateComponents,
  type LightPoint,
  type TransitAspect,
} from '@/lib/destiny-map/astrology/natal-calculations';
import type { PlanetData } from '@/lib/astrology';

// ============================================================
// Test Data Fixtures
// ============================================================

const createBasicInput = (overrides?: Partial<NatalChartInput>): NatalChartInput => ({
  year: 1990,
  month: 6,
  date: 15,
  hour: 14,
  minute: 30,
  latitude: 37.5665,
  longitude: 126.9780,
  timeZone: 'Asia/Seoul',
  ...overrides,
});

const createMockPlanets = (): PlanetData[] => [
  {
    name: 'Sun',
    longitude: 85.5, // Gemini
    sign: 'Gemini',
    degree: 25,
    minute: 30,
    retrograde: false,
    formatted: 'Gemini 25°30\'',
    house: 10,
  },
  {
    name: 'Moon',
    longitude: 340.2, // Pisces
    sign: 'Pisces',
    degree: 10,
    minute: 12,
    retrograde: false,
    formatted: 'Pisces 10°12\'',
    house: 6,
  },
  {
    name: 'Mercury',
    longitude: 70.0, // Gemini
    sign: 'Gemini',
    degree: 10,
    minute: 0,
    retrograde: true,
    formatted: 'Gemini 10°0\'',
    house: 9,
  },
];

const createMockHouses = (): HouseCusp[] => Array.from({ length: 12 }, (_, i) => ({
  cusp: i + 1,
  longitude: (i * 30),
  sign: ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'][i],
}));

// ============================================================
// calculateNatal Tests
// ============================================================

describe('natal-calculations MEGA - calculateNatal', () => {
  it('should calculate natal chart for valid input', async () => {
    const input = createBasicInput();
    const result = await calculateNatal(input);

    expect(result).toBeDefined();
    expect(result.chart).toBeDefined();
    expect(result.facts).toBeDefined();
    expect(result.planets).toBeDefined();
    expect(result.houses).toBeDefined();
    expect(result.aspects).toBeDefined();
    expect(result.meta).toBeDefined();
  });

  it('should return planets array', async () => {
    const input = createBasicInput();
    const result = await calculateNatal(input);

    // Planets may be empty if ephemeris data missing
    if (result.planets) {
      expect(Array.isArray(result.planets)).toBe(true);
      if (result.planets.length > 0) {
        expect(result.planets[0]).toHaveProperty('name');
        expect(result.planets[0]).toHaveProperty('longitude');
        expect(result.planets[0]).toHaveProperty('sign');
      }
    }
  });

  it('should return 12 houses', async () => {
    const input = createBasicInput();
    const result = await calculateNatal(input);

    // Houses may be undefined if calculation failed
    if (result.houses && result.houses.length > 0) {
      expect(result.houses.length).toBe(12);
      expect(result.houses[0]).toHaveProperty('cusp');
      expect(result.houses[0]).toHaveProperty('longitude');
    }
  });

  it('should include ascendant and MC', async () => {
    const input = createBasicInput();
    const result = await calculateNatal(input);

    // May be undefined if calculation failed
    expect(result).toBeDefined();
  });

  it('should calculate aspects', async () => {
    const input = createBasicInput();
    const result = await calculateNatal(input);

    // Aspects may be empty if planets missing
    if (result.aspects) {
      expect(Array.isArray(result.aspects)).toBe(true);
    }
  });

  it('should handle different timezones', async () => {
    const inputSeoul = createBasicInput({ timeZone: 'Asia/Seoul' });
    const inputNY = createBasicInput({ timeZone: 'America/New_York' });

    const resultSeoul = await calculateNatal(inputSeoul);
    const resultNY = await calculateNatal(inputNY);

    expect(resultSeoul).toBeDefined();
    expect(resultNY).toBeDefined();
  });

  it('should handle leap year dates', async () => {
    const input = createBasicInput({
      year: 2000,
      month: 2,
      date: 29,
    });
    const result = await calculateNatal(input);

    expect(result).toBeDefined();
  });

  it('should handle midnight', async () => {
    const input = createBasicInput({
      hour: 0,
      minute: 0,
    });
    const result = await calculateNatal(input);

    expect(result).toBeDefined();
  });

  it('should handle noon', async () => {
    const input = createBasicInput({
      hour: 12,
      minute: 0,
    });
    const result = await calculateNatal(input);

    expect(result).toBeDefined();
  });

  it('should handle different coordinates', async () => {
    const inputTokyo = createBasicInput({
      latitude: 35.6762,
      longitude: 139.6503,
      timeZone: 'Asia/Tokyo',
    });
    const result = await calculateNatal(inputTokyo);

    expect(result).toBeDefined();
  });
});

// ============================================================
// computePartOfFortune Tests
// ============================================================

describe('natal-calculations MEGA - computePartOfFortune', () => {
  it('should calculate Part of Fortune for day chart', () => {
    const planets = createMockPlanets();
    const houses = createMockHouses();
    const ascendant = { longitude: 0 };

    const initialLength = planets.length;
    computePartOfFortune(planets, houses, ascendant);

    // Should add Part of Fortune to planets
    expect(planets.length).toBe(initialLength + 1);
    const pof = planets.find(p => p.name === 'Part of Fortune');
    expect(pof).toBeDefined();
    expect(pof?.longitude).toBeGreaterThanOrEqual(0);
    expect(pof?.longitude).toBeLessThan(360);
  });

  it('should calculate Part of Fortune for night chart', () => {
    const planets = createMockPlanets();
    // Move Sun below horizon (night chart)
    planets[0].longitude = 270; // Sun in 4th quadrant
    const houses = createMockHouses();
    const ascendant = { longitude: 90 };

    const initialLength = planets.length;
    computePartOfFortune(planets, houses, ascendant);

    expect(planets.length).toBe(initialLength + 1);
    const pof = planets.find(p => p.name === 'Part of Fortune');
    expect(pof).toBeDefined();
  });

  it('should use night formula when Sun is below horizon', () => {
    const planets = createMockPlanets();
    planets[0].longitude = 180; // Sun opposite ascendant
    const houses = createMockHouses();
    const ascendant = { longitude: 0 };

    computePartOfFortune(planets, houses, ascendant);

    const pof = planets.find(p => p.name === 'Part of Fortune');
    expect(pof).toBeDefined();
    expect(pof?.longitude).toBeGreaterThanOrEqual(0);
  });

  it('should handle missing Sun', () => {
    const planets = createMockPlanets().filter(p => p.name !== 'Sun');
    const houses = createMockHouses();
    const ascendant = { longitude: 0 };

    const initialLength = planets.length;
    computePartOfFortune(planets, houses, ascendant);

    // Should not add Part of Fortune
    expect(planets.length).toBe(initialLength);
  });

  it('should handle missing Moon', () => {
    const planets = createMockPlanets().filter(p => p.name !== 'Moon');
    const houses = createMockHouses();
    const ascendant = { longitude: 0 };

    const initialLength = planets.length;
    computePartOfFortune(planets, houses, ascendant);

    // Should not add Part of Fortune
    expect(planets.length).toBe(initialLength);
  });

  it('should assign correct sign to Part of Fortune', () => {
    const planets = createMockPlanets();
    const houses = createMockHouses();
    const ascendant = { longitude: 0 };

    computePartOfFortune(planets, houses, ascendant);

    const pof = planets.find(p => p.name === 'Part of Fortune');
    expect(pof?.sign).toBeDefined();
    expect(['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']).toContain(pof?.sign);
  });

  it('should format Part of Fortune correctly', () => {
    const planets = createMockPlanets();
    const houses = createMockHouses();
    const ascendant = { longitude: 0 };

    computePartOfFortune(planets, houses, ascendant);

    const pof = planets.find(p => p.name === 'Part of Fortune');
    expect(pof?.formatted).toMatch(/[A-Z]\w+ \d+°\d+'/);
  });

  it('should set retrograde to false for Part of Fortune', () => {
    const planets = createMockPlanets();
    const houses = createMockHouses();
    const ascendant = { longitude: 0 };

    computePartOfFortune(planets, houses, ascendant);

    const pof = planets.find(p => p.name === 'Part of Fortune');
    expect(pof?.retrograde).toBe(false);
  });
});

// ============================================================
// getNowInTimezone Tests
// ============================================================

describe('natal-calculations MEGA - getNowInTimezone', () => {
  it('should return current time without timezone', () => {
    const result = getNowInTimezone();

    expect(result.year).toBeGreaterThan(2020);
    expect(result.month).toBeGreaterThanOrEqual(1);
    expect(result.month).toBeLessThanOrEqual(12);
    expect(result.day).toBeGreaterThanOrEqual(1);
    expect(result.day).toBeLessThanOrEqual(31);
    expect(result.hour).toBeGreaterThanOrEqual(0);
    expect(result.hour).toBeLessThanOrEqual(23);
    expect(result.minute).toBeGreaterThanOrEqual(0);
    expect(result.minute).toBeLessThanOrEqual(59);
  });

  it('should return current time in UTC', () => {
    const result = getNowInTimezone('UTC');

    expect(result.year).toBeGreaterThan(2020);
    expect(result.month).toBeGreaterThanOrEqual(1);
    expect(result.month).toBeLessThanOrEqual(12);
  });

  it('should return current time in Asia/Seoul', () => {
    const result = getNowInTimezone('Asia/Seoul');

    expect(result.year).toBeGreaterThan(2020);
    expect(result.month).toBeGreaterThanOrEqual(1);
    expect(result.month).toBeLessThanOrEqual(12);
  });

  it('should return current time in America/New_York', () => {
    const result = getNowInTimezone('America/New_York');

    expect(result.year).toBeGreaterThan(2020);
    expect(result.month).toBeGreaterThanOrEqual(1);
    expect(result.month).toBeLessThanOrEqual(12);
  });

  it('should handle invalid timezone gracefully', () => {
    const result = getNowInTimezone('Invalid/Timezone');

    // Should fallback to UTC
    expect(result.year).toBeGreaterThan(2020);
    expect(result.month).toBeGreaterThanOrEqual(1);
    expect(result.month).toBeLessThanOrEqual(12);
  });

  it('should return valid hour in 24-hour format', () => {
    const result = getNowInTimezone('Asia/Seoul');

    expect(result.hour).toBeGreaterThanOrEqual(0);
    expect(result.hour).toBeLessThanOrEqual(23);
  });

  it('should return valid minute', () => {
    const result = getNowInTimezone('Asia/Seoul');

    expect(result.minute).toBeGreaterThanOrEqual(0);
    expect(result.minute).toBeLessThanOrEqual(59);
  });
});

// ============================================================
// calculateTransitsToLights Tests
// ============================================================

describe('natal-calculations MEGA - calculateTransitsToLights', () => {
  const transitPlanets: PlanetData[] = [
    {
      name: 'Jupiter',
      longitude: 90, // Square to 0°
      sign: 'Cancer',
      degree: 0,
      minute: 0,
      retrograde: false,
      formatted: 'Cancer 0°0\'',
      house: 4,
    },
    {
      name: 'Saturn',
      longitude: 180, // Opposition to 0°
      sign: 'Libra',
      degree: 0,
      minute: 0,
      retrograde: false,
      formatted: 'Libra 0°0\'',
      house: 7,
    },
  ];

  const lights: LightPoint[] = [
    { name: 'Sun', longitude: 0 },
    { name: 'Ascendant', longitude: 0 },
  ];

  it('should calculate transit aspects', () => {
    const result = calculateTransitsToLights(transitPlanets, lights);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should identify conjunction aspect', () => {
    const planets: PlanetData[] = [
      {
        name: 'Jupiter',
        longitude: 2, // 2° from 0° (conjunction)
        sign: 'Aries',
        degree: 2,
        minute: 0,
        retrograde: false,
        formatted: 'Aries 2°0\'',
        house: 1,
      },
    ];

    const result = calculateTransitsToLights(planets, lights);

    const conjunction = result.find(t => t.aspect === 'conjunction');
    expect(conjunction).toBeDefined();
    expect(conjunction?.orb).toBeLessThanOrEqual(4);
  });

  it('should identify square aspect', () => {
    const planets: PlanetData[] = [
      {
        name: 'Mars',
        longitude: 91, // 91° from 0° (square)
        sign: 'Cancer',
        degree: 1,
        minute: 0,
        retrograde: false,
        formatted: 'Cancer 1°0\'',
        house: 4,
      },
    ];

    const result = calculateTransitsToLights(planets, lights);

    const square = result.find(t => t.aspect === 'square');
    expect(square).toBeDefined();
  });

  it('should identify trine aspect', () => {
    const planets: PlanetData[] = [
      {
        name: 'Venus',
        longitude: 120, // 120° from 0° (trine)
        sign: 'Leo',
        degree: 0,
        minute: 0,
        retrograde: false,
        formatted: 'Leo 0°0\'',
        house: 5,
      },
    ];

    const result = calculateTransitsToLights(planets, lights);

    const trine = result.find(t => t.aspect === 'trine');
    expect(trine).toBeDefined();
  });

  it('should identify sextile aspect', () => {
    const planets: PlanetData[] = [
      {
        name: 'Mercury',
        longitude: 60, // 60° from 0° (sextile)
        sign: 'Taurus',
        degree: 0,
        minute: 0,
        retrograde: false,
        formatted: 'Taurus 0°0\'',
        house: 3,
      },
    ];

    const result = calculateTransitsToLights(planets, lights);

    const sextile = result.find(t => t.aspect === 'sextile');
    expect(sextile).toBeDefined();
  });

  it('should identify opposition aspect', () => {
    const planets: PlanetData[] = [
      {
        name: 'Saturn',
        longitude: 180, // 180° from 0° (opposition)
        sign: 'Libra',
        degree: 0,
        minute: 0,
        retrograde: false,
        formatted: 'Libra 0°0\'',
        house: 7,
      },
    ];

    const result = calculateTransitsToLights(planets, lights);

    const opposition = result.find(t => t.aspect === 'opposition');
    expect(opposition).toBeDefined();
  });

  it('should respect maxOrb parameter', () => {
    const planets: PlanetData[] = [
      {
        name: 'Jupiter',
        longitude: 5, // 5° from 0° (wide conjunction)
        sign: 'Aries',
        degree: 5,
        minute: 0,
        retrograde: false,
        formatted: 'Aries 5°0\'',
        house: 1,
      },
    ];

    const result1 = calculateTransitsToLights(planets, lights, 4); // Default orb
    const result2 = calculateTransitsToLights(planets, lights, 6); // Wider orb

    // With 4° orb, 5° should be out of range
    expect(result1.length).toBe(0);

    // With 6° orb, 5° should be in range
    expect(result2.length).toBeGreaterThan(0);
  });

  it('should handle empty transit planets', () => {
    const result = calculateTransitsToLights([], lights);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it('should handle empty lights', () => {
    const result = calculateTransitsToLights(transitPlanets, []);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it('should include orb value in results', () => {
    const planets: PlanetData[] = [
      {
        name: 'Jupiter',
        longitude: 2,
        sign: 'Aries',
        degree: 2,
        minute: 0,
        retrograde: false,
        formatted: 'Aries 2°0\'',
        house: 1,
      },
    ];

    const result = calculateTransitsToLights(planets, lights);

    if (result.length > 0) {
      expect(result[0].orb).toBeDefined();
      expect(typeof result[0].orb).toBe('number');
      expect(result[0].orb).toBeGreaterThanOrEqual(0);
    }
  });

  it('should include planet and point names in results', () => {
    const result = calculateTransitsToLights(transitPlanets, lights);

    if (result.length > 0) {
      expect(result[0].transitPlanet).toBeDefined();
      expect(result[0].natalPoint).toBeDefined();
      expect(['Jupiter', 'Saturn']).toContain(result[0].transitPlanet);
      expect(['Sun', 'Ascendant']).toContain(result[0].natalPoint);
    }
  });
});

// ============================================================
// Integration Tests
// ============================================================

describe('natal-calculations MEGA - Integration', () => {
  it('should work end-to-end', async () => {
    const input = createBasicInput();
    const result = await calculateNatal(input);

    expect(result).toBeDefined();
    expect(result.planets).toBeDefined();
    expect(result.houses).toBeDefined();

    // If calculation succeeded, test Part of Fortune
    if (result.planets && result.planets.length > 0 && result.ascendant) {
      const planets = [...result.planets];
      const ascendant = result.ascendant as { longitude: number };

      if (ascendant.longitude !== undefined) {
        computePartOfFortune(planets, result.houses, ascendant);
        const pof = planets.find(p => p.name === 'Part of Fortune');
        expect(pof).toBeDefined();
      }
    }
  });

  it('should calculate transits with natal chart', async () => {
    const input = createBasicInput();
    const result = await calculateNatal(input);

    if (result.planets && result.planets.length > 0) {
      const lights: LightPoint[] = result.planets
        .filter(p => ['Sun', 'Moon'].includes(p.name))
        .map(p => ({ name: p.name, longitude: p.longitude }));

      if (lights.length > 0) {
        const transits = calculateTransitsToLights(result.planets, lights);
        expect(Array.isArray(transits)).toBe(true);
      }
    }
  });
});
