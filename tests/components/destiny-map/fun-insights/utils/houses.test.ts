/**
 * Houses Utility Tests
 * 하우스 유틸리티 테스트
 */

import { describe, it, expect, vi } from 'vitest';
import {
  getHouseSign,
  getAllHouseSigns,
  getPlanetsInHouse,
  countPlanetsInHouse,
  hasPlanetInHouse,
  isPlanetInHouse,
  getPlanetHouse,
  getPlanetsByHouse,
  getPlanetsInAngularHouses,
  getPlanetsInSuccedentHouses,
  getPlanetsInCadentHouses,
  getSeventhHouseSign,
  getTenthHouseSign,
  getAscendantSign,
  getMcSign,
  getHouseDomain,
  HOUSE_DOMAINS,
} from '@/components/destiny-map/fun-insights/utils/houses';
import type { AstroData } from '@/components/destiny-map/fun-insights/types';

// Mock validation module
vi.mock('@/components/destiny-map/fun-insights/utils/validation', () => ({
  normalizeZodiacSign: vi.fn((sign) => sign?.toLowerCase() || null),
  validateHouseNumber: vi.fn((house) => {
    if (typeof house !== 'number') return null;
    if (house >= 1 && house <= 12 && Number.isInteger(house)) return house;
    return null;
  }),
}));

describe('getHouseSign', () => {
  const createAstro = (): AstroData => ({
    houses: [
      { index: 1, sign: 'Aries' },
      { index: 4, sign: 'Cancer' },
      { index: 7, sign: 'Libra' },
      { index: 10, sign: 'Capricorn' },
    ],
  } as unknown as AstroData);

  it('should return house sign', () => {
    const astro = createAstro();
    expect(getHouseSign(astro, 1)).toBe('aries');
    expect(getHouseSign(astro, 4)).toBe('cancer');
    expect(getHouseSign(astro, 7)).toBe('libra');
    expect(getHouseSign(astro, 10)).toBe('capricorn');
  });

  it('should return null for non-existent house', () => {
    const astro = createAstro();
    expect(getHouseSign(astro, 2)).toBeNull();
    expect(getHouseSign(astro, 12)).toBeNull();
  });

  it('should return null for undefined astro', () => {
    expect(getHouseSign(undefined, 1)).toBeNull();
  });

  it('should return null for non-array houses', () => {
    const astro: AstroData = {
      houses: 'invalid',
    } as unknown as AstroData;
    expect(getHouseSign(astro, 1)).toBeNull();
  });
});

describe('getAllHouseSigns', () => {
  const createFullAstro = (): AstroData => ({
    houses: Array.from({ length: 12 }, (_, i) => ({
      index: i + 1,
      sign: ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'][i],
    })),
  } as unknown as AstroData);

  it('should return all 12 house signs', () => {
    const astro = createFullAstro();
    const result = getAllHouseSigns(astro);

    expect(result[1]).toBe('aries');
    expect(result[4]).toBe('cancer');
    expect(result[7]).toBe('libra');
    expect(result[10]).toBe('capricorn');
    expect(Object.keys(result).length).toBe(12);
  });

  it('should return nulls for missing houses', () => {
    const result = getAllHouseSigns(undefined);

    for (let i = 1; i <= 12; i++) {
      expect(result[i as 1]).toBeNull();
    }
  });
});

describe('getPlanetsInHouse', () => {
  const createAstro = (): AstroData => ({
    planets: [
      { name: 'Sun', house: 1 },
      { name: 'Moon', house: 4 },
      { name: 'Mars', house: 1 },
      { name: 'Venus', house: 7 },
      { name: 'Jupiter', house: 10 },
    ],
  } as unknown as AstroData);

  it('should return planets in specified house', () => {
    const astro = createAstro();

    expect(getPlanetsInHouse(astro, 1)).toEqual(['sun', 'mars']);
    expect(getPlanetsInHouse(astro, 4)).toEqual(['moon']);
    expect(getPlanetsInHouse(astro, 7)).toEqual(['venus']);
  });

  it('should return empty array for empty house', () => {
    const astro = createAstro();
    expect(getPlanetsInHouse(astro, 2)).toEqual([]);
    expect(getPlanetsInHouse(astro, 12)).toEqual([]);
  });

  it('should return empty array for undefined astro', () => {
    expect(getPlanetsInHouse(undefined, 1)).toEqual([]);
  });
});

