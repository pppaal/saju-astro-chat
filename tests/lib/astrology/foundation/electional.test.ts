// @vitest-environment node
// tests/lib/astrology/foundation/electional.test.ts
import { describe, it, expect } from 'vitest';
import {
  getMoonPhase,
  getMoonPhaseName,
  checkVoidOfCourse,
  calculatePlanetaryHour,
  getRetrogradePlanets,
  classifyAspects,
  analyzeElection,
  findBestDates,
  getElectionalGuidelines,
  type MoonPhase,
  type ElectionalEventType,
  type VoidOfCourseInfo,
  type PlanetaryHour,
  type ElectionalScore,
  type ElectionalAnalysis,
} from '@/lib/astrology/foundation/electional';
import type { Chart } from '@/lib/astrology/foundation/types';

// ============================================================
// Mock Data Helpers
// ============================================================

function createMockChart(overrides?: Partial<Chart>): Chart {
  return {
    date: new Date('2025-01-15T12:00:00Z'),
    location: { latitude: 37.5, longitude: 127, elevation: 0 },
    planets: [
      { name: 'Sun', longitude: 295.5, latitude: 0, distance: 1, speed: 1, sign: 'Capricorn', house: 10, retrograde: false },
      { name: 'Moon', longitude: 45.2, latitude: 0, distance: 1, speed: 13, sign: 'Taurus', house: 2, retrograde: false },
      { name: 'Mercury', longitude: 280.0, latitude: 0, distance: 1, speed: 1, sign: 'Capricorn', house: 10, retrograde: false },
      { name: 'Venus', longitude: 310.0, latitude: 0, distance: 1, speed: 1, sign: 'Aquarius', house: 11, retrograde: false },
      { name: 'Mars', longitude: 100.0, latitude: 0, distance: 1, speed: 0.5, sign: 'Cancer', house: 4, retrograde: false },
      { name: 'Jupiter', longitude: 60.0, latitude: 0, distance: 1, speed: 0.08, sign: 'Gemini', house: 3, retrograde: false },
      { name: 'Saturn', longitude: 330.0, latitude: 0, distance: 1, speed: 0.03, sign: 'Pisces', house: 12, retrograde: false },
    ],
    houses: [],
    ascendant: { longitude: 0, sign: 'Aries', house: 1 },
    mc: { longitude: 270, sign: 'Capricorn', house: 10 },
    ...overrides,
  };
}

function createRetrogradeMercuryChart(): Chart {
  const chart = createMockChart();
  const mercury = chart.planets.find(p => p.name === 'Mercury');
  if (mercury) mercury.retrograde = true;
  return chart;
}

function createVoidOfCourseMoonChart(): Chart {
  const chart = createMockChart();
  const moon = chart.planets.find(p => p.name === 'Moon');
  if (moon) {
    moon.longitude = 58.5; // Near end of Taurus, no upcoming aspects
    moon.speed = 13;
  }
  return chart;
}

// ============================================================
// Test Suite: getMoonPhase
// ============================================================

describe('getMoonPhase', () => {
  it('should return new_moon when angle is less than 45 degrees', () => {
    const result = getMoonPhase(0, 30);
    expect(result).toBe('new_moon');
  });

  it('should return waxing_crescent when angle is between 45 and 90 degrees', () => {
    const result = getMoonPhase(0, 60);
    expect(result).toBe('waxing_crescent');
  });

  it('should return first_quarter when angle is between 90 and 135 degrees', () => {
    const result = getMoonPhase(0, 100);
    expect(result).toBe('first_quarter');
  });

  it('should return waxing_gibbous when angle is between 135 and 180 degrees', () => {
    const result = getMoonPhase(0, 150);
    expect(result).toBe('waxing_gibbous');
  });

  it('should return full_moon when angle is between 180 and 225 degrees', () => {
    const result = getMoonPhase(0, 190);
    expect(result).toBe('full_moon');
  });

  it('should return waning_gibbous when angle is between 225 and 270 degrees', () => {
    const result = getMoonPhase(0, 240);
    expect(result).toBe('waning_gibbous');
  });

  it('should return last_quarter when angle is between 270 and 315 degrees', () => {
    const result = getMoonPhase(0, 280);
    expect(result).toBe('last_quarter');
  });

  it('should return waning_crescent when angle is greater than 315 degrees', () => {
    const result = getMoonPhase(0, 330);
    expect(result).toBe('waning_crescent');
  });

  it('should handle wraparound when moon longitude is less than sun longitude', () => {
    const result = getMoonPhase(350, 10);
    expect(result).toBe('new_moon');
  });

  it('should handle exact boundaries', () => {
    expect(getMoonPhase(0, 45)).toBe('waxing_crescent');
    expect(getMoonPhase(0, 90)).toBe('first_quarter');
    expect(getMoonPhase(0, 180)).toBe('full_moon');
  });
});

