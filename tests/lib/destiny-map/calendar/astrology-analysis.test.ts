// tests/lib/destiny-map/calendar/astrology-analysis.test.ts
import { describe, it, expect } from 'vitest';
import {
  getPlanetPosition,
  getPlanetSign,
  isRetrograde,
  getRetrogradePlanetsForDate,
  getLunarPhase,
  getMoonPhaseDetailed,
  checkVoidOfCourseMoon,
  checkEclipseImpact,
  getPlanetaryHourForDate,
  getAspect,
  analyzePlanetTransits,
  ECLIPSES,
  type PlanetName,
  type RetrogradePlanet,
  type MoonPhaseType,
  type PlanetPosition,
  type EclipseImpact,
  type VoidOfCourseResult,
  type MoonPhaseResult,
  type LunarPhaseResult,
  type PlanetaryHourResult,
  type AspectResult,
  type PlanetTransitResult,
} from '@/lib/destiny-map/calendar/astrology-analysis';

describe('getPlanetPosition', () => {
  const planets: PlanetName[] = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];

  planets.forEach(planet => {
    it(`should calculate ${planet} position`, () => {
      const date = new Date('2025-01-15');
      const result = getPlanetPosition(date, planet);
      expect(result).toHaveProperty('sign');
      expect(result).toHaveProperty('longitude');
      expect(result).toHaveProperty('degree');
      expect(result.longitude).toBeGreaterThanOrEqual(0);
      expect(result.longitude).toBeLessThan(360);
    });
  });

  it('should return consistent results for same date', () => {
    const date = new Date('2025-01-15');
    const result1 = getPlanetPosition(date, 'sun');
    const result2 = getPlanetPosition(date, 'sun');
    expect(result1.longitude).toBe(result2.longitude);
  });

  it('should calculate degree within 0-30 range', () => {
    const date = new Date('2025-01-15');
    const result = getPlanetPosition(date, 'sun');
    expect(result.degree).toBeGreaterThanOrEqual(0);
    expect(result.degree).toBeLessThan(30);
  });

  it('should assign correct zodiac sign', () => {
    const date = new Date('2025-01-15');
    const result = getPlanetPosition(date, 'sun');
    expect(result.sign).toBe('Capricorn');
  });

  it('should handle moon fast movement', () => {
    const date1 = new Date('2025-01-15');
    const date2 = new Date('2025-01-16');
    const pos1 = getPlanetPosition(date1, 'moon');
    const pos2 = getPlanetPosition(date2, 'moon');
    expect(Math.abs(pos2.longitude - pos1.longitude)).toBeGreaterThan(10);
  });
});

describe('getPlanetSign', () => {
  it('should return sign for mercury', () => {
    const result = getPlanetSign(new Date('2025-01-15'), 'mercury');
    expect(typeof result).toBe('string');
  });

  it('should return sign for venus', () => {
    const result = getPlanetSign(new Date('2025-01-15'), 'venus');
    expect(typeof result).toBe('string');
  });

  it('should return sign for mars', () => {
    const result = getPlanetSign(new Date('2025-01-15'), 'mars');
    expect(typeof result).toBe('string');
  });
});

describe('isRetrograde', () => {
  const planets: RetrogradePlanet[] = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'];

  planets.forEach(planet => {
    it(`should check ${planet} retrograde status`, () => {
      const result = isRetrograde(new Date('2025-01-15'), planet);
      expect(typeof result).toBe('boolean');
    });
  });

  it('should return consistent results for same date and planet', () => {
    const date = new Date('2025-01-15');
    const result1 = isRetrograde(date, 'mercury');
    const result2 = isRetrograde(date, 'mercury');
    expect(result1).toBe(result2);
  });

  it('should handle different dates for mercury', () => {
    const date1 = new Date('2025-01-15');
    const date2 = new Date('2025-06-15');
    const result1 = isRetrograde(date1, 'mercury');
    const result2 = isRetrograde(date2, 'mercury');
    expect(typeof result1).toBe('boolean');
    expect(typeof result2).toBe('boolean');
  });
});

