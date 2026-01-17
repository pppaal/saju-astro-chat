/**
 * Theme Prompts Tests
 * Tests for all fortune theme prompt builders
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the dependencies
vi.mock('@/lib/destiny-map/prompt/fortune/base/baseAllDataPrompt', () => ({
  buildAllDataPrompt: vi.fn(() => '[Mock All Data Prompt]'),
}));

vi.mock('@/lib/destiny-map/prompt/fortune/base/toneStyle', () => ({
  buildTonePrompt: vi.fn(() => '[Mock Tone Prompt]'),
}));

// Mock CombinedResult data for testing
const mockCombinedResult = {
  meta: { generator: 'test', generatedAt: '2024-01-15T00:00:00Z' },
  astrology: {},
  saju: {
    dayMaster: { name: '庚', element: '금', yin_yang: '양' },
    fourPillars: {
      year: { heavenlyStem: '庚', earthlyBranch: '午' },
      month: { heavenlyStem: '辛', earthlyBranch: '巳' },
      day: { heavenlyStem: '庚', earthlyBranch: '辰' },
      hour: { heavenlyStem: '癸', earthlyBranch: '未' },
    },
  },
  summary: 'Test summary',
  userTimezone: 'Asia/Seoul',
  analysisDate: '2024-01-15',
};

describe('Today Prompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export buildTodayPrompt function', async () => {
    const { buildTodayPrompt } = await import('@/lib/destiny-map/prompt/fortune/theme/todayPrompt');
    expect(typeof buildTodayPrompt).toBe('function');
  });

  it('should generate prompt for Korean', async () => {
    const { buildTodayPrompt } = await import('@/lib/destiny-map/prompt/fortune/theme/todayPrompt');
    const result = buildTodayPrompt('ko', mockCombinedResult as never);

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain('ko');
    expect(result).toContain('2024-01-15');
  });

  it('should generate prompt for English', async () => {
    const { buildTodayPrompt } = await import('@/lib/destiny-map/prompt/fortune/theme/todayPrompt');
    const result = buildTodayPrompt('en', mockCombinedResult as never);

    expect(typeof result).toBe('string');
    expect(result).toContain('en');
  });

  it('should include timezone info', async () => {
    const { buildTodayPrompt } = await import('@/lib/destiny-map/prompt/fortune/theme/todayPrompt');
    const result = buildTodayPrompt('ko', mockCombinedResult as never);

    expect(result).toContain('Asia/Seoul');
  });

  it('should include required sections', async () => {
    const { buildTodayPrompt } = await import('@/lib/destiny-map/prompt/fortune/theme/todayPrompt');
    const result = buildTodayPrompt('ko', mockCombinedResult as never);

    expect(result).toContain('오늘 한줄요약');
    expect(result).toContain('행동 가이드');
    expect(result).toContain('교차 하이라이트');
  });
});

describe('Career Prompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export buildCareerPrompt function', async () => {
    const { buildCareerPrompt } = await import('@/lib/destiny-map/prompt/fortune/theme/careerPrompt');
    expect(typeof buildCareerPrompt).toBe('function');
  });

  it('should generate prompt for Korean', async () => {
    const { buildCareerPrompt } = await import('@/lib/destiny-map/prompt/fortune/theme/careerPrompt');
    const result = buildCareerPrompt('ko', mockCombinedResult as never);

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should include career sections', async () => {
    const { buildCareerPrompt } = await import('@/lib/destiny-map/prompt/fortune/theme/careerPrompt');
    const result = buildCareerPrompt('ko', mockCombinedResult as never);

    expect(result).toContain('직업 적성');
    expect(result).toContain('추천 직종');
    expect(result).toContain('사업 vs 직장');
  });

  it('should handle useStructured parameter', async () => {
    const { buildCareerPrompt } = await import('@/lib/destiny-map/prompt/fortune/theme/careerPrompt');
    const result1 = buildCareerPrompt('ko', mockCombinedResult as never, true);
    const result2 = buildCareerPrompt('ko', mockCombinedResult as never, false);

    expect(typeof result1).toBe('string');
    expect(typeof result2).toBe('string');
  });
});

describe('Love Prompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export buildLovePrompt function', async () => {
    const { buildLovePrompt } = await import('@/lib/destiny-map/prompt/fortune/theme/lovePrompt');
    expect(typeof buildLovePrompt).toBe('function');
  });

  it('should generate prompt for Korean', async () => {
    const { buildLovePrompt } = await import('@/lib/destiny-map/prompt/fortune/theme/lovePrompt');
    const result = buildLovePrompt('ko', mockCombinedResult as never);

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('Health Prompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export buildHealthPrompt function', async () => {
    const { buildHealthPrompt } = await import('@/lib/destiny-map/prompt/fortune/theme/healthPrompt');
    expect(typeof buildHealthPrompt).toBe('function');
  });

  it('should generate prompt for Korean', async () => {
    const { buildHealthPrompt } = await import('@/lib/destiny-map/prompt/fortune/theme/healthPrompt');
    const result = buildHealthPrompt('ko', mockCombinedResult as never);

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('Family Prompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export buildFamilyPrompt function', async () => {
    const { buildFamilyPrompt } = await import('@/lib/destiny-map/prompt/fortune/theme/familyPrompt');
    expect(typeof buildFamilyPrompt).toBe('function');
  });

  it('should generate prompt for Korean', async () => {
    const { buildFamilyPrompt } = await import('@/lib/destiny-map/prompt/fortune/theme/familyPrompt');
    const result = buildFamilyPrompt('ko', mockCombinedResult as never);

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('Month Prompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export buildMonthPrompt function', async () => {
    const { buildMonthPrompt } = await import('@/lib/destiny-map/prompt/fortune/theme/monthPrompt');
    expect(typeof buildMonthPrompt).toBe('function');
  });

  it('should generate prompt for Korean', async () => {
    const { buildMonthPrompt } = await import('@/lib/destiny-map/prompt/fortune/theme/monthPrompt');
    const result = buildMonthPrompt('ko', mockCombinedResult as never);

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('Year Prompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export buildThisYearPrompt function', async () => {
    const { buildThisYearPrompt } = await import('@/lib/destiny-map/prompt/fortune/theme/yearPrompt');
    expect(typeof buildThisYearPrompt).toBe('function');
  });

  it('should generate prompt for Korean', async () => {
    const { buildThisYearPrompt } = await import('@/lib/destiny-map/prompt/fortune/theme/yearPrompt');
    const result = buildThisYearPrompt('ko', mockCombinedResult as never);

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('Newyear Prompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export buildNewyearPrompt function', async () => {
    const { buildNewyearPrompt } = await import('@/lib/destiny-map/prompt/fortune/theme/newyearPrompt');
    expect(typeof buildNewyearPrompt).toBe('function');
  });

  it('should generate prompt for Korean', async () => {
    const { buildNewyearPrompt } = await import('@/lib/destiny-map/prompt/fortune/theme/newyearPrompt');
    const result = buildNewyearPrompt('ko', mockCombinedResult as never);

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('Life Prompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export buildLifePrompt function', async () => {
    const { buildLifePrompt } = await import('@/lib/destiny-map/prompt/fortune/theme/lifePrompt');
    expect(typeof buildLifePrompt).toBe('function');
  });

  it('should generate prompt for Korean', async () => {
    const { buildLifePrompt } = await import('@/lib/destiny-map/prompt/fortune/theme/lifePrompt');
    const result = buildLifePrompt('ko', mockCombinedResult as never);

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('Prompt Date Handling', () => {
  it('should use analysisDate when provided', async () => {
    const { buildTodayPrompt } = await import('@/lib/destiny-map/prompt/fortune/theme/todayPrompt');
    const result = buildTodayPrompt('ko', mockCombinedResult as never);

    expect(result).toContain('2024-01-15');
  });

  it('should handle missing analysisDate', async () => {
    const { buildTodayPrompt } = await import('@/lib/destiny-map/prompt/fortune/theme/todayPrompt');
    const dataWithoutDate = { ...mockCombinedResult, analysisDate: undefined };
    const result = buildTodayPrompt('ko', dataWithoutDate as never);

    expect(typeof result).toBe('string');
    // Should use current date as fallback
    expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('should handle missing timezone', async () => {
    const { buildTodayPrompt } = await import('@/lib/destiny-map/prompt/fortune/theme/todayPrompt');
    const dataWithoutTz = { ...mockCombinedResult, userTimezone: undefined };
    const result = buildTodayPrompt('ko', dataWithoutTz as never);

    expect(typeof result).toBe('string');
    expect(result).not.toContain('Asia/Seoul');
  });
});

describe('Prompt Language Support', () => {
  const languages = ['ko', 'en'];

  languages.forEach((lang) => {
    it(`should generate today prompt for ${lang}`, async () => {
      const { buildTodayPrompt } = await import('@/lib/destiny-map/prompt/fortune/theme/todayPrompt');
      const result = buildTodayPrompt(lang, mockCombinedResult as never);

      expect(typeof result).toBe('string');
      expect(result).toContain(`Respond in ${lang}`);
    });
  });
});