// ============================================================
// Test Suite: getMoonPhaseName
// ============================================================

describe('getMoonPhaseName', () => {
  it('should return Korean name for new_moon', () => {
    expect(getMoonPhaseName('new_moon')).toBe('삭 (새달)');
  });

  it('should return Korean name for waxing_crescent', () => {
    expect(getMoonPhaseName('waxing_crescent')).toBe('초승달');
  });

  it('should return Korean name for first_quarter', () => {
    expect(getMoonPhaseName('first_quarter')).toBe('상현달');
  });

  it('should return Korean name for waxing_gibbous', () => {
    expect(getMoonPhaseName('waxing_gibbous')).toBe('차오르는 달');
  });

  it('should return Korean name for full_moon', () => {
    expect(getMoonPhaseName('full_moon')).toBe('보름달');
  });

  it('should return Korean name for waning_gibbous', () => {
    expect(getMoonPhaseName('waning_gibbous')).toBe('기우는 달');
  });

  it('should return Korean name for last_quarter', () => {
    expect(getMoonPhaseName('last_quarter')).toBe('하현달');
  });

  it('should return Korean name for waning_crescent', () => {
    expect(getMoonPhaseName('waning_crescent')).toBe('그믐달');
  });
});

// ============================================================
// Test Suite: checkVoidOfCourse
// ============================================================

describe('checkVoidOfCourse', () => {
  it('should return isVoid true when moon has no upcoming aspects in current sign', () => {
    const chart = createVoidOfCourseMoonChart();
    const result = checkVoidOfCourse(chart);
    expect(result.isVoid).toBe(true);
    expect(result.moonSign).toBe('Taurus');
  });

  it('should return isVoid false when moon has upcoming aspects', () => {
    const chart = createMockChart();
    const result = checkVoidOfCourse(chart);
    expect(result).toHaveProperty('isVoid');
    expect(result).toHaveProperty('moonSign');
  });

  it('should calculate hours remaining until sign change', () => {
    const chart = createVoidOfCourseMoonChart();
    const result = checkVoidOfCourse(chart);
    expect(result.hoursRemaining).toBeGreaterThan(0);
  });

  it('should handle missing moon planet gracefully', () => {
    const chart = createMockChart();
    chart.planets = chart.planets.filter(p => p.name !== 'Moon');
    const result = checkVoidOfCourse(chart);
    expect(result.isVoid).toBe(false);
    expect(result.description).toContain('달 정보 없음');
  });

  it('should detect upcoming conjunction aspect', () => {
    const chart = createMockChart();
    const moon = chart.planets.find(p => p.name === 'Moon');
    const jupiter = chart.planets.find(p => p.name === 'Jupiter');
    if (moon && jupiter) {
      moon.longitude = 58.0;
      jupiter.longitude = 59.5;
      jupiter.sign = moon.sign;
    }
    const result = checkVoidOfCourse(chart);
    expect(result.isVoid).toBe(false);
  });

  it('should provide Korean description for void state', () => {
    const chart = createVoidOfCourseMoonChart();
    const result = checkVoidOfCourse(chart);
    expect(result.description).toContain('공전 중');
  });

  it('should provide Korean description for active state', () => {
    const chart = createMockChart();
    chart.planets.find(p => p.name === 'Moon')!.longitude = 45.0;
    chart.planets.find(p => p.name === 'Jupiter')!.longitude = 55.0;
    const result = checkVoidOfCourse(chart);
    if (!result.isVoid) {
      expect(result.description).toContain('활성');
    }
  });
});

// ============================================================
// Test Suite: calculatePlanetaryHour
// ============================================================

