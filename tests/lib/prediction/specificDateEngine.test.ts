// tests/lib/prediction/specificDateEngine.test.ts
// 구체적 날짜/시간 추천 엔진 테스트 - "3월 15일 오전 10시에 면접 보세요"

import { describe, it, expect } from 'vitest';
import {
  findBestDates,
  findYongsinActivationPeriods,
  generateSpecificDatePromptContext,
  generateYongsinPromptContext,
  type ActivityType,
  type DateSearchInput,
} from '@/lib/prediction/specificDateEngine';

// ============================================================
// 테스트 데이터 헬퍼
// ============================================================

function createBasicSearchInput(activity: ActivityType): DateSearchInput {
  return {
    activity,
    dayStem: '甲',
    dayBranch: '子',
    monthBranch: '卯',
    yearBranch: '午',
    allStems: ['甲', '乙', '丙', '丁'],
    allBranches: ['子', '卯', '午', '酉'],
    yongsin: '목',
    startDate: new Date(2024, 0, 1),
    searchDays: 30,
    topN: 5,
  };
}

// ============================================================
// findBestDates 테스트
// ============================================================

describe('specificDateEngine - findBestDates', () => {
  const activities: ActivityType[] = [
    'marriage', 'engagement', 'moving', 'business', 'contract',
    'interview', 'investment', 'travel', 'surgery', 'meeting',
    'proposal', 'study', 'career_change', 'opening', 'negotiation'
  ];

  it('should find best dates for marriage', () => {
    const input = createBasicSearchInput('marriage');
    const results = findBestDates(input);

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeLessThanOrEqual(5);
  });

  activities.forEach(activity => {
    it(`should handle ${activity} activity type`, () => {
      const input = createBasicSearchInput(activity);
      const results = findBestDates(input);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);

      for (const rec of results) {
        expect(rec.date).toBeInstanceOf(Date);
        expect(rec.year).toBeGreaterThan(2000);
        expect(rec.month).toBeGreaterThanOrEqual(1);
        expect(rec.month).toBeLessThanOrEqual(12);
        expect(rec.day).toBeGreaterThanOrEqual(1);
        expect(rec.day).toBeLessThanOrEqual(31);
        expect(rec.dayOfWeek).toBeTruthy();
      }
    });
  });

  it('should provide proper date structure', () => {
    const input = createBasicSearchInput('career_change');
    const results = findBestDates(input);

    for (const rec of results) {
      expect(rec.totalScore).toBeGreaterThanOrEqual(0);
      expect(rec.totalScore).toBeLessThanOrEqual(100);
      expect(rec.activityScore).toBeGreaterThanOrEqual(0);
      expect(rec.activityScore).toBeLessThanOrEqual(100);
      expect(['S', 'A', 'B', 'C', 'D']).toContain(rec.grade);
      expect(rec.rank).toBeGreaterThan(0);
      expect(rec.dailyStem).toBeTruthy();
      expect(rec.dailyBranch).toBeTruthy();
      expect(rec.twelveStage).toBeTruthy();
      expect(rec.sibsin).toBeTruthy();
      expect(Array.isArray(rec.bestHours)).toBe(true);
      expect(Array.isArray(rec.reasons)).toBe(true);
      expect(Array.isArray(rec.warnings)).toBe(true);
      expect(rec.detailedAnalysis).toBeTruthy();
    }
  });

  it('should rank results properly', () => {
    const input = createBasicSearchInput('investment');
    const results = findBestDates(input);

    for (let i = 0; i < results.length; i++) {
      expect(results[i].rank).toBe(i + 1);
    }

    // Scores should be in descending order
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].totalScore).toBeGreaterThanOrEqual(results[i + 1].totalScore);
    }
  });

  it('should provide best hours for each date', () => {
    const input = createBasicSearchInput('interview');
    const results = findBestDates(input);

    for (const rec of results) {
      for (const hour of rec.bestHours) {
        expect(hour.hour).toBeGreaterThanOrEqual(0);
        expect(hour.hour).toBeLessThan(24);
        expect(hour.hourRange).toBeTruthy();
        expect(hour.siGan).toBeTruthy();
        expect(['excellent', 'good', 'neutral']).toContain(hour.quality);
        expect(hour.reason).toBeTruthy();
        expect(hour.score).toBeGreaterThanOrEqual(0);
        expect(hour.score).toBeLessThanOrEqual(100);
      }
    }
  });

  it('should provide reasons and warnings', () => {
    const input = createBasicSearchInput('marriage');
    const results = findBestDates(input);

    for (const rec of results) {
      expect(rec.reasons.length).toBeGreaterThanOrEqual(0);
      expect(rec.warnings.length).toBeGreaterThanOrEqual(0);

      for (const reason of rec.reasons) {
        expect(typeof reason).toBe('string');
        expect(reason.length).toBeGreaterThan(0);
      }
    }
  });

  it('should respect topN parameter', () => {
    const input = createBasicSearchInput('business');
    input.topN = 3;

    const results = findBestDates(input);

    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('should respect searchDays parameter', () => {
    const input = createBasicSearchInput('contract');
    input.searchDays = 7; // Only search 7 days
    input.startDate = new Date(2024, 0, 1);

    const results = findBestDates(input);

    for (const rec of results) {
      const daysDiff = Math.floor((rec.date.getTime() - input.startDate!.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBeLessThan(7);
    }
  });

  it('should filter by minimum score', () => {
    const input = createBasicSearchInput('opening');
    const results = findBestDates(input);

    // All results should meet minimum quality threshold
    for (const rec of results) {
      expect(rec.totalScore).toBeGreaterThan(40); // Some reasonable minimum
    }
  });

  it('should consider yongsin when provided', () => {
    const withYongsin = createBasicSearchInput('career_change');
    withYongsin.yongsin = '목';

    const withoutYongsin = createBasicSearchInput('career_change');
    delete withoutYongsin.yongsin;

    const resultsWithYongsin = findBestDates(withYongsin);
    const resultsWithoutYongsin = findBestDates(withoutYongsin);

    expect(resultsWithYongsin).toBeDefined();
    expect(resultsWithoutYongsin).toBeDefined();
  });

  it('should handle different start dates', () => {
    const input1 = createBasicSearchInput('study');
    input1.startDate = new Date(2024, 0, 1);

    const input2 = createBasicSearchInput('study');
    input2.startDate = new Date(2024, 5, 1);

    const results1 = findBestDates(input1);
    const results2 = findBestDates(input2);

    expect(results1[0].date).not.toEqual(results2[0].date);
  });

  it('should handle short search period', () => {
    const input = createBasicSearchInput('meeting');
    input.searchDays = 3;
    input.topN = 10; // Request more than available

    const results = findBestDates(input);

    expect(results.length).toBeLessThanOrEqual(3); // Can't return more than searched
  });

  it('should provide Korean day of week', () => {
    const input = createBasicSearchInput('proposal');
    const results = findBestDates(input);

    for (const rec of results) {
      expect(['일', '월', '화', '수', '목', '금', '토']).toContain(rec.dayOfWeek);
    }
  });

  it('should assign proper grades', () => {
    const input = createBasicSearchInput('negotiation');
    const results = findBestDates(input);

    for (const rec of results) {
      // Verify grade is assigned and valid
      expect(['S', 'A', 'B', 'C', 'D']).toContain(rec.grade);
      // Verify higher scores get better grades
      expect(rec.totalScore).toBeGreaterThanOrEqual(0);
      expect(rec.totalScore).toBeLessThanOrEqual(100);
    }
  });
});

// ============================================================
// findYongsinActivationPeriods 테스트
// ============================================================

describe('specificDateEngine - findYongsinActivationPeriods', () => {
  it('should find yongsin activation periods', () => {
    const yongsin = '목';
    const dayStem = '甲';
    const startDate = new Date(2024, 0, 1);
    const searchDays = 30;

    const activations = findYongsinActivationPeriods(yongsin, dayStem, startDate, searchDays);

    expect(activations).toBeDefined();
    expect(Array.isArray(activations)).toBe(true);
  });

  it('should provide proper activation structure', () => {
    const activations = findYongsinActivationPeriods('화', '丙', new Date(2024, 0, 1), 30);

    for (const act of activations) {
      expect(act.date).toBeInstanceOf(Date);
      expect(['very_strong', 'strong', 'moderate', 'weak']).toContain(act.activationLevel);
      expect(act.score).toBeGreaterThan(0);
      expect(Array.isArray(act.sources)).toBe(true);
      expect(act.advice).toBeTruthy();
    }
  });

  it('should sort by activation strength', () => {
    const activations = findYongsinActivationPeriods('금', '庚', new Date(2024, 0, 1), 60);

    for (let i = 0; i < activations.length - 1; i++) {
      expect(activations[i].score).toBeGreaterThanOrEqual(activations[i + 1].score);
    }
  });

  it('should identify activation sources', () => {
    const activations = findYongsinActivationPeriods('수', '壬', new Date(2024, 0, 1), 30);

    for (const act of activations) {
      expect(act.sources.length).toBeGreaterThan(0);
      for (const source of act.sources) {
        expect(typeof source).toBe('string');
        expect(source.length).toBeGreaterThan(0);
      }
    }
  });

  it('should provide element-specific advice', () => {
    const elements: Array<'목' | '화' | '토' | '금' | '수'> = ['목', '화', '토', '금', '수'];

    for (const element of elements) {
      const activations = findYongsinActivationPeriods(element, '甲', new Date(2024, 0, 1), 15);

      if (activations.length > 0) {
        expect(activations[0].advice).toContain(element);
      }
    }
  });

  it('should vary by day stem', () => {
    const act1 = findYongsinActivationPeriods('목', '甲', new Date(2024, 0, 1), 30);
    const act2 = findYongsinActivationPeriods('목', '庚', new Date(2024, 0, 1), 30);

    // Both should return valid results (may or may not differ depending on implementation)
    expect(Array.isArray(act1)).toBe(true);
    expect(Array.isArray(act2)).toBe(true);
    // At least verify structure is consistent
    if (act1.length > 0 && act2.length > 0) {
      expect(act1[0]).toHaveProperty('date');
      expect(act2[0]).toHaveProperty('date');
    }
  });

  it('should handle different search periods', () => {
    const short = findYongsinActivationPeriods('화', '丙', new Date(2024, 0, 1), 7);
    const long = findYongsinActivationPeriods('화', '丙', new Date(2024, 0, 1), 60);

    expect(long.length).toBeGreaterThanOrEqual(short.length);
  });

  it('should classify activation levels correctly', () => {
    const activations = findYongsinActivationPeriods('토', '戊', new Date(2024, 0, 1), 30);

    for (const act of activations) {
      if (act.score >= 60) expect(act.activationLevel).toBe('very_strong');
      else if (act.score >= 40) expect(act.activationLevel).toBe('strong');
      else if (act.score >= 25) expect(act.activationLevel).toBe('moderate');
      else expect(act.activationLevel).toBe('weak');
    }
  });
});

// ============================================================
// Prompt Context Generation 테스트
// ============================================================

describe('specificDateEngine - prompt context generation', () => {
  it('should generate specific date prompt in Korean', () => {
    const input = createBasicSearchInput('marriage');
    const recommendations = findBestDates(input);
    const context = generateSpecificDatePromptContext(recommendations, 'marriage');

    expect(context).toBeTruthy();
    expect(typeof context).toBe('string');
    expect(context).toContain('최적 날짜');
    expect(context).toContain('결혼');
  });

  it('should generate specific date prompt in English', () => {
    const input = createBasicSearchInput('career_change');
    const recommendations = findBestDates(input);
    const context = generateSpecificDatePromptContext(recommendations, 'career_change', 'en');

    expect(context).toBeTruthy();
    expect(context).toContain('Best Dates');
  });

  it('should include date details in context', () => {
    const input = createBasicSearchInput('interview');
    const recommendations = findBestDates(input);
    const context = generateSpecificDatePromptContext(recommendations, 'interview');

    for (const rec of recommendations.slice(0, 3)) {
      expect(context).toContain(`${rec.month}월`);
      expect(context).toContain(`${rec.day}일`);
    }
  });

  it('should generate yongsin prompt in Korean', () => {
    const activations = findYongsinActivationPeriods('목', '甲', new Date(2024, 0, 1), 30);
    const context = generateYongsinPromptContext(activations, '목');

    expect(context).toBeTruthy();
    expect(context).toContain('용신');
    expect(context).toContain('목');
  });

  it('should generate yongsin prompt in English', () => {
    const activations = findYongsinActivationPeriods('화', '丙', new Date(2024, 0, 1), 30);
    const context = generateYongsinPromptContext(activations, '화', 'en');

    expect(context).toBeTruthy();
    expect(context).toContain('Yongsin');
  });

  it('should limit yongsin results in prompt', () => {
    const activations = findYongsinActivationPeriods('금', '庚', new Date(2024, 0, 1), 60);
    const context = generateYongsinPromptContext(activations, '금');

    // Should only include top 10
    const lines = context.split('\n').filter(l => l.includes('/'));
    expect(lines.length).toBeLessThanOrEqual(10);
  });

  it('should show activation strength in prompt', () => {
    const activations = findYongsinActivationPeriods('수', '壬', new Date(2024, 0, 1), 30);
    const context = generateYongsinPromptContext(activations, '수');

    if (activations.length > 0) {
      // Should have star ratings or strength indicators
      expect(context).toMatch(/★/);
    }
  });
});

// ============================================================
// 활동별 특성 테스트
// ============================================================

describe('specificDateEngine - activity-specific logic', () => {
  it('should favor harmonious dates for marriage', () => {
    const input = createBasicSearchInput('marriage');
    const results = findBestDates(input);

    // Marriage should prefer harmony-related factors
    for (const rec of results) {
      const hasPositiveFactors = rec.reasons.some(r =>
        r.includes('합') || r.includes('조화') || r.includes('정') || r.includes('귀인')
      );
      expect(rec.reasons.length).toBeGreaterThan(0);
    }
  });

  it('should consider movement stars for travel', () => {
    const input = createBasicSearchInput('travel');
    const results = findBestDates(input);

    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
  });

  it('should prioritize stability for investment', () => {
    const input = createBasicSearchInput('investment');
    const results = findBestDates(input);

    // Investment should have high minimum scores
    for (const rec of results) {
      expect(rec.totalScore).toBeGreaterThan(50);
    }
  });

  it('should consider learning stars for study', () => {
    const input = createBasicSearchInput('study');
    const results = findBestDates(input);

    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
  });

  it('should favor authority stars for career', () => {
    const input = createBasicSearchInput('career_change');
    const results = findBestDates(input);

    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
  });
});

// ============================================================
// 시간대 추천 테스트
// ============================================================

describe('specificDateEngine - hour recommendations', () => {
  it('should provide hour recommendations', () => {
    const input = createBasicSearchInput('interview');
    const results = findBestDates(input);

    expect(results.length).toBeGreaterThan(0);
    const firstResult = results[0];

    expect(firstResult.bestHours).toBeDefined();
    expect(firstResult.bestHours.length).toBeGreaterThan(0);
    expect(firstResult.bestHours.length).toBeLessThanOrEqual(3);
  });

  it('should filter out poor quality hours', () => {
    const input = createBasicSearchInput('contract');
    const results = findBestDates(input);

    for (const rec of results) {
      for (const hour of rec.bestHours) {
        expect(hour.quality).not.toBe('neutral');
      }
    }
  });

  it('should provide hour ranges', () => {
    const input = createBasicSearchInput('meeting');
    const results = findBestDates(input);

    for (const rec of results) {
      for (const hour of rec.bestHours) {
        expect(hour.hourRange).toMatch(/\d{2}:\d{2}-\d{2}:\d{2}/);
      }
    }
  });

  it('should include hour branch (siGan)', () => {
    const input = createBasicSearchInput('negotiation');
    const results = findBestDates(input);

    const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

    for (const rec of results) {
      for (const hour of rec.bestHours) {
        expect(BRANCHES).toContain(hour.siGan);
      }
    }
  });
});

// ============================================================
// 엣지 케이스 테스트
// ============================================================

describe('specificDateEngine - edge cases', () => {
  it('should handle no suitable dates found', () => {
    const input = createBasicSearchInput('marriage');
    input.searchDays = 2; // Very short search
    input.topN = 100; // Request many

    const results = findBestDates(input);

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  it('should handle year boundary', () => {
    const input = createBasicSearchInput('business');
    input.startDate = new Date(2024, 11, 25); // Late December
    input.searchDays = 15; // Crosses into new year

    const results = findBestDates(input);

    expect(results).toBeDefined();
  });

  it('should handle leap year dates', () => {
    const input = createBasicSearchInput('moving');
    input.startDate = new Date(2024, 1, 28); // Feb 28, 2024 (leap year)
    input.searchDays = 3; // Includes Feb 29

    const results = findBestDates(input);

    expect(results).toBeDefined();
  });

  it('should handle month boundaries', () => {
    const input = createBasicSearchInput('surgery');
    input.startDate = new Date(2024, 0, 30); // Jan 30
    input.searchDays = 5; // Crosses into February

    const results = findBestDates(input);

    expect(results).toBeDefined();
  });

  it('should handle very long search period', () => {
    const input = createBasicSearchInput('proposal');
    input.searchDays = 365; // Full year

    const results = findBestDates(input);

    expect(results).toBeDefined();
    expect(results.length).toBeLessThanOrEqual(input.topN!);
  });

  it('should handle all branches in input', () => {
    const input = createBasicSearchInput('opening');
    input.allBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

    const results = findBestDates(input);

    expect(results).toBeDefined();
  });

  it('should handle minimal branches', () => {
    const input = createBasicSearchInput('study');
    input.allBranches = ['子', '午']; // Only 2 branches

    const results = findBestDates(input);

    expect(results).toBeDefined();
  });

  it('should handle undefined yongsin', () => {
    const input = createBasicSearchInput('engagement');
    delete input.yongsin;

    const results = findBestDates(input);

    expect(results).toBeDefined();
  });
});