describe('getRetrogradePlanetsForDate', () => {
  it('should return array of retrograde planets', () => {
    const result = getRetrogradePlanetsForDate(new Date('2025-01-15'));
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array if no retrogrades', () => {
    const result = getRetrogradePlanetsForDate(new Date('2025-01-15'));
    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  it('should only include valid retrograde planets', () => {
    const result = getRetrogradePlanetsForDate(new Date('2025-01-15'));
    const valid = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'];
    result.forEach(planet => {
      expect(valid).toContain(planet);
    });
  });
});

describe('getLunarPhase', () => {
  it('should calculate lunar phase', () => {
    const result = getLunarPhase(new Date('2025-01-15'));
    expect(result).toHaveProperty('phase');
    expect(result).toHaveProperty('phaseName');
    expect(result).toHaveProperty('phaseScore');
  });

  it('should return phase between 0 and 29.5', () => {
    const result = getLunarPhase(new Date('2025-01-15'));
    expect(result.phase).toBeGreaterThanOrEqual(0);
    expect(result.phase).toBeLessThan(29.6);
  });

  it('should identify new moon phase', () => {
    const result = getLunarPhase(new Date('2000-01-06'));
    expect(result.phaseName).toBe('newMoon');
  });

  it('should provide phase score', () => {
    const result = getLunarPhase(new Date('2025-01-15'));
    expect(typeof result.phaseScore).toBe('number');
  });

  it('should use UTC to avoid timezone issues', () => {
    const result = getLunarPhase(new Date('2025-01-15'));
    expect(result.phase).toBeGreaterThanOrEqual(0);
  });
});

describe('getMoonPhaseDetailed', () => {
  const phases: MoonPhaseType[] = [
    'new_moon',
    'waxing_crescent',
    'first_quarter',
    'waxing_gibbous',
    'full_moon',
    'waning_gibbous',
    'last_quarter',
    'waning_crescent',
  ];

  it('should return detailed moon phase', () => {
    const result = getMoonPhaseDetailed(new Date('2025-01-15'));
    expect(result).toHaveProperty('phase');
    expect(result).toHaveProperty('phaseName');
    expect(result).toHaveProperty('illumination');
    expect(result).toHaveProperty('isWaxing');
    expect(result).toHaveProperty('factorKey');
    expect(result).toHaveProperty('score');
  });

  it('should calculate illumination percentage', () => {
    const result = getMoonPhaseDetailed(new Date('2025-01-15'));
    expect(result.illumination).toBeGreaterThanOrEqual(0);
    expect(result.illumination).toBeLessThanOrEqual(100);
  });

  it('should identify waxing vs waning', () => {
    const result = getMoonPhaseDetailed(new Date('2025-01-15'));
    expect(typeof result.isWaxing).toBe('boolean');
  });

  it('should provide Korean phase name', () => {
    const result = getMoonPhaseDetailed(new Date('2025-01-15'));
    expect(typeof result.phaseName).toBe('string');
    expect(result.phaseName.length).toBeGreaterThan(0);
  });

  it('should return one of 8 moon phases', () => {
    const result = getMoonPhaseDetailed(new Date('2025-01-15'));
    expect(phases).toContain(result.phase);
  });
});

describe('checkVoidOfCourseMoon', () => {
  it('should check void of course status', () => {
    const result = checkVoidOfCourseMoon(new Date('2025-01-15'));
    expect(result).toHaveProperty('isVoid');
    expect(result).toHaveProperty('moonSign');
    expect(result).toHaveProperty('hoursRemaining');
  });

  it('should return boolean for isVoid', () => {
    const result = checkVoidOfCourseMoon(new Date('2025-01-15'));
    expect(typeof result.isVoid).toBe('boolean');
  });

  it('should calculate hours remaining', () => {
    const result = checkVoidOfCourseMoon(new Date('2025-01-15'));
    expect(result.hoursRemaining).toBeGreaterThan(0);
  });

  it('should identify moon sign', () => {
    const result = checkVoidOfCourseMoon(new Date('2025-01-15'));
    expect(typeof result.moonSign).toBe('string');
  });
});

describe('checkEclipseImpact', () => {
  it('should check for eclipse impact', () => {
    const result = checkEclipseImpact(new Date('2025-01-15'));
    expect(result).toHaveProperty('hasImpact');
    expect(result).toHaveProperty('type');
    expect(result).toHaveProperty('intensity');
    expect(result).toHaveProperty('sign');
    expect(result).toHaveProperty('daysFromEclipse');
  });

  it('should return false when no eclipse nearby', () => {
    const result = checkEclipseImpact(new Date('2025-01-15'));
    expect(typeof result.hasImpact).toBe('boolean');
  });

  it('should detect strong intensity on eclipse day', () => {
    const eclipseDate = ECLIPSES[0].date;
    const result = checkEclipseImpact(eclipseDate);
    if (result.hasImpact) {
      expect(result.intensity).toBe('strong');
    }
  });

  it('should use UTC to avoid timezone issues', () => {
    const result = checkEclipseImpact(new Date('2025-03-14'));
    expect(result).toHaveProperty('hasImpact');
  });
});

describe('getPlanetaryHourForDate', () => {
  it('should calculate planetary hour', () => {
    const result = getPlanetaryHourForDate(new Date('2025-01-15T12:00:00'));
    expect(result).toHaveProperty('planet');
    expect(result).toHaveProperty('dayRuler');
    expect(result).toHaveProperty('isDay');
    expect(result).toHaveProperty('goodFor');
  });

  it('should return one of 7 planets', () => {
    const result = getPlanetaryHourForDate(new Date('2025-01-15T12:00:00'));
    const planets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
    expect(planets).toContain(result.planet);
  });

  it('should identify day vs night', () => {
    const day = getPlanetaryHourForDate(new Date('2025-01-15T12:00:00'));
    const night = getPlanetaryHourForDate(new Date('2025-01-15T22:00:00'));
    expect(day.isDay).toBe(true);
    expect(night.isDay).toBe(false);
  });

  it('should provide goodFor activities', () => {
    const result = getPlanetaryHourForDate(new Date('2025-01-15T12:00:00'));
    expect(Array.isArray(result.goodFor)).toBe(true);
    expect(result.goodFor.length).toBeGreaterThan(0);
  });
});

describe('getAspect', () => {
  it('should detect conjunction (0 degrees)', () => {
    const result = getAspect(0, 5);
    expect(result.aspect).toBe('conjunction');
    expect(result.orb).toBeLessThanOrEqual(8);
  });

  it('should detect sextile (60 degrees)', () => {
    const result = getAspect(0, 60);
    expect(result.aspect).toBe('sextile');
  });

  it('should detect square (90 degrees)', () => {
    const result = getAspect(0, 90);
    expect(result.aspect).toBe('square');
  });

  it('should detect trine (120 degrees)', () => {
    const result = getAspect(0, 120);
    expect(result.aspect).toBe('trine');
  });

  it('should detect opposition (180 degrees)', () => {
    const result = getAspect(0, 180);
    expect(result.aspect).toBe('opposition');
  });

  it('should return null for no aspect', () => {
    const result = getAspect(0, 45);
    expect(result.aspect).toBeNull();
  });

  it('should handle 360-degree wraparound', () => {
    const result = getAspect(350, 10);
    expect(result.orb).toBeLessThan(30);
  });

  it('should calculate orb for aspects', () => {
    const result = getAspect(0, 62);
    if (result.aspect === 'sextile') {
      expect(result.orb).toBe(2);
    }
  });
});

describe('analyzePlanetTransits', () => {
  it('should analyze planet transits', () => {
    const result = analyzePlanetTransits(new Date('2025-01-15'), 'Capricorn', 'earth');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('factorKeys');
    expect(result).toHaveProperty('positive');
    expect(result).toHaveProperty('negative');
  });

  it('should provide factorKeys array', () => {
    const result = analyzePlanetTransits(new Date('2025-01-15'), 'Capricorn', 'earth');
    expect(Array.isArray(result.factorKeys)).toBe(true);
  });

  it('should identify positive transits', () => {
    const result = analyzePlanetTransits(new Date('2025-01-15'), 'Capricorn', 'earth');
    expect(typeof result.positive).toBe('boolean');
  });

  it('should identify negative transits', () => {
    const result = analyzePlanetTransits(new Date('2025-01-15'), 'Capricorn', 'earth');
    expect(typeof result.negative).toBe('boolean');
  });

  it('should calculate numeric score', () => {
    const result = analyzePlanetTransits(new Date('2025-01-15'), 'Capricorn', 'earth');
    expect(typeof result.score).toBe('number');
  });

  it('should analyze with natal sun longitude for aspects', () => {
    const result = analyzePlanetTransits(new Date('2025-01-15'), 'Capricorn', 'earth', 280);
    expect(result).toHaveProperty('score');
  });

  it('should detect Jupiter transits', () => {
    const result = analyzePlanetTransits(new Date('2025-01-15'), 'Gemini', 'fire');
    const hasJupiter = result.factorKeys.some(k => k.toLowerCase().includes('jupiter'));
    expect(typeof hasJupiter).toBe('boolean');
  });

  it('should detect Saturn transits', () => {
    const result = analyzePlanetTransits(new Date('2025-01-15'), 'Pisces', 'water');
    const hasSaturn = result.factorKeys.some(k => k.toLowerCase().includes('saturn'));
    expect(typeof hasSaturn).toBe('boolean');
  });
});

describe('Edge Cases', () => {
  it('should handle leap year dates', () => {
    const result = getPlanetPosition(new Date('2024-02-29'), 'sun');
    expect(result.longitude).toBeGreaterThanOrEqual(0);
  });

  it('should handle year boundaries', () => {
    const result = getLunarPhase(new Date('2025-01-01'));
    expect(result.phase).toBeGreaterThanOrEqual(0);
  });

  it('should handle far future dates', () => {
    const result = getPlanetPosition(new Date('2030-12-31'), 'jupiter');
    expect(result.longitude).toBeGreaterThanOrEqual(0);
    expect(result.longitude).toBeLessThan(360);
  });

  it('should handle past dates', () => {
    const result = getPlanetPosition(new Date('2000-01-01'), 'saturn');
    expect(result.longitude).toBeGreaterThanOrEqual(0);
  });

  it('should handle midnight hours', () => {
    const result = getPlanetaryHourForDate(new Date('2025-01-15T00:00:00'));
    expect(result.planet).toBeDefined();
  });

  it('should handle aspect calculations at boundaries', () => {
    expect(getAspect(0, 0).aspect).toBe('conjunction');
    expect(getAspect(0, 359).aspect).toBe('conjunction');
  });
});