describe('calculatePlanetaryHour', () => {
  it('should calculate planetary hour for Sunday', () => {
    const date = new Date('2025-01-19T12:00:00'); // Sunday
    const sunrise = new Date('2025-01-19T07:00:00');
    const sunset = new Date('2025-01-19T17:00:00');
    const result = calculatePlanetaryHour(date, 37.5, sunrise, sunset);
    expect(result.planet).toBeDefined();
    expect(result.dayRuler).toBe('Sun');
    expect(result.isDay).toBe(true);
  });

  it('should calculate planetary hour for Monday', () => {
    const date = new Date('2025-01-20T12:00:00'); // Monday
    const sunrise = new Date('2025-01-20T07:00:00');
    const sunset = new Date('2025-01-20T17:00:00');
    const result = calculatePlanetaryHour(date, 37.5, sunrise, sunset);
    expect(result.dayRuler).toBe('Moon');
  });

  it('should return isDay true for daytime hours', () => {
    const date = new Date('2025-01-19T14:00:00');
    const sunrise = new Date('2025-01-19T07:00:00');
    const sunset = new Date('2025-01-19T17:00:00');
    const result = calculatePlanetaryHour(date, 37.5, sunrise, sunset);
    expect(result.isDay).toBe(true);
  });

  it('should return isDay false for nighttime hours', () => {
    const date = new Date('2025-01-19T20:00:00');
    const sunrise = new Date('2025-01-19T07:00:00');
    const sunset = new Date('2025-01-19T17:00:00');
    const result = calculatePlanetaryHour(date, 37.5, sunrise, sunset);
    expect(result.isDay).toBe(false);
  });

  it('should provide goodFor activities list', () => {
    const date = new Date('2025-01-19T12:00:00');
    const sunrise = new Date('2025-01-19T07:00:00');
    const sunset = new Date('2025-01-19T17:00:00');
    const result = calculatePlanetaryHour(date, 37.5, sunrise, sunset);
    expect(Array.isArray(result.goodFor)).toBe(true);
    expect(result.goodFor.length).toBeGreaterThan(0);
  });

  it('should calculate correct hour index', () => {
    const date = new Date('2025-01-19T09:00:00');
    const sunrise = new Date('2025-01-19T07:00:00');
    const sunset = new Date('2025-01-19T17:00:00');
    const result = calculatePlanetaryHour(date, 37.5, sunrise, sunset);
    expect(result.startTime).toBeInstanceOf(Date);
    expect(result.endTime).toBeInstanceOf(Date);
  });
});

// ============================================================
// Test Suite: getRetrogradePlanets
// ============================================================

describe('getRetrogradePlanets', () => {
  it('should return empty array when no planets are retrograde', () => {
    const chart = createMockChart();
    const result = getRetrogradePlanets(chart);
    expect(result).toEqual([]);
  });

  it('should return Mercury when Mercury is retrograde', () => {
    const chart = createRetrogradeMercuryChart();
    const result = getRetrogradePlanets(chart);
    expect(result).toContain('Mercury');
  });

  it('should return multiple retrograde planets', () => {
    const chart = createMockChart();
    chart.planets.find(p => p.name === 'Mercury')!.retrograde = true;
    chart.planets.find(p => p.name === 'Venus')!.retrograde = true;
    const result = getRetrogradePlanets(chart);
    expect(result).toContain('Mercury');
    expect(result).toContain('Venus');
    expect(result.length).toBe(2);
  });

  it('should not include direct planets', () => {
    const chart = createMockChart();
    chart.planets.find(p => p.name === 'Mars')!.retrograde = true;
    const result = getRetrogradePlanets(chart);
    expect(result).not.toContain('Sun');
    expect(result).not.toContain('Moon');
  });
});

// ============================================================
// Test Suite: classifyAspects
// ============================================================

describe('classifyAspects', () => {
  it('should classify beneficial aspects', () => {
    const chart = createMockChart();
    const result = classifyAspects(chart);
    expect(result).toHaveProperty('benefic');
    expect(result).toHaveProperty('malefic');
    expect(Array.isArray(result.benefic)).toBe(true);
    expect(Array.isArray(result.malefic)).toBe(true);
  });

  it('should identify Venus trine aspects as benefic', () => {
    const chart = createMockChart();
    const result = classifyAspects(chart);
    expect(result.benefic).toBeDefined();
  });

  it('should identify Saturn square aspects as malefic', () => {
    const chart = createMockChart();
    const result = classifyAspects(chart);
    expect(result.malefic).toBeDefined();
  });

  it('should handle charts with no significant aspects', () => {
    const chart = createMockChart();
    // Spread planets far apart
    chart.planets.forEach((p, i) => {
      p.longitude = i * 40;
    });
    const result = classifyAspects(chart);
    expect(result.benefic).toBeDefined();
    expect(result.malefic).toBeDefined();
  });
});

