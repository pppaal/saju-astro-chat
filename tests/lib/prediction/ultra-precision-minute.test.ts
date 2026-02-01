import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  analyzeMinutePrecision,
  findOptimalMinutes,
  analyzeDayTimeSlots,
  getQuickMinuteScore,
} from '@/lib/prediction/ultra-precision-minute';

// Mock dependencies
vi.mock('@/lib/prediction/advancedTimingEngine', () => ({
  analyzeBranchInteractions: vi.fn(),
}));

vi.mock('@/lib/prediction/index', () => ({
  scoreToGrade: vi.fn((score: number) => {
    if (score >= 80) return 'S';
    if (score >= 70) return 'A';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    return 'D';
  }),
}));

vi.mock('@/lib/prediction/utils/scoring-utils', () => ({
  normalizeScore: vi.fn((score: number) => Math.max(0, Math.min(100, score))),
}));

vi.mock('@/lib/prediction/precisionEngine', () => ({
  PrecisionEngine: {
    getLunarPhaseName: vi.fn((phase: string) => {
      const names: Record<string, string> = {
        new_moon: '삭',
        waxing_crescent: '초승달',
        first_quarter: '상현',
        waxing_gibbous: '볼록달',
        full_moon: '망',
        waning_gibbous: '하현 전',
        last_quarter: '하현',
        waning_crescent: '그믐달',
      };
      return names[phase] || '알 수 없음';
    }),
  },
  getSolarTermForDate: vi.fn(),
  getLunarMansion: vi.fn(),
  getLunarPhase: vi.fn(),
  calculatePlanetaryHours: vi.fn(),
}));

import { analyzeBranchInteractions } from '@/lib/prediction/advancedTimingEngine';
import {
  getSolarTermForDate,
  getLunarMansion,
  getLunarPhase,
  calculatePlanetaryHours,
} from '@/lib/prediction/precisionEngine';