describe('countPlanetsInHouse', () => {
  const createAstro = (): AstroData => ({
    planets: [
      { name: 'Sun', house: 1 },
      { name: 'Moon', house: 1 },
      { name: 'Mars', house: 1 },
      { name: 'Venus', house: 7 },
    ],
  } as unknown as AstroData);

  it('should count planets correctly', () => {
    const astro = createAstro();
    expect(countPlanetsInHouse(astro, 1)).toBe(3);
    expect(countPlanetsInHouse(astro, 7)).toBe(1);
    expect(countPlanetsInHouse(astro, 10)).toBe(0);
  });
});

describe('hasPlanetInHouse', () => {
  const createAstro = (): AstroData => ({
    planets: [
      { name: 'Sun', house: 1 },
      { name: 'Venus', house: 7 },
    ],
  } as unknown as AstroData);

  it('should return true when house has planets', () => {
    const astro = createAstro();
    expect(hasPlanetInHouse(astro, 1)).toBe(true);
    expect(hasPlanetInHouse(astro, 7)).toBe(true);
  });

  it('should return false when house is empty', () => {
    const astro = createAstro();
    expect(hasPlanetInHouse(astro, 4)).toBe(false);
    expect(hasPlanetInHouse(astro, 10)).toBe(false);
  });
});

describe('isPlanetInHouse', () => {
  const createAstro = (): AstroData => ({
    planets: [
      { name: 'Sun', house: 1 },
      { name: 'Moon', house: 4 },
      { name: 'North Node', house: 10 },
    ],
  } as unknown as AstroData);

  it('should return true when planet is in house', () => {
    const astro = createAstro();
    expect(isPlanetInHouse(astro, 'sun', 1)).toBe(true);
    expect(isPlanetInHouse(astro, 'moon', 4)).toBe(true);
  });

  it('should handle north node normalization', () => {
    const astro = createAstro();
    expect(isPlanetInHouse(astro, 'northnode', 10)).toBe(true);
    expect(isPlanetInHouse(astro, 'North Node', 10)).toBe(true);
  });

  it('should return false when planet is not in house', () => {
    const astro = createAstro();
    expect(isPlanetInHouse(astro, 'sun', 4)).toBe(false);
    expect(isPlanetInHouse(astro, 'mars', 1)).toBe(false);
  });

  it('should return false for invalid planet name', () => {
    const astro = createAstro();
    expect(isPlanetInHouse(astro, 'invalid', 1)).toBe(false);
  });
});

describe('getPlanetHouse', () => {
  const createAstro = (): AstroData => ({
    planets: [
      { name: 'Sun', house: 1 },
      { name: 'Moon', house: 4 },
      { name: 'Saturn', house: 10 },
    ],
  } as unknown as AstroData);

  it('should return house number for planet', () => {
    const astro = createAstro();
    expect(getPlanetHouse(astro, 'sun')).toBe(1);
    expect(getPlanetHouse(astro, 'moon')).toBe(4);
    expect(getPlanetHouse(astro, 'saturn')).toBe(10);
  });

  it('should return null for non-existent planet', () => {
    const astro = createAstro();
    expect(getPlanetHouse(astro, 'pluto')).toBeNull();
  });

  it('should handle case-insensitive names', () => {
    const astro = createAstro();
    expect(getPlanetHouse(astro, 'SUN')).toBe(1);
    expect(getPlanetHouse(astro, 'Moon')).toBe(4);
  });

  it('should return null for invalid planet name', () => {
    const astro = createAstro();
    expect(getPlanetHouse(astro, 'invalid')).toBeNull();
  });

  it('should return null for undefined astro', () => {
    expect(getPlanetHouse(undefined, 'sun')).toBeNull();
  });
});

describe('getPlanetsByHouse', () => {
  const createAstro = (): AstroData => ({
    planets: [
      { name: 'Sun', house: 1 },
      { name: 'Moon', house: 1 },
      { name: 'Venus', house: 7 },
    ],
  } as unknown as AstroData);

  it('should group planets by house', () => {
    const astro = createAstro();
    const result = getPlanetsByHouse(astro);

    expect(result[1]).toEqual(['sun', 'moon']);
    expect(result[7]).toEqual(['venus']);
    expect(result[4]).toEqual([]);
    expect(Object.keys(result).length).toBe(12);
  });
});

