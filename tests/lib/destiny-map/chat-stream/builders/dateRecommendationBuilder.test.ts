import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildDateRecommendationSection,
  extractSajuDataForRecommendation,
} from '@/lib/destiny-map/chat-stream/builders/dateRecommendationBuilder';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock specificDateEngine
vi.mock('@/lib/timing/specificDateEngine', () => ({
  findBestDates: vi.fn(),
  findYongsinActivationPeriods: vi.fn(),
  generateSpecificDatePromptContext: vi.fn(),
  generateYongsinPromptContext: vi.fn(),
}));

import {
  findBestDates,
  findYongsinActivationPeriods,
  generateSpecificDatePromptContext,
  generateYongsinPromptContext,
} from '@/lib/timing/specificDateEngine';

describe('dateRecommendationBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSajuData = {
    dayStem: '甲',
    dayBranch: '子',
    monthBranch: '寅',
    yearBranch: '申',
    allStems: ['庚', '戊', '甲', '丙'],
    allBranches: ['申', '寅', '子', '辰'],
    primaryYongsin: '食神',
  };

  describe('buildDateRecommendationSection', () => {
    it('should return empty string when no recommendations found', () => {
      vi.mocked(findBestDates).mockReturnValue([]);

      const result = buildDateRecommendationSection({
        activity: '결혼',
        sajuData: mockSajuData,
        lang: 'ko',
      });

      expect(result).toBe('');
    });

    it('should build section with recommendations in Korean', () => {
      const mockRecommendations = [
        { date: new Date('2026-02-15'), score: 95, reasons: ['길일'] },
      ];

      vi.mocked(findBestDates).mockReturnValue(mockRecommendations);
      vi.mocked(generateSpecificDatePromptContext).mockReturnValue('추천 날짜 내용');

      const result = buildDateRecommendationSection({
        activity: '결혼',
        sajuData: mockSajuData,
        lang: 'ko',
      });

      expect(result).toContain('[📅 결혼 최적 날짜 추천]');
      expect(result).toContain('추천 날짜 내용');
      expect(result).toContain('위 구체적 날짜와 시간을 기반으로');
    });

    it('should build section with recommendations in English', () => {
      const mockRecommendations = [
        { date: new Date('2026-02-15'), score: 95, reasons: ['auspicious'] },
      ];

      vi.mocked(findBestDates).mockReturnValue(mockRecommendations);
      vi.mocked(generateSpecificDatePromptContext).mockReturnValue('Recommendation content');

      const result = buildDateRecommendationSection({
        activity: 'marriage',
        sajuData: mockSajuData,
        lang: 'en',
      });

      expect(result).toContain('[📅 Best Dates for marriage]');
      expect(result).toContain('Recommendation content');
      expect(result).toContain('Recommend specific dates and times based on the above');
    });

    it('should call findBestDates with correct parameters', () => {
      vi.mocked(findBestDates).mockReturnValue([]);

      buildDateRecommendationSection({
        activity: '이사',
        sajuData: mockSajuData,
        lang: 'ko',
        searchDays: 90,
        topN: 10,
      });

      expect(findBestDates).toHaveBeenCalledWith(
        expect.objectContaining({
          activity: '이사',
          dayStem: '甲',
          dayBranch: '子',
          monthBranch: '寅',
          yearBranch: '申',
          allStems: mockSajuData.allStems,
          allBranches: mockSajuData.allBranches,
          yongsin: '食神',
          searchDays: 90,
          topN: 10,
        })
      );
    });

    it('should use default searchDays and topN values', () => {
      vi.mocked(findBestDates).mockReturnValue([]);

      buildDateRecommendationSection({
        activity: '개업',
        sajuData: mockSajuData,
        lang: 'ko',
      });

      expect(findBestDates).toHaveBeenCalledWith(
        expect.objectContaining({
          searchDays: 60,
          topN: 5,
        })
      );
    });

    it('should include yongsin activation periods when available', () => {
      const mockRecommendations = [
        { date: new Date('2026-02-15'), score: 95, reasons: ['길일'] },
      ];
      const mockActivations = [
        { startDate: new Date('2026-03-01'), endDate: new Date('2026-03-05') },
      ];

      vi.mocked(findBestDates).mockReturnValue(mockRecommendations);
      vi.mocked(findYongsinActivationPeriods).mockReturnValue(mockActivations);
      vi.mocked(generateSpecificDatePromptContext).mockReturnValue('날짜 내용');
      vi.mocked(generateYongsinPromptContext).mockReturnValue('용신 내용');

      const result = buildDateRecommendationSection({
        activity: '취업',
        sajuData: mockSajuData,
        lang: 'ko',
      });

      expect(findYongsinActivationPeriods).toHaveBeenCalledWith(
        '食神',
        '甲',
        expect.any(Date),
        60
      );
      expect(result).toContain('용신 내용');
    });

    it('should not add yongsin section when primaryYongsin is missing', () => {
      const sajuDataWithoutYongsin = {
        ...mockSajuData,
        primaryYongsin: undefined,
      };

      const mockRecommendations = [
        { date: new Date('2026-02-15'), score: 95, reasons: ['길일'] },
      ];

      vi.mocked(findBestDates).mockReturnValue(mockRecommendations);
      vi.mocked(generateSpecificDatePromptContext).mockReturnValue('날짜 내용');

      buildDateRecommendationSection({
        activity: '취업',
        sajuData: sajuDataWithoutYongsin,
        lang: 'ko',
      });

      expect(findYongsinActivationPeriods).not.toHaveBeenCalled();
    });

    it('should not add yongsin section when no activations found', () => {
      const mockRecommendations = [
        { date: new Date('2026-02-15'), score: 95, reasons: ['길일'] },
      ];

      vi.mocked(findBestDates).mockReturnValue(mockRecommendations);
      vi.mocked(findYongsinActivationPeriods).mockReturnValue([]);
      vi.mocked(generateSpecificDatePromptContext).mockReturnValue('날짜 내용');

      const result = buildDateRecommendationSection({
        activity: '취업',
        sajuData: mockSajuData,
        lang: 'ko',
      });

      expect(result).not.toContain('용신 내용');
    });

    it('should limit yongsin activations to top 5', () => {
      const mockRecommendations = [
        { date: new Date('2026-02-15'), score: 95, reasons: ['길일'] },
      ];
      const mockActivations = Array.from({ length: 10 }, (_, i) => ({
        startDate: new Date(`2026-03-${i + 1}`),
        endDate: new Date(`2026-03-${i + 2}`),
      }));

      vi.mocked(findBestDates).mockReturnValue(mockRecommendations);
      vi.mocked(findYongsinActivationPeriods).mockReturnValue(mockActivations);
      vi.mocked(generateSpecificDatePromptContext).mockReturnValue('날짜 내용');
      vi.mocked(generateYongsinPromptContext).mockReturnValue('용신 내용');

      buildDateRecommendationSection({
        activity: '취업',
        sajuData: mockSajuData,
        lang: 'ko',
      });

      expect(generateYongsinPromptContext).toHaveBeenCalledWith(
        mockActivations.slice(0, 5),
        '食神',
        'ko'
      );
    });

    it('should handle errors gracefully', () => {
      vi.mocked(findBestDates).mockImplementation(() => {
        throw new Error('Mock error');
      });

      const result = buildDateRecommendationSection({
        activity: '결혼',
        sajuData: mockSajuData,
        lang: 'ko',
      });

      expect(result).toBe('');
    });
  });

  describe('extractSajuDataForRecommendation', () => {
    it('should extract saju data from dayMaster structure', () => {
      const saju = {
        dayMaster: {
          heavenlyStem: { name: '甲' },
          earthlyBranch: { name: '子' },
        },
        pillars: {
          year: {
            heavenlyStem: { name: '庚' },
            earthlyBranch: { name: '申' },
          },
          month: {
            heavenlyStem: { name: '戊' },
            earthlyBranch: { name: '寅' },
          },
          time: {
            heavenlyStem: { name: '丙' },
            earthlyBranch: { name: '辰' },
          },
        },
        advancedAnalysis: {
          yongsin: {
            primary: '食神',
          },
        },
      };

      const result = extractSajuDataForRecommendation(saju);

      expect(result).toEqual({
        dayStem: '甲',
        dayBranch: '子',
        monthBranch: '寅',
        yearBranch: '申',
        allStems: ['庚', '戊', '甲', '丙'],
        allBranches: ['申', '寅', '子', '辰'],
        primaryYongsin: '食神',
      });
    });

    it('should extract saju data from pillars.day structure', () => {
      const saju = {
        pillars: {
          day: {
            heavenlyStem: { name: '乙' },
            earthlyBranch: { name: '丑' },
          },
          year: {
            earthlyBranch: { name: '申' },
          },
          month: {
            earthlyBranch: { name: '寅' },
          },
        },
      };

      const result = extractSajuDataForRecommendation(saju);

      expect(result).toEqual({
        dayStem: '乙',
        dayBranch: '丑',
        monthBranch: '寅',
        yearBranch: '申',
        allStems: ['乙'],
        allBranches: ['申', '寅', '丑'],
        primaryYongsin: undefined,
      });
    });

    it('should return null when dayStem is missing', () => {
      const saju = {
        dayMaster: {
          earthlyBranch: { name: '子' },
        },
      };

      const result = extractSajuDataForRecommendation(saju);

      expect(result).toBeNull();
    });

    it('should return null when dayBranch is missing', () => {
      const saju = {
        dayMaster: {
          heavenlyStem: { name: '甲' },
        },
      };

      const result = extractSajuDataForRecommendation(saju);

      expect(result).toBeNull();
    });

    it('should use default 子 for missing monthBranch', () => {
      const saju = {
        dayMaster: {
          heavenlyStem: { name: '甲' },
          earthlyBranch: { name: '子' },
        },
        pillars: {},
      };

      const result = extractSajuDataForRecommendation(saju);

      expect(result?.monthBranch).toBe('子');
    });

    it('should use default 子 for missing yearBranch', () => {
      const saju = {
        dayMaster: {
          heavenlyStem: { name: '甲' },
          earthlyBranch: { name: '子' },
        },
        pillars: {},
      };

      const result = extractSajuDataForRecommendation(saju);

      expect(result?.yearBranch).toBe('子');
    });

    it('should filter out undefined stems', () => {
      const saju = {
        dayMaster: {
          heavenlyStem: { name: '甲' },
          earthlyBranch: { name: '子' },
        },
        pillars: {
          year: {
            heavenlyStem: { name: '庚' },
          },
          month: {},
          time: {},
        },
      };

      const result = extractSajuDataForRecommendation(saju);

      expect(result?.allStems).toEqual(['庚', '甲']);
    });

    it('should filter out undefined branches', () => {
      const saju = {
        dayMaster: {
          heavenlyStem: { name: '甲' },
          earthlyBranch: { name: '子' },
        },
        pillars: {
          year: {
            earthlyBranch: { name: '申' },
          },
          month: {},
          time: {},
        },
      };

      const result = extractSajuDataForRecommendation(saju);

      expect(result?.allBranches).toEqual(['申', '子', '子']);
    });

    it('should handle missing advancedAnalysis', () => {
      const saju = {
        dayMaster: {
          heavenlyStem: { name: '甲' },
          earthlyBranch: { name: '子' },
        },
      };

      const result = extractSajuDataForRecommendation(saju);

      expect(result?.primaryYongsin).toBeUndefined();
    });

    it('should handle empty saju object', () => {
      const result = extractSajuDataForRecommendation({});

      expect(result).toBeNull();
    });

    it('should prioritize dayMaster over pillars.day', () => {
      const saju = {
        dayMaster: {
          heavenlyStem: { name: '甲' },
          earthlyBranch: { name: '子' },
        },
        pillars: {
          day: {
            heavenlyStem: { name: '乙' },
            earthlyBranch: { name: '丑' },
          },
        },
      };

      const result = extractSajuDataForRecommendation(saju);

      expect(result?.dayStem).toBe('甲');
      expect(result?.dayBranch).toBe('子');
    });
  });
});