describe('ultra-precision-minute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPlanetaryHour = {
    planet: 'Sun',
    element: '화' as const,
    quality: 'excellent' as const,
    goodFor: ['리더십', '중요 결정', '사업'],
    startTime: new Date('2026-02-15T09:00:00'),
    endTime: new Date('2026-02-15T10:00:00'),
  };

  const mockLunarMansion = {
    name: 'Jue',
    nameKo: '각',
    element: '목' as const,
    isAuspicious: true,
    goodFor: ['시작', '건설', '개업'],
    badFor: [],
  };

  const mockSolarTerm = {
    nameKo: '입춘',
    element: '목' as const,
    energy: 'yang' as const,
    seasonPhase: 'beginning' as const,
  };

  describe('analyzeMinutePrecision', () => {
    it('should return minute precision result with all components', () => {
      vi.mocked(calculatePlanetaryHours).mockReturnValue([mockPlanetaryHour]);
      vi.mocked(getLunarMansion).mockReturnValue(mockLunarMansion);
      vi.mocked(getLunarPhase).mockReturnValue('full_moon');
      vi.mocked(getSolarTermForDate).mockReturnValue(mockSolarTerm);
      vi.mocked(analyzeBranchInteractions).mockReturnValue([]);

      const datetime = new Date('2026-02-15T09:30:00');
      const result = analyzeMinutePrecision(datetime, '甲', '子');

      expect(result).toBeDefined();
      expect(result.datetime).toEqual(datetime);
      expect(result.hour).toBe(9);
      expect(result.minute).toBe(30);
      expect(result.hourBranch).toBeDefined();
      expect(result.hourStem).toBeDefined();
      expect(result.planetaryHour).toBeDefined();
      expect(result.lunarMansion).toBeDefined();
      expect(result.lunarPhase).toBeDefined();
      expect(result.solarTerm).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.grade).toBeDefined();
    });

    it('should calculate correct hour branch for midnight', () => {
      vi.mocked(calculatePlanetaryHours).mockReturnValue([mockPlanetaryHour]);
      vi.mocked(getLunarMansion).mockReturnValue(mockLunarMansion);
      vi.mocked(getLunarPhase).mockReturnValue('new_moon');
      vi.mocked(getSolarTermForDate).mockReturnValue(mockSolarTerm);
      vi.mocked(analyzeBranchInteractions).mockReturnValue([]);

      const datetime = new Date('2026-02-15T00:00:00');
      const result = analyzeMinutePrecision(datetime, '甲', '子');

      expect(result.hourBranch).toBe('子'); // 23:00-01:00 is 子
    });

    it('should increase score for excellent planetary hour', () => {
      vi.mocked(calculatePlanetaryHours).mockReturnValue([mockPlanetaryHour]);
      vi.mocked(getLunarMansion).mockReturnValue({ ...mockLunarMansion, isAuspicious: false });
      vi.mocked(getLunarPhase).mockReturnValue('waxing_crescent');
      vi.mocked(getSolarTermForDate).mockReturnValue(mockSolarTerm);
      vi.mocked(analyzeBranchInteractions).mockReturnValue([]);

      const datetime = new Date('2026-02-15T09:30:00');
      const result = analyzeMinutePrecision(datetime, '甲', '子');

      // Base 50 + excellent hour 15 - inauspicious mansion 5 = at least 60
      expect(result.score).toBeGreaterThan(50);
      expect(result.optimalActivities).toContain('리더십');
    });

    it('should decrease score for caution planetary hour', () => {
      const cautionHour = { ...mockPlanetaryHour, quality: 'caution' as const };
      vi.mocked(calculatePlanetaryHours).mockReturnValue([cautionHour]);
      vi.mocked(getLunarMansion).mockReturnValue({ ...mockLunarMansion, isAuspicious: false });
      vi.mocked(getLunarPhase).mockReturnValue('waxing_crescent');
      vi.mocked(getSolarTermForDate).mockReturnValue(mockSolarTerm);
      vi.mocked(analyzeBranchInteractions).mockReturnValue([]);

      const datetime = new Date('2026-02-15T09:30:00');
      const result = analyzeMinutePrecision(datetime, '甲', '子');

      // Base 50 - caution 10 - inauspicious 5 = 35
      expect(result.score).toBeLessThan(50);
      expect(result.avoidActivities).toContain('중요 결정');
    });

    it('should boost score when yongsin matches planetary hour element', () => {
      vi.mocked(calculatePlanetaryHours).mockReturnValue([mockPlanetaryHour]);
      vi.mocked(getLunarMansion).mockReturnValue(mockLunarMansion);
      vi.mocked(getLunarPhase).mockReturnValue('new_moon');
      vi.mocked(getSolarTermForDate).mockReturnValue(mockSolarTerm);
      vi.mocked(analyzeBranchInteractions).mockReturnValue([]);

      const datetime = new Date('2026-02-15T09:30:00');
      const yongsin = ['화'] as const; // Matches planetary hour element
      const result = analyzeMinutePrecision(datetime, '甲', '子', yongsin);

      expect(result.optimalActivities).toContain('용신 화 활성화');
    });

    it('should penalize score when kisin matches planetary hour element', () => {
      vi.mocked(calculatePlanetaryHours).mockReturnValue([mockPlanetaryHour]);
      vi.mocked(getLunarMansion).mockReturnValue(mockLunarMansion);
      vi.mocked(getLunarPhase).mockReturnValue('new_moon');
      vi.mocked(getSolarTermForDate).mockReturnValue(mockSolarTerm);
      vi.mocked(analyzeBranchInteractions).mockReturnValue([]);

      const datetime = new Date('2026-02-15T09:30:00');
      const kisin = ['화'] as const; // Matches planetary hour element
      const result = analyzeMinutePrecision(datetime, '甲', '子', undefined, kisin);

      expect(result.avoidActivities).toContain('기신 화 주의');
    });

    it('should boost score for auspicious lunar mansion', () => {
      vi.mocked(calculatePlanetaryHours).mockReturnValue([mockPlanetaryHour]);
      vi.mocked(getLunarMansion).mockReturnValue(mockLunarMansion);
      vi.mocked(getLunarPhase).mockReturnValue('waxing_crescent');
      vi.mocked(getSolarTermForDate).mockReturnValue(mockSolarTerm);
      vi.mocked(analyzeBranchInteractions).mockReturnValue([]);

      const datetime = new Date('2026-02-15T09:30:00');
      const result = analyzeMinutePrecision(datetime, '甲', '子');

      expect(result.optimalActivities).toContain('시작');
    });

    it('should penalize score for inauspicious lunar mansion', () => {
      const inauspiciousMansion = {
        ...mockLunarMansion,
        isAuspicious: false,
        badFor: ['결혼', '이동', '대부분'],
      };
      vi.mocked(calculatePlanetaryHours).mockReturnValue([mockPlanetaryHour]);
      vi.mocked(getLunarMansion).mockReturnValue(inauspiciousMansion);
      vi.mocked(getLunarPhase).mockReturnValue('waxing_crescent');
      vi.mocked(getSolarTermForDate).mockReturnValue(mockSolarTerm);
      vi.mocked(analyzeBranchInteractions).mockReturnValue([]);

      const datetime = new Date('2026-02-15T09:30:00');
      const result = analyzeMinutePrecision(datetime, '甲', '子');

      expect(result.avoidActivities).toContain('결혼');
    });

    it('should boost score for full moon', () => {
      vi.mocked(calculatePlanetaryHours).mockReturnValue([mockPlanetaryHour]);
      vi.mocked(getLunarMansion).mockReturnValue(mockLunarMansion);
      vi.mocked(getLunarPhase).mockReturnValue('full_moon');
      vi.mocked(getSolarTermForDate).mockReturnValue(mockSolarTerm);
      vi.mocked(analyzeBranchInteractions).mockReturnValue([]);

      const datetime = new Date('2026-02-15T09:30:00');
      const result = analyzeMinutePrecision(datetime, '甲', '子');

      expect(result.optimalActivities).toContain('완성');
      expect(result.lunarPhase.phase).toBe('full_moon');
    });

    it('should boost score for new moon', () => {
      vi.mocked(calculatePlanetaryHours).mockReturnValue([mockPlanetaryHour]);
      vi.mocked(getLunarMansion).mockReturnValue(mockLunarMansion);
      vi.mocked(getLunarPhase).mockReturnValue('new_moon');
      vi.mocked(getSolarTermForDate).mockReturnValue(mockSolarTerm);
      vi.mocked(analyzeBranchInteractions).mockReturnValue([]);

      const datetime = new Date('2026-02-15T09:30:00');
      const result = analyzeMinutePrecision(datetime, '甲', '子');

      expect(result.optimalActivities).toContain('시작');
      expect(result.lunarPhase.phase).toBe('new_moon');
    });

    it('should add yang activities for yang solar term', () => {
      vi.mocked(calculatePlanetaryHours).mockReturnValue([mockPlanetaryHour]);
      vi.mocked(getLunarMansion).mockReturnValue(mockLunarMansion);
      vi.mocked(getLunarPhase).mockReturnValue('waxing_crescent');
      vi.mocked(getSolarTermForDate).mockReturnValue(mockSolarTerm);
      vi.mocked(analyzeBranchInteractions).mockReturnValue([]);

      const datetime = new Date('2026-02-15T09:30:00');
      const result = analyzeMinutePrecision(datetime, '甲', '子');

      expect(result.optimalActivities).toContain('활동적 업무');
    });

    it('should add yin activities for yin solar term', () => {
      const yinSolarTerm = { ...mockSolarTerm, energy: 'yin' as const };
      vi.mocked(calculatePlanetaryHours).mockReturnValue([mockPlanetaryHour]);
      vi.mocked(getLunarMansion).mockReturnValue(mockLunarMansion);
      vi.mocked(getLunarPhase).mockReturnValue('waxing_crescent');
      vi.mocked(getSolarTermForDate).mockReturnValue(yinSolarTerm);
      vi.mocked(analyzeBranchInteractions).mockReturnValue([]);

      const datetime = new Date('2026-02-15T09:30:00');
      const result = analyzeMinutePrecision(datetime, '甲', '子');

      expect(result.optimalActivities).toContain('내부 작업');
    });

    it('should handle missing planetary hour gracefully', () => {
      vi.mocked(calculatePlanetaryHours).mockReturnValue([]);
      vi.mocked(getLunarMansion).mockReturnValue(mockLunarMansion);
      vi.mocked(getLunarPhase).mockReturnValue('new_moon');
      vi.mocked(getSolarTermForDate).mockReturnValue(mockSolarTerm);
      vi.mocked(analyzeBranchInteractions).mockReturnValue([]);

      const datetime = new Date('2026-02-15T09:30:00');
      const result = analyzeMinutePrecision(datetime, '甲', '子');

      expect(result.planetaryHour.planet).toBe('Unknown');
      expect(result.planetaryHour.quality).toBe('neutral');
    });

    it('should limit optimal activities to 5', () => {
      vi.mocked(calculatePlanetaryHours).mockReturnValue([mockPlanetaryHour]);
      vi.mocked(getLunarMansion).mockReturnValue(mockLunarMansion);
      vi.mocked(getLunarPhase).mockReturnValue('full_moon');
      vi.mocked(getSolarTermForDate).mockReturnValue(mockSolarTerm);
      vi.mocked(analyzeBranchInteractions).mockReturnValue([
        { type: 'harmony', score: 10, impact: 'positive', description: 'Good energy - test' },
        { type: 'support', score: 8, impact: 'positive', description: 'Support - test2' },
      ]);

      const datetime = new Date('2026-02-15T09:30:00');
      const result = analyzeMinutePrecision(datetime, '甲', '子', ['화']);

      expect(result.optimalActivities.length).toBeLessThanOrEqual(5);
    });

    it('should limit avoid activities to 3', () => {
      const cautionHour = { ...mockPlanetaryHour, quality: 'caution' as const };
      const inauspiciousMansion = {
        ...mockLunarMansion,
        isAuspicious: false,
        badFor: ['결혼', '이동', '매매', '건축'],
      };

      vi.mocked(calculatePlanetaryHours).mockReturnValue([cautionHour]);
      vi.mocked(getLunarMansion).mockReturnValue(inauspiciousMansion);
      vi.mocked(getLunarPhase).mockReturnValue('waxing_crescent');
      vi.mocked(getSolarTermForDate).mockReturnValue(mockSolarTerm);
      vi.mocked(analyzeBranchInteractions).mockReturnValue([]);

      const datetime = new Date('2026-02-15T09:30:00');
      const result = analyzeMinutePrecision(datetime, '甲', '子', undefined, ['화']);

      expect(result.avoidActivities.length).toBeLessThanOrEqual(3);
    });
  });

  describe('findOptimalMinutes', () => {
    it('should find optimal minutes in time range', () => {
      vi.mocked(calculatePlanetaryHours).mockReturnValue([mockPlanetaryHour]);
      vi.mocked(getLunarMansion).mockReturnValue(mockLunarMansion);
      vi.mocked(getLunarPhase).mockReturnValue('full_moon');
      vi.mocked(getSolarTermForDate).mockReturnValue(mockSolarTerm);
      vi.mocked(analyzeBranchInteractions).mockReturnValue([]);

      const date = new Date('2026-02-15');
      const results = findOptimalMinutes(date, 9, 10, '甲', '子');

      expect(Array.isArray(results)).toBe(true);
      expect(results.every(r => r.score >= 60)).toBe(true);
    });

    it('should sort results by score descending', () => {
      vi.mocked(calculatePlanetaryHours).mockReturnValue([mockPlanetaryHour]);
      vi.mocked(getLunarMansion).mockReturnValue(mockLunarMansion);
      vi.mocked(getLunarPhase).mockReturnValue('full_moon');
      vi.mocked(getSolarTermForDate).mockReturnValue(mockSolarTerm);
      vi.mocked(analyzeBranchInteractions).mockReturnValue([]);

      const date = new Date('2026-02-15');
      const results = findOptimalMinutes(date, 9, 11, '甲', '子');

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('should limit results to 10', () => {
      vi.mocked(calculatePlanetaryHours).mockReturnValue([mockPlanetaryHour]);
      vi.mocked(getLunarMansion).mockReturnValue(mockLunarMansion);
      vi.mocked(getLunarPhase).mockReturnValue('full_moon');
      vi.mocked(getSolarTermForDate).mockReturnValue(mockSolarTerm);
      vi.mocked(analyzeBranchInteractions).mockReturnValue([]);

      const date = new Date('2026-02-15');
      const results = findOptimalMinutes(date, 0, 23, '甲', '子');

      expect(results.length).toBeLessThanOrEqual(10);
    });
  });

  describe('analyzeDayTimeSlots', () => {
    it('should analyze all 24 hours', () => {
      vi.mocked(calculatePlanetaryHours).mockReturnValue([mockPlanetaryHour]);
      vi.mocked(getLunarMansion).mockReturnValue(mockLunarMansion);
      vi.mocked(getLunarPhase).mockReturnValue('full_moon');
      vi.mocked(getSolarTermForDate).mockReturnValue(mockSolarTerm);
      vi.mocked(analyzeBranchInteractions).mockReturnValue([]);

      const date = new Date('2026-02-15');
      const result = analyzeDayTimeSlots(date, '甲', '子');

      expect(result.best).toBeDefined();
      expect(result.worst).toBeDefined();
      expect(result.byActivity).toBeDefined();
    });

    it('should return top 5 best hours', () => {
      vi.mocked(calculatePlanetaryHours).mockReturnValue([mockPlanetaryHour]);
      vi.mocked(getLunarMansion).mockReturnValue(mockLunarMansion);
      vi.mocked(getLunarPhase).mockReturnValue('full_moon');
      vi.mocked(getSolarTermForDate).mockReturnValue(mockSolarTerm);
      vi.mocked(analyzeBranchInteractions).mockReturnValue([]);

      const date = new Date('2026-02-15');
      const result = analyzeDayTimeSlots(date, '甲', '子');

      expect(result.best.length).toBe(5);
    });

    it('should return top 3 worst hours', () => {
      vi.mocked(calculatePlanetaryHours).mockReturnValue([mockPlanetaryHour]);
      vi.mocked(getLunarMansion).mockReturnValue(mockLunarMansion);
      vi.mocked(getLunarPhase).mockReturnValue('full_moon');
      vi.mocked(getSolarTermForDate).mockReturnValue(mockSolarTerm);
      vi.mocked(analyzeBranchInteractions).mockReturnValue([]);

      const date = new Date('2026-02-15');
      const result = analyzeDayTimeSlots(date, '甲', '子');

      expect(result.worst.length).toBe(3);
    });

    it('should sort best hours by score descending', () => {
      vi.mocked(calculatePlanetaryHours).mockReturnValue([mockPlanetaryHour]);
      vi.mocked(getLunarMansion).mockReturnValue(mockLunarMansion);
      vi.mocked(getLunarPhase).mockReturnValue('full_moon');
      vi.mocked(getSolarTermForDate).mockReturnValue(mockSolarTerm);
      vi.mocked(analyzeBranchInteractions).mockReturnValue([]);

      const date = new Date('2026-02-15');
      const result = analyzeDayTimeSlots(date, '甲', '子');

      for (let i = 1; i < result.best.length; i++) {
        expect(result.best[i - 1].score).toBeGreaterThanOrEqual(result.best[i].score);
      }
    });
  });

  describe('getQuickMinuteScore', () => {
    it('should return quick score summary', () => {
      vi.mocked(calculatePlanetaryHours).mockReturnValue([mockPlanetaryHour]);
      vi.mocked(getLunarMansion).mockReturnValue(mockLunarMansion);
      vi.mocked(getLunarPhase).mockReturnValue('full_moon');
      vi.mocked(getSolarTermForDate).mockReturnValue(mockSolarTerm);
      vi.mocked(analyzeBranchInteractions).mockReturnValue([]);

      const datetime = new Date('2026-02-15T09:30:00');
      const result = getQuickMinuteScore(datetime, '甲', '子');

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.grade).toBeDefined();
      expect(result.advice).toBeDefined();
      expect(typeof result.advice).toBe('string');
    });
  });
});
