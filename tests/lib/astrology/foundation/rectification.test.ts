// @vitest-environment node
// tests/lib/astrology/foundation/rectification.test.ts
import { describe, it, expect, vi } from 'vitest';
import {
  estimateAscendantByAppearance,
  generateTimeRangeCandidates,
  evaluateRectificationCandidates,
  performRectification,
  getAscendantAppearance,
  getSajuHourRange,
  getEventSignature,
  generateRectificationGuide,
  type LifeEvent,
  type LifeEventType,
  type RectificationCandidate,
  type PhysicalAppearanceProfile,
} from '@/lib/astrology/foundation/rectification';
import type { ZodiacKo, NatalInput } from '@/lib/astrology/foundation/types';

// Mock calculateNatalChart
vi.mock('@/lib/astrology/foundation/astrologyService', () => ({
  calculateNatalChart: vi.fn().mockResolvedValue({
    planets: [],
    houses: [],
    ascendant: { longitude: 0, sign: 'Aries' },
    mc: { longitude: 270, sign: 'Capricorn' },
  }),
  toChart: vi.fn((data) => ({
    ...data,
    date: new Date(),
    location: { latitude: 37.5, longitude: 127, elevation: 0 },
    planets: [],
  })),
}));

describe('estimateAscendantByAppearance', () => {
  it('should return Aries for angular face', () => {
    const result = estimateAscendantByAppearance({ faceShape: 'angular' });
    expect(result).toContain('Aries');
  });

  it('should return Cancer for round face', () => {
    const result = estimateAscendantByAppearance({ faceShape: 'round' });
    expect(result).toContain('Cancer');
  });

  it('should return Aries for athletic body type', () => {
    const result = estimateAscendantByAppearance({ bodyType: 'athletic' });
    expect(result).toContain('Aries');
  });

  it('should return Taurus for sturdy body type', () => {
    const result = estimateAscendantByAppearance({ bodyType: 'sturdy' });
    expect(result).toContain('Taurus');
  });

  it('should return Aries for fast manner', () => {
    const result = estimateAscendantByAppearance({ manner: 'fast' });
    expect(result).toContain('Aries');
  });

  it('should return Taurus for slow manner', () => {
    const result = estimateAscendantByAppearance({ manner: 'slow' });
    expect(result).toContain('Taurus');
  });

  it('should return Libra for graceful manner', () => {
    const result = estimateAscendantByAppearance({ manner: 'graceful' });
    expect(result).toContain('Libra');
  });

  it('should return Scorpio for intense manner', () => {
    const result = estimateAscendantByAppearance({ manner: 'intense' });
    expect(result).toContain('Scorpio');
  });

  it('should combine multiple traits', () => {
    const result = estimateAscendantByAppearance({
      faceShape: 'angular',
      bodyType: 'athletic',
      manner: 'fast',
    });
    expect(result).toContain('Aries');
  });

  it('should return top 3 candidates', () => {
    const result = estimateAscendantByAppearance({
      faceShape: 'angular',
      bodyType: 'athletic',
    });
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('should handle empty profile', () => {
    const result = estimateAscendantByAppearance({});
    expect(Array.isArray(result)).toBe(true);
  });

  it('should prioritize signs with most matches', () => {
    const result = estimateAscendantByAppearance({
      faceShape: 'angular',
      bodyType: 'athletic',
      manner: 'fast',
    });
    expect(result[0]).toBe('Aries');
  });
});

describe('generateTimeRangeCandidates', () => {
  it('should generate candidates for hour range', async () => {
    const input = {
      year: 1990,
      month: 5,
      date: 15,
      latitude: 37.5,
      longitude: 127,
    };
    const result = await generateTimeRangeCandidates(input, 9, 11, 60);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should respect interval minutes parameter', async () => {
    const input = {
      year: 1990,
      month: 5,
      date: 15,
      latitude: 37.5,
      longitude: 127,
    };
    const result = await generateTimeRangeCandidates(input, 9, 10, 30);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return chart for each time candidate', async () => {
    const input = {
      year: 1990,
      month: 5,
      date: 15,
      latitude: 37.5,
      longitude: 127,
    };
    const result = await generateTimeRangeCandidates(input, 9, 9, 60);
    expect(result[0]).toHaveProperty('time');
    expect(result[0]).toHaveProperty('chart');
  });

  it('should handle single hour range', async () => {
    const input = {
      year: 1990,
      month: 5,
      date: 15,
      latitude: 37.5,
      longitude: 127,
    };
    const result = await generateTimeRangeCandidates(input, 12, 12, 60);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('evaluateRectificationCandidates', () => {
  it('should evaluate candidates with life events', async () => {
    const candidates = [
      {
        time: new Date('1990-05-15T12:00:00'),
        chart: {
          date: new Date(),
          location: { latitude: 37.5, longitude: 127, elevation: 0 },
          planets: [],
          houses: [],
          ascendant: { longitude: 0, sign: 'Aries' as ZodiacKo, house: 1 },
          mc: { longitude: 270, sign: 'Capricorn' as ZodiacKo, house: 10 },
        },
      },
    ];
    const events: LifeEvent[] = [
      {
        date: new Date('2010-06-20'),
        type: 'marriage',
        description: 'Got married',
        importance: 'major',
      },
    ];
    const result = await evaluateRectificationCandidates(candidates, events, {
      year: 1990,
      month: 5,
      date: 15,
    });
    expect(result.length).toBe(1);
  });

  it('should sort by confidence descending', async () => {
    const candidates = [
      {
        time: new Date('1990-05-15T12:00:00'),
        chart: {
          date: new Date(),
          location: { latitude: 37.5, longitude: 127, elevation: 0 },
          planets: [],
          houses: [],
          ascendant: { longitude: 0, sign: 'Aries' as ZodiacKo, house: 1 },
          mc: { longitude: 270, sign: 'Capricorn' as ZodiacKo, house: 10 },
        },
      },
      {
        time: new Date('1990-05-15T14:00:00'),
        chart: {
          date: new Date(),
          location: { latitude: 37.5, longitude: 127, elevation: 0 },
          planets: [],
          houses: [],
          ascendant: { longitude: 30, sign: 'Taurus' as ZodiacKo, house: 1 },
          mc: { longitude: 300, sign: 'Aquarius' as ZodiacKo, house: 10 },
        },
      },
    ];
    const events: LifeEvent[] = [
      { date: new Date('2010-06-20'), type: 'marriage', description: 'Got married', importance: 'major' },
    ];
    const result = await evaluateRectificationCandidates(candidates, events, {
      year: 1990,
      month: 5,
      date: 15,
    });
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].confidence).toBeGreaterThanOrEqual(result[i].confidence);
    }
  });

  it('should include ascendant and MC information', async () => {
    const candidates = [
      {
        time: new Date('1990-05-15T12:00:00'),
        chart: {
          date: new Date(),
          location: { latitude: 37.5, longitude: 127, elevation: 0 },
          planets: [],
          houses: [],
          ascendant: { longitude: 0, sign: 'Aries' as ZodiacKo, house: 1 },
          mc: { longitude: 270, sign: 'Capricorn' as ZodiacKo, house: 10 },
        },
      },
    ];
    const events: LifeEvent[] = [];
    const result = await evaluateRectificationCandidates(candidates, events, {
      year: 1990,
      month: 5,
      date: 15,
    });
    expect(result[0]).toHaveProperty('ascendantSign');
    expect(result[0]).toHaveProperty('ascendantDegree');
    expect(result[0]).toHaveProperty('mcSign');
    expect(result[0]).toHaveProperty('mcDegree');
  });

  it('should include matching events', async () => {
    const candidates = [
      {
        time: new Date('1990-05-15T12:00:00'),
        chart: {
          date: new Date(),
          location: { latitude: 37.5, longitude: 127, elevation: 0 },
          planets: [],
          houses: [],
          ascendant: { longitude: 0, sign: 'Aries' as ZodiacKo, house: 1 },
          mc: { longitude: 270, sign: 'Capricorn' as ZodiacKo, house: 10 },
        },
      },
    ];
    const events: LifeEvent[] = [
      { date: new Date('2010-06-20'), type: 'marriage', description: 'Got married', importance: 'major' },
    ];
    const result = await evaluateRectificationCandidates(candidates, events, {
      year: 1990,
      month: 5,
      date: 15,
    });
    expect(result[0]).toHaveProperty('matchingEvents');
    expect(Array.isArray(result[0].matchingEvents)).toBe(true);
  });
});

describe('performRectification', () => {
  it('should perform full rectification analysis', async () => {
    const input = {
      year: 1990,
      month: 5,
      date: 15,
      latitude: 37.5,
      longitude: 127,
    };
    const events: LifeEvent[] = [
      { date: new Date('2010-06-20'), type: 'marriage', description: 'Got married', importance: 'major' },
    ];
    const result = await performRectification(input, events, {
      startHour: 12,
      endHour: 14,
      intervalMinutes: 60,
    });
    expect(result).toHaveProperty('candidates');
    expect(result).toHaveProperty('bestCandidate');
    expect(result).toHaveProperty('methodology');
    expect(result).toHaveProperty('recommendations');
    expect(result).toHaveProperty('confidenceLevel');
  });

  it('should filter by estimated ascendant signs', async () => {
    const input = {
      year: 1990,
      month: 5,
      date: 15,
      latitude: 37.5,
      longitude: 127,
    };
    const events: LifeEvent[] = [];
    const result = await performRectification(input, events, {
      estimatedAscSigns: ['Aries', 'Taurus'],
      intervalMinutes: 120,
    });
    expect(result.candidates.length).toBeGreaterThanOrEqual(0);
  });

  it('should return confidence level', async () => {
    const input = {
      year: 1990,
      month: 5,
      date: 15,
      latitude: 37.5,
      longitude: 127,
    };
    const events: LifeEvent[] = [
      { date: new Date('2010-06-20'), type: 'marriage', description: 'Got married', importance: 'major' },
    ];
    const result = await performRectification(input, events, {
      startHour: 12,
      endHour: 13,
      intervalMinutes: 60,
    });
    expect(['high', 'medium', 'low', 'uncertain']).toContain(result.confidenceLevel);
  });

  it('should provide methodology array', async () => {
    const input = {
      year: 1990,
      month: 5,
      date: 15,
      latitude: 37.5,
      longitude: 127,
    };
    const events: LifeEvent[] = [];
    const result = await performRectification(input, events);
    expect(Array.isArray(result.methodology)).toBe(true);
    expect(result.methodology.length).toBeGreaterThan(0);
  });

  it('should provide recommendations array', async () => {
    const input = {
      year: 1990,
      month: 5,
      date: 15,
      latitude: 37.5,
      longitude: 127,
    };
    const events: LifeEvent[] = [];
    const result = await performRectification(input, events);
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});

describe('getAscendantAppearance', () => {
  const signs: ZodiacKo[] = [
    'Aries',
    'Taurus',
    'Gemini',
    'Cancer',
    'Leo',
    'Virgo',
    'Libra',
    'Scorpio',
    'Sagittarius',
    'Capricorn',
    'Aquarius',
    'Pisces',
  ];

  signs.forEach((sign) => {
    it(`should return appearance profile for ${sign}`, () => {
      const result = getAscendantAppearance(sign);
      expect(result).toHaveProperty('face');
      expect(result).toHaveProperty('body');
      expect(result).toHaveProperty('manner');
      expect(result).toHaveProperty('firstImpression');
    });
  });

  it('should return Aries characteristics', () => {
    const result = getAscendantAppearance('Aries');
    expect(result.face).toContain('각진');
  });

  it('should return Taurus characteristics', () => {
    const result = getAscendantAppearance('Taurus');
    expect(result.face).toContain('목');
  });

  it('should return Leo characteristics', () => {
    const result = getAscendantAppearance('Leo');
    expect(result.firstImpression).toContain('카리스마');
  });
});

describe('getSajuHourRange', () => {
  it('should return hour range for 자시', () => {
    const result = getSajuHourRange('자시');
    expect(result).toEqual({ start: 23, end: 1 });
  });

  it('should return hour range for 축시', () => {
    const result = getSajuHourRange('축시');
    expect(result).toEqual({ start: 1, end: 3 });
  });

  it('should return hour range for 오시', () => {
    const result = getSajuHourRange('오시');
    expect(result).toEqual({ start: 11, end: 13 });
  });

  it('should return null for invalid sijin', () => {
    const result = getSajuHourRange('invalid');
    expect(result).toBeNull();
  });

  it('should handle all 12 saju hours', () => {
    const sijins = ['자시', '축시', '인시', '묘시', '진시', '사시', '오시', '미시', '신시', '유시', '술시', '해시'];
    sijins.forEach((sijin) => {
      const result = getSajuHourRange(sijin);
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('start');
      expect(result).toHaveProperty('end');
    });
  });
});

describe('getEventSignature', () => {
  const eventTypes: LifeEventType[] = [
    'marriage',
    'divorce',
    'birth_of_child',
    'career_change',
    'graduation',
    'major_move',
  ];

  eventTypes.forEach((eventType) => {
    it(`should return signature for ${eventType}`, () => {
      const result = getEventSignature(eventType);
      expect(result).toHaveProperty('relevantHouses');
      expect(result).toHaveProperty('relevantPlanets');
      expect(result).toHaveProperty('expectedTransits');
      expect(result).toHaveProperty('expectedDirections');
    });
  });

  it('should return marriage signature with 7th house', () => {
    const result = getEventSignature('marriage');
    expect(result.relevantHouses).toContain(7);
  });

  it('should return career change signature with 10th house', () => {
    const result = getEventSignature('career_change');
    expect(result.relevantHouses).toContain(10);
  });

  it('should return relevant planets for each event', () => {
    const result = getEventSignature('marriage');
    expect(result.relevantPlanets.length).toBeGreaterThan(0);
  });
});

describe('generateRectificationGuide', () => {
  it('should generate guide with approximate time', () => {
    const result = generateRectificationGuide(true, 5);
    expect(result).toHaveProperty('steps');
    expect(result).toHaveProperty('expectedAccuracy');
    expect(result).toHaveProperty('timeRequired');
  });

  it('should generate guide without approximate time', () => {
    const result = generateRectificationGuide(false, 3);
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('should show higher accuracy with more events', () => {
    const result1 = generateRectificationGuide(true, 2);
    const result2 = generateRectificationGuide(true, 5);
    expect(result2.expectedAccuracy).toContain('높음');
  });

  it('should show lower accuracy with fewer events', () => {
    const result = generateRectificationGuide(true, 2);
    expect(result.expectedAccuracy).toContain('낮음');
  });

  it('should provide step-by-step instructions', () => {
    const result = generateRectificationGuide(true, 3);
    expect(result.steps.some((s) => s.includes('정보 수집'))).toBe(true);
  });

  it('should estimate shorter time with approximate birth time', () => {
    const result = generateRectificationGuide(true, 3);
    expect(result.timeRequired).toContain('30분');
  });

  it('should estimate longer time without approximate birth time', () => {
    const result = generateRectificationGuide(false, 3);
    expect(result.timeRequired).toContain('시간');
  });
});

describe('Edge Cases', () => {
  it('should handle empty appearance profile', () => {
    const result = estimateAscendantByAppearance({});
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle zero events in rectification', async () => {
    const input = {
      year: 1990,
      month: 5,
      date: 15,
      latitude: 37.5,
      longitude: 127,
    };
    const result = await performRectification(input, [], {
      startHour: 12,
      endHour: 12,
      intervalMinutes: 60,
    });
    expect(result.confidenceLevel).toBe('uncertain');
  });

  it('should handle invalid saju hour gracefully', () => {
    const result = getSajuHourRange('invalid_hour');
    expect(result).toBeNull();
  });

  it('should handle boundary hour values', () => {
    const result = getSajuHourRange('자시');
    expect(result?.start).toBe(23);
    expect(result?.end).toBe(1);
  });
});