describe('angular/succedent/cadent houses', () => {
  const createAstro = (): AstroData => ({
    planets: [
      { name: 'Sun', house: 1 },    // angular
      { name: 'Moon', house: 4 },   // angular
      { name: 'Mars', house: 7 },   // angular
      { name: 'Jupiter', house: 10 }, // angular
      { name: 'Venus', house: 2 },  // succedent
      { name: 'Saturn', house: 5 }, // succedent
      { name: 'Mercury', house: 3 }, // cadent
      { name: 'Neptune', house: 12 }, // cadent
    ],
  } as unknown as AstroData);

  describe('getPlanetsInAngularHouses', () => {
    it('should return planets in houses 1, 4, 7, 10', () => {
      const astro = createAstro();
      const result = getPlanetsInAngularHouses(astro);

      expect(result).toContain('sun');
      expect(result).toContain('moon');
      expect(result).toContain('mars');
      expect(result).toContain('jupiter');
      expect(result).not.toContain('venus');
    });
  });

  describe('getPlanetsInSuccedentHouses', () => {
    it('should return planets in houses 2, 5, 8, 11', () => {
      const astro = createAstro();
      const result = getPlanetsInSuccedentHouses(astro);

      expect(result).toContain('venus');
      expect(result).toContain('saturn');
      expect(result).not.toContain('sun');
    });
  });

  describe('getPlanetsInCadentHouses', () => {
    it('should return planets in houses 3, 6, 9, 12', () => {
      const astro = createAstro();
      const result = getPlanetsInCadentHouses(astro);

      expect(result).toContain('mercury');
      expect(result).toContain('neptune');
      expect(result).not.toContain('sun');
    });
  });
});

describe('special house lookups', () => {
  describe('getSeventhHouseSign', () => {
    it('should return 7th house sign', () => {
      const astro: AstroData = {
        houses: [{ index: 7, sign: 'Libra' }],
      } as unknown as AstroData;

      expect(getSeventhHouseSign(astro)).toBe('libra');
    });
  });

  describe('getTenthHouseSign', () => {
    it('should return 10th house sign', () => {
      const astro: AstroData = {
        houses: [{ index: 10, sign: 'Capricorn' }],
      } as unknown as AstroData;

      expect(getTenthHouseSign(astro)).toBe('capricorn');
    });
  });

  describe('getAscendantSign', () => {
    it('should get from ascendant data first', () => {
      const astro: AstroData = {
        ascendant: { sign: 'Leo' },
        houses: [{ index: 1, sign: 'Cancer' }],
      } as unknown as AstroData;

      expect(getAscendantSign(astro)).toBe('leo');
    });

    it('should fall back to 1st house cusp', () => {
      const astro: AstroData = {
        houses: [{ index: 1, sign: 'Cancer' }],
      } as unknown as AstroData;

      expect(getAscendantSign(astro)).toBe('cancer');
    });

    it('should return null when not available', () => {
      expect(getAscendantSign(undefined)).toBeNull();
    });
  });

  describe('getMcSign', () => {
    it('should get from mc data first', () => {
      const astro: AstroData = {
        mc: { sign: 'Aries' },
        houses: [{ index: 10, sign: 'Taurus' }],
      } as unknown as AstroData;

      expect(getMcSign(astro)).toBe('aries');
    });

    it('should fall back to 10th house cusp', () => {
      const astro: AstroData = {
        houses: [{ index: 10, sign: 'Taurus' }],
      } as unknown as AstroData;

      expect(getMcSign(astro)).toBe('taurus');
    });
  });
});

describe('HOUSE_DOMAINS', () => {
  it('should have all 12 houses', () => {
    expect(Object.keys(HOUSE_DOMAINS).length).toBe(12);
  });

  it('should have ko and en for each house', () => {
    for (let i = 1; i <= 12; i++) {
      expect(HOUSE_DOMAINS[i as 1]).toHaveProperty('ko');
      expect(HOUSE_DOMAINS[i as 1]).toHaveProperty('en');
      expect(HOUSE_DOMAINS[i as 1]).toHaveProperty('keywords');
    }
  });
});

describe('getHouseDomain', () => {
  it('should return Korean description', () => {
    expect(getHouseDomain(1, true)).toBe('자아/외모');
    expect(getHouseDomain(7, true)).toBe('파트너십');
    expect(getHouseDomain(10, true)).toBe('커리어/명성');
  });

  it('should return English description', () => {
    expect(getHouseDomain(1, false)).toBe('Self/Appearance');
    expect(getHouseDomain(7, false)).toBe('Partnership');
    expect(getHouseDomain(10, false)).toBe('Career/Reputation');
  });

  it('should have correct descriptions for all houses', () => {
    const expectedKo = [
      '자아/외모', '재물/가치', '소통/학습', '가정/뿌리',
      '창작/연애', '일/건강', '파트너십', '변환/공유자원',
      '철학/해외', '커리어/명성', '친구/희망', '무의식/영성',
    ];

    for (let i = 1; i <= 12; i++) {
      expect(getHouseDomain(i as 1, true)).toBe(expectedKo[i - 1]);
    }
  });
});
