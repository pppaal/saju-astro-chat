/**
 * Planets Utility Tests
 * 행성 유틸리티 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  normalizePlanetName,
  isValidPlanetName,
  normalizeAspectType,
  extractAspectPlanetName,
  findPlanet,
  extractPlanetSignByName,
  getPlanetSign,
  extractPlanetHouseByName,
  extractMultiplePlanetSigns,
  getChironData,
  getLilithData,
  getVertexData,
  getPartOfFortuneData,
} from '@/components/destiny-map/fun-insights/utils/planets';
import type { AstroData, PlanetData } from '@/components/destiny-map/fun-insights/types';

describe('normalizePlanetName', () => {
  describe('standard planet names', () => {
    const standardPlanets = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron', 'lilith'];

    standardPlanets.forEach(planet => {
      it(`should normalize "${planet}"`, () => {
        expect(normalizePlanetName(planet)).toBe(planet);
        expect(normalizePlanetName(planet.toUpperCase())).toBe(planet);
        expect(normalizePlanetName(`  ${planet}  `)).toBe(planet);
      });
    });
  });

  describe('north node variations', () => {
    const northNodeVariations = ['north node', 'northnode', 'north_node', 'nn', 'rahu', 'true node', 'truenode', 'mean node', 'meannode', 'dragon head', 'dragonhead', '용두'];

    northNodeVariations.forEach(variation => {
      it(`should normalize "${variation}" to "northnode"`, () => {
        expect(normalizePlanetName(variation)).toBe('northnode');
      });
    });
  });

  describe('south node variations', () => {
    const southNodeVariations = ['south node', 'southnode', 'south_node', 'sn', 'ketu', 'dragon tail', 'dragontail', '용미'];

    southNodeVariations.forEach(variation => {
      it(`should normalize "${variation}" to "southnode"`, () => {
        expect(normalizePlanetName(variation)).toBe('southnode');
      });
    });
  });

  describe('asteroid variations', () => {
    it('should normalize juno', () => {
      expect(normalizePlanetName('juno')).toBe('juno');
      expect(normalizePlanetName('JUNO')).toBe('juno');
    });

    it('should normalize ceres', () => {
      expect(normalizePlanetName('ceres')).toBe('ceres');
    });

    it('should normalize pallas variations', () => {
      expect(normalizePlanetName('pallas')).toBe('pallas');
      expect(normalizePlanetName('pallas athena')).toBe('pallas');
    });

    it('should normalize vesta', () => {
      expect(normalizePlanetName('vesta')).toBe('vesta');
    });
  });

  describe('lilith variations', () => {
    const lilithVariations = ['lilith', 'black moon lilith', 'blackmoonlilith', 'bml', 'mean lilith', 'meanlilith'];

    lilithVariations.forEach(variation => {
      it(`should normalize "${variation}" to "lilith"`, () => {
        expect(normalizePlanetName(variation)).toBe('lilith');
      });
    });
  });

  describe('edge cases', () => {
    it('should return null for invalid input', () => {
      expect(normalizePlanetName('')).toBeNull();
      expect(normalizePlanetName('  ')).toBeNull();
      expect(normalizePlanetName(null)).toBeNull();
      expect(normalizePlanetName(undefined)).toBeNull();
      expect(normalizePlanetName(123)).toBeNull();
      expect(normalizePlanetName({})).toBeNull();
    });

    it('should return null for unknown planet names', () => {
      expect(normalizePlanetName('unknown')).toBeNull();
      expect(normalizePlanetName('randomplanet')).toBeNull();
    });
  });
});

describe('isValidPlanetName', () => {
  it('should return true for valid planet names', () => {
    expect(isValidPlanetName('sun')).toBe(true);
    expect(isValidPlanetName('North Node')).toBe(true);
    expect(isValidPlanetName('chiron')).toBe(true);
  });

  it('should return false for invalid planet names', () => {
    expect(isValidPlanetName('unknown')).toBe(false);
    expect(isValidPlanetName('')).toBe(false);
    expect(isValidPlanetName(null)).toBe(false);
  });
});

describe('normalizeAspectType', () => {
  describe('conjunction', () => {
    it('should normalize conjunction variations', () => {
      expect(normalizeAspectType('conjunction')).toBe('conjunction');
      expect(normalizeAspectType('conjunct')).toBe('conjunction');
      expect(normalizeAspectType('con')).toBe('conjunction');
      expect(normalizeAspectType('0')).toBe('conjunction');
    });
  });

  describe('opposition', () => {
    it('should normalize opposition variations', () => {
      expect(normalizeAspectType('opposition')).toBe('opposition');
      expect(normalizeAspectType('opposite')).toBe('opposition');
      expect(normalizeAspectType('opp')).toBe('opposition');
      expect(normalizeAspectType('180')).toBe('opposition');
    });
  });

  describe('square', () => {
    it('should normalize square variations', () => {
      expect(normalizeAspectType('square')).toBe('square');
      expect(normalizeAspectType('sqr')).toBe('square');
      expect(normalizeAspectType('90')).toBe('square');
    });
  });

  describe('trine', () => {
    it('should normalize trine variations', () => {
      expect(normalizeAspectType('trine')).toBe('trine');
      expect(normalizeAspectType('tri')).toBe('trine');
      expect(normalizeAspectType('120')).toBe('trine');
    });
  });

  describe('sextile', () => {
    it('should normalize sextile variations', () => {
      expect(normalizeAspectType('sextile')).toBe('sextile');
      expect(normalizeAspectType('sex')).toBe('sextile');
      expect(normalizeAspectType('60')).toBe('sextile');
    });
  });

  describe('edge cases', () => {
    it('should return null for invalid input', () => {
      expect(normalizeAspectType('')).toBeNull();
      expect(normalizeAspectType(null)).toBeNull();
      expect(normalizeAspectType('unknown')).toBeNull();
    });
  });
});

describe('extractAspectPlanetName', () => {
  it('should extract from string', () => {
    expect(extractAspectPlanetName('venus')).toBe('venus');
    expect(extractAspectPlanetName('North Node')).toBe('northnode');
  });

  it('should extract from object with name', () => {
    expect(extractAspectPlanetName({ name: 'Venus' })).toBe('venus');
    expect(extractAspectPlanetName({ name: 'Rahu' })).toBe('northnode');
  });

  it('should return null for planet data objects (with sign)', () => {
    expect(extractAspectPlanetName({ sign: 'aries' })).toBeNull();
  });

  it('should return null for invalid input', () => {
    expect(extractAspectPlanetName(null)).toBeNull();
    expect(extractAspectPlanetName(undefined)).toBeNull();
    expect(extractAspectPlanetName({})).toBeNull();
  });
});

describe('findPlanet', () => {
  describe('array format', () => {
    const planets: PlanetData[] = [
      { name: 'Sun', sign: 'aries' } as PlanetData,
      { name: 'Moon', sign: 'cancer' } as PlanetData,
      { name: 'North Node', sign: 'leo' } as PlanetData,
    ];

    it('should find planet in array by name', () => {
      const result = findPlanet(planets, 'sun');
      expect(result).toBeDefined();
      expect(result?.sign).toBe('aries');
    });

    it('should find north node with various input names', () => {
      const result = findPlanet(planets, 'northnode');
      expect(result).toBeDefined();
      expect(result?.sign).toBe('leo');
    });

    it('should return null for non-existent planet', () => {
      expect(findPlanet(planets, 'pluto')).toBeNull();
    });
  });

  describe('record format', () => {
    const planets = {
      sun: { sign: 'aries' },
      moon: { sign: 'cancer' },
    };

    it('should find planet in record by key', () => {
      const result = findPlanet(planets, 'sun');
      expect(result?.sign).toBe('aries');
    });

    it('should return null for non-existent planet', () => {
      expect(findPlanet(planets, 'mars')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should return null for undefined planets', () => {
      expect(findPlanet(undefined, 'sun')).toBeNull();
    });
  });
});

describe('extractPlanetSignByName / getPlanetSign', () => {
  const createAstro = (): AstroData => ({
    planets: [
      { name: 'Sun', sign: 'ARIES' },
      { name: 'Moon', sign: 'Cancer' },
    ],
  } as unknown as AstroData);

  it('should extract sign in lowercase', () => {
    const astro = createAstro();
    expect(extractPlanetSignByName(astro, 'sun')).toBe('aries');
    expect(extractPlanetSignByName(astro, 'moon')).toBe('cancer');
  });

  it('should return null for non-existent planet', () => {
    const astro = createAstro();
    expect(extractPlanetSignByName(astro, 'pluto')).toBeNull();
  });

  it('should handle getPlanetSign alias', () => {
    const astro = createAstro();
    expect(getPlanetSign(astro, 'Sun')).toBe('aries');
    expect(getPlanetSign(astro, 'North Node')).toBeNull();
  });

  it('should return null for undefined astro', () => {
    expect(extractPlanetSignByName(undefined, 'sun')).toBeNull();
    expect(getPlanetSign(undefined, 'sun')).toBeNull();
  });
});

describe('extractPlanetHouseByName', () => {
  const createAstro = (): AstroData => ({
    planets: [
      { name: 'Sun', sign: 'aries', house: 1 },
      { name: 'Moon', sign: 'cancer', house: 4 },
      { name: 'Mars', sign: 'leo', house: 13 }, // invalid house
      { name: 'Venus', sign: 'taurus' }, // no house
    ],
  } as unknown as AstroData);

  it('should extract valid house numbers', () => {
    const astro = createAstro();
    expect(extractPlanetHouseByName(astro, 'sun')).toBe(1);
    expect(extractPlanetHouseByName(astro, 'moon')).toBe(4);
  });

  it('should return null for invalid house numbers', () => {
    const astro = createAstro();
    expect(extractPlanetHouseByName(astro, 'mars')).toBeNull();
  });

  it('should return null for missing house', () => {
    const astro = createAstro();
    expect(extractPlanetHouseByName(astro, 'venus')).toBeNull();
  });

  it('should return null for undefined astro', () => {
    expect(extractPlanetHouseByName(undefined, 'sun')).toBeNull();
  });
});

describe('extractMultiplePlanetSigns', () => {
  const createAstro = (): AstroData => ({
    planets: [
      { name: 'Sun', sign: 'aries' },
      { name: 'Moon', sign: 'cancer' },
    ],
  } as unknown as AstroData);

  it('should extract multiple signs at once', () => {
    const astro = createAstro();
    const result = extractMultiplePlanetSigns(astro, ['sun', 'moon', 'mars']);

    expect(result.sun).toBe('aries');
    expect(result.moon).toBe('cancer');
    expect(result.mars).toBeNull();
  });

  it('should return all nulls for undefined astro', () => {
    const result = extractMultiplePlanetSigns(undefined, ['sun', 'moon']);
    expect(result.sun).toBeNull();
    expect(result.moon).toBeNull();
  });
});

describe('getChironData', () => {
  it('should get from extraPoints', () => {
    const astro: AstroData = {
      extraPoints: {
        chiron: { sign: 'aries', house: 4 },
      },
    } as unknown as AstroData;

    const result = getChironData(astro);
    expect(result?.sign).toBe('aries');
    expect(result?.house).toBe(4);
  });

  it('should get from advancedAstrology', () => {
    const astro: AstroData = {
      advancedAstrology: {
        chiron: { sign: 'taurus', house: 2 },
      },
    } as unknown as AstroData;

    const result = getChironData(astro);
    expect(result?.sign).toBe('taurus');
  });

  it('should get from planets array', () => {
    const astro: AstroData = {
      planets: [
        { name: 'Chiron', sign: 'gemini', house: 3 },
      ],
    } as unknown as AstroData;

    const result = getChironData(astro);
    expect(result?.sign).toBe('gemini');
  });

  it('should return null for undefined astro', () => {
    expect(getChironData(undefined)).toBeNull();
  });
});

describe('getLilithData', () => {
  it('should get from extraPoints', () => {
    const astro: AstroData = {
      extraPoints: {
        lilith: { sign: 'scorpio', house: 8 },
      },
    } as unknown as AstroData;

    const result = getLilithData(astro);
    expect(result?.sign).toBe('scorpio');
  });

  it('should get from advancedAstrology', () => {
    const astro: AstroData = {
      advancedAstrology: {
        lilith: { sign: 'pisces', house: 12 },
      },
    } as unknown as AstroData;

    const result = getLilithData(astro);
    expect(result?.sign).toBe('pisces');
  });

  it('should get from planets array', () => {
    const astro: AstroData = {
      planets: [
        { name: 'Lilith', sign: 'capricorn', house: 10 },
      ],
    } as unknown as AstroData;

    const result = getLilithData(astro);
    expect(result?.sign).toBe('capricorn');
  });

  it('should return null for undefined astro', () => {
    expect(getLilithData(undefined)).toBeNull();
  });
});

describe('getVertexData', () => {
  it('should get from extraPoints', () => {
    const astro: AstroData = {
      extraPoints: {
        vertex: { sign: 'leo', house: 5 },
      },
    } as unknown as AstroData;

    const result = getVertexData(astro);
    expect(result?.sign).toBe('leo');
  });

  it('should get from advancedAstrology', () => {
    const astro: AstroData = {
      advancedAstrology: {
        vertex: { sign: 'virgo', house: 6 },
      },
    } as unknown as AstroData;

    const result = getVertexData(astro);
    expect(result?.sign).toBe('virgo');
  });

  it('should return null when not available', () => {
    const astro: AstroData = {
      planets: [{ name: 'Sun', sign: 'aries' }],
    } as unknown as AstroData;

    expect(getVertexData(astro)).toBeNull();
  });
});

describe('getPartOfFortuneData', () => {
  it('should get from extraPoints', () => {
    const astro: AstroData = {
      extraPoints: {
        partOfFortune: { sign: 'sagittarius', house: 9 },
      },
    } as unknown as AstroData;

    const result = getPartOfFortuneData(astro);
    expect(result?.sign).toBe('sagittarius');
  });

  it('should get from advancedAstrology', () => {
    const astro: AstroData = {
      advancedAstrology: {
        partOfFortune: { sign: 'aquarius', house: 11 },
      },
    } as unknown as AstroData;

    const result = getPartOfFortuneData(astro);
    expect(result?.sign).toBe('aquarius');
  });

  it('should return null when not available', () => {
    expect(getPartOfFortuneData(undefined)).toBeNull();
    expect(getPartOfFortuneData({} as AstroData)).toBeNull();
  });
});