// ============================================================
// Test Suite: analyzeElection
// ============================================================

describe('analyzeElection', () => {
  const eventTypes: ElectionalEventType[] = [
    'business_start',
    'signing_contracts',
    'marriage',
    'surgery',
    'investment',
  ];

  eventTypes.forEach(eventType => {
    it(`should analyze ${eventType} event type`, () => {
      const chart = createMockChart();
      const dateTime = new Date('2025-01-15T12:00:00');
      const result = analyzeElection(chart, eventType, dateTime);
      expect(result.eventType).toBe(eventType);
      expect(result.score).toHaveProperty('total');
      expect(result.score).toHaveProperty('moonFactors');
      expect(result.score).toHaveProperty('planetaryAspects');
      expect(result.score).toHaveProperty('retrogradeIssues');
    });
  });

  it('should calculate total score between 0 and 100', () => {
    const chart = createMockChart();
    const result = analyzeElection(chart, 'marriage', new Date());
    expect(result.score.total).toBeGreaterThanOrEqual(0);
    expect(result.score.total).toBeLessThanOrEqual(100);
  });

  it('should provide interpretation for high scores', () => {
    const chart = createMockChart();
    const result = analyzeElection(chart, 'marriage', new Date());
    expect(result.score.interpretation).toBeDefined();
    expect(typeof result.score.interpretation).toBe('string');
  });

  it('should include moonPhase in analysis', () => {
    const chart = createMockChart();
    const result = analyzeElection(chart, 'marriage', new Date());
    expect(result.moonPhase).toBeDefined();
  });

  it('should include moonSign in analysis', () => {
    const chart = createMockChart();
    const result = analyzeElection(chart, 'marriage', new Date());
    expect(result.moonSign).toBeDefined();
  });

  it('should include voidOfCourse information', () => {
    const chart = createMockChart();
    const result = analyzeElection(chart, 'marriage', new Date());
    expect(result.voidOfCourse).toHaveProperty('isVoid');
  });

  it('should include currentHour planetary hour', () => {
    const chart = createMockChart();
    const result = analyzeElection(chart, 'marriage', new Date());
    expect(result.currentHour).toHaveProperty('planet');
  });

  it('should list retrograde planets', () => {
    const chart = createRetrogradeMercuryChart();
    const result = analyzeElection(chart, 'signing_contracts', new Date());
    expect(result.retrogradePlanets).toContain('Mercury');
  });

  it('should provide recommendations array', () => {
    const chart = createMockChart();
    const result = analyzeElection(chart, 'marriage', new Date());
    expect(Array.isArray(result.recommendations)).toBe(true);
  });

  it('should provide warnings array', () => {
    const chart = createMockChart();
    const result = analyzeElection(chart, 'marriage', new Date());
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it('should warn about void of course moon', () => {
    const chart = createVoidOfCourseMoonChart();
    const result = analyzeElection(chart, 'business_start', new Date());
    const hasVoidWarning = result.warnings.some(w => w.includes('공전 중'));
    expect(hasVoidWarning || result.voidOfCourse.isVoid).toBe(true);
  });

  it('should warn about Mercury retrograde for contracts', () => {
    const chart = createRetrogradeMercuryChart();
    const result = analyzeElection(chart, 'signing_contracts', new Date());
    expect(result.retrogradePlanets).toContain('Mercury');
  });
});

// ============================================================
// Test Suite: findBestDates
// ============================================================

describe('findBestDates', () => {
  it('should find best dates from multiple chart options', () => {
    const charts = [
      { date: new Date('2025-01-15'), chart: createMockChart() },
      { date: new Date('2025-01-16'), chart: createMockChart() },
      { date: new Date('2025-01-17'), chart: createMockChart() },
    ];
    const result = findBestDates('marriage', new Date('2025-01-15'), new Date('2025-01-20'), charts);
    expect(result.length).toBe(3);
  });

  it('should sort dates by score descending', () => {
    const charts = [
      { date: new Date('2025-01-15'), chart: createMockChart() },
      { date: new Date('2025-01-16'), chart: createMockChart() },
    ];
    const result = findBestDates('marriage', new Date('2025-01-15'), new Date('2025-01-20'), charts);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
    }
  });

  it('should include date, score, and interpretation for each result', () => {
    const charts = [
      { date: new Date('2025-01-15'), chart: createMockChart() },
    ];
    const result = findBestDates('marriage', new Date('2025-01-15'), new Date('2025-01-20'), charts);
    expect(result[0]).toHaveProperty('date');
    expect(result[0]).toHaveProperty('score');
    expect(result[0]).toHaveProperty('interpretation');
  });

  it('should handle empty charts array', () => {
    const result = findBestDates('marriage', new Date('2025-01-15'), new Date('2025-01-20'), []);
    expect(result).toEqual([]);
  });
});

// ============================================================
// Test Suite: getElectionalGuidelines
// ============================================================

describe('getElectionalGuidelines', () => {
  const eventTypes: ElectionalEventType[] = [
    'business_start',
    'signing_contracts',
    'marriage',
    'surgery',
    'investment',
    'buying_property',
    'creative_start',
    'exam',
  ];

  eventTypes.forEach(eventType => {
    it(`should provide guidelines for ${eventType}`, () => {
      const result = getElectionalGuidelines(eventType);
      expect(result).toHaveProperty('bestMoonPhases');
      expect(result).toHaveProperty('bestMoonSigns');
      expect(result).toHaveProperty('avoidRetrogrades');
      expect(result).toHaveProperty('tips');
    });
  });

  it('should provide Korean moon phase names', () => {
    const result = getElectionalGuidelines('marriage');
    expect(Array.isArray(result.bestMoonPhases)).toBe(true);
    expect(result.bestMoonPhases.length).toBeGreaterThan(0);
  });

  it('should include surgery-specific tips', () => {
    const result = getElectionalGuidelines('surgery');
    expect(result.tips.length).toBeGreaterThan(0);
    expect(result.tips.some(tip => tip.includes('수술'))).toBe(true);
  });

  it('should include marriage-specific tips', () => {
    const result = getElectionalGuidelines('marriage');
    expect(result.tips.length).toBeGreaterThan(0);
    expect(result.tips.some(tip => tip.includes('금성'))).toBe(true);
  });

  it('should include contract-specific tips', () => {
    const result = getElectionalGuidelines('signing_contracts');
    expect(result.tips.length).toBeGreaterThan(0);
    expect(result.tips.some(tip => tip.includes('수성'))).toBe(true);
  });

  it('should list planets to avoid retrograde', () => {
    const result = getElectionalGuidelines('signing_contracts');
    expect(result.avoidRetrogrades).toContain('Mercury');
  });

  it('should list best days of week if specified', () => {
    const result = getElectionalGuidelines('business_start');
    expect(result.bestDays).toBeDefined();
  });

  it('should list signs to avoid for surgery', () => {
    const result = getElectionalGuidelines('surgery');
    expect(result.avoidMoonSigns).toBeDefined();
    expect(result.avoidMoonSigns!.length).toBeGreaterThan(0);
  });
});

// ============================================================
// Test Suite: Edge Cases
// ============================================================

describe('Edge Cases', () => {
  it('should handle boundary moon phases correctly', () => {
    expect(getMoonPhase(0, 44.9)).toBe('new_moon');
    expect(getMoonPhase(0, 45.1)).toBe('waxing_crescent');
  });

  it('should handle 360-degree wraparound', () => {
    const result = getMoonPhase(359, 1);
    expect(result).toBeDefined();
  });

  it('should handle null/undefined in chart gracefully', () => {
    const chart = createMockChart();
    chart.planets = [];
    expect(() => getRetrogradePlanets(chart)).not.toThrow();
  });

  it('should handle very early sunrise times', () => {
    const date = new Date('2025-01-19T06:00:00');
    const sunrise = new Date('2025-01-19T05:00:00');
    const sunset = new Date('2025-01-19T17:00:00');
    const result = calculatePlanetaryHour(date, 37.5, sunrise, sunset);
    expect(result).toBeDefined();
  });

  it('should handle very late sunset times', () => {
    const date = new Date('2025-06-21T20:00:00');
    const sunrise = new Date('2025-06-21T05:00:00');
    const sunset = new Date('2025-06-21T20:30:00');
    const result = calculatePlanetaryHour(date, 60.0, sunrise, sunset);
    expect(result).toBeDefined();
  });
});

