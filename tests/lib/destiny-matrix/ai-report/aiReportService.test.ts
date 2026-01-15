// tests/lib/destiny-matrix/ai-report/aiReportService.test.ts
// Comprehensive tests for AI Report Service with mocked fetch

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateAIPremiumReport } from '@/lib/destiny-matrix/ai-report/aiReportService';
import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types';
import type { FusionReport } from '@/lib/destiny-matrix/interpreter/types';
import type { FiveElement } from '@/lib/Saju/types';

// ===========================
// Mock Data Helpers
// ===========================

function createMockInput(): MatrixCalculationInput {
  return {
    dayMasterElement: '목' as FiveElement,
    dominantWesternElement: 'Earth',
    lang: 'ko',
    geokguk: '종격',
    yongsin: '화' as FiveElement,
    sibsinDistribution: {
      '비견': 2,
      '식신': 3,
    },
    shinsalList: ['천을귀인'],
    currentDaeunElement: '화' as FiveElement,
  } as MatrixCalculationInput;
}

function createMockReport(): FusionReport {
  return {
    id: 'report_1',
    generatedAt: new Date(),
    version: '2.0.0',
    lang: 'ko',
    profile: {
      dayMasterElement: '목' as FiveElement,
      dayMasterDescription: '목 에너지',
      dominantSibsin: [],
      keyShinsals: [],
    },
    overallScore: {
      total: 75,
      grade: 'A',
      gradeDescription: '훌륭한 조화',
      gradeDescriptionEn: 'Excellent harmony',
      categoryScores: {
        strength: 80,
        opportunity: 70,
        balance: 75,
        caution: 65,
        challenge: 60,
      },
    },
    topInsights: [],
    domainAnalysis: [],
    timingAnalysis: {
      currentPeriod: {
        name: '현재 운세',
        nameEn: 'Current Fortune',
        score: 70,
        description: '좋은 흐름',
        descriptionEn: 'Good flow',
      },
      activeTransits: [],
      upcomingPeriods: [],
      retrogradeAlerts: [],
    },
    visualizations: {
      radarChart: { labels: [], labelsEn: [], values: [], maxValue: 100 },
      heatmap: { rows: [], cols: [], values: [], colorScale: [] },
      synergyNetwork: { nodes: [], edges: [] },
      timeline: { events: [] },
    },
  };
}

// ===========================
// Mock Fetch Setup
// ===========================

let originalFetch: typeof global.fetch;

beforeEach(() => {
  originalFetch = global.fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

function mockSuccessfulFetch(responseData?: Partial<any>) {
  const defaultResponse = {
    data: {
      response: JSON.stringify({
        introduction: '인트로 내용',
        personalityDeep: '성격 분석',
        careerPath: '커리어 분석',
        relationshipDynamics: '관계 분석',
        wealthPotential: '재물 분석',
        healthGuidance: '건강 가이드',
        lifeMission: '인생 사명',
        timingAdvice: '타이밍 조언',
        actionPlan: '실천 가이드',
        conclusion: '결론',
      }),
      model: 'gpt-4o',
      usage: { total_tokens: 1500 },
    },
  };

  const merged = { ...defaultResponse, ...responseData };

  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => merged,
  } as Response);
}

function mockFailedFetch(status: number = 500) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => ({ error: 'Server error' }),
  } as Response);
}

function mockTimeoutFetch() {
  global.fetch = vi.fn().mockImplementation(() =>
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 150000)
    )
  );
}

// ===========================
// Tests: generateAIPremiumReport
// ===========================

describe('generateAIPremiumReport - Basic Generation', () => {
  it('should generate AI premium report successfully', async () => {
    mockSuccessfulFetch();

    const input = createMockInput();
    const matrixReport = createMockReport();

    const result = await generateAIPremiumReport(input, matrixReport);

    expect(result).toBeDefined();
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('generatedAt');
    expect(result).toHaveProperty('lang', 'ko');
    expect(result).toHaveProperty('profile');
    expect(result).toHaveProperty('sections');
    expect(result).toHaveProperty('matrixSummary');
    expect(result).toHaveProperty('meta');
  });

  it('should generate report in English', async () => {
    mockSuccessfulFetch();

    const input = createMockInput();
    input.lang = 'en';
    const matrixReport = createMockReport();
    matrixReport.lang = 'en';

    const result = await generateAIPremiumReport(input, matrixReport, { lang: 'en' });

    expect(result.lang).toBe('en');
  });

  it('should include all 10 sections', async () => {
    mockSuccessfulFetch();

    const input = createMockInput();
    const matrixReport = createMockReport();

    const result = await generateAIPremiumReport(input, matrixReport);

    expect(result.sections).toHaveProperty('introduction');
    expect(result.sections).toHaveProperty('personalityDeep');
    expect(result.sections).toHaveProperty('careerPath');
    expect(result.sections).toHaveProperty('relationshipDynamics');
    expect(result.sections).toHaveProperty('wealthPotential');
    expect(result.sections).toHaveProperty('healthGuidance');
    expect(result.sections).toHaveProperty('lifeMission');
    expect(result.sections).toHaveProperty('timingAdvice');
    expect(result.sections).toHaveProperty('actionPlan');
    expect(result.sections).toHaveProperty('conclusion');
  });

  it('should include profile information', async () => {
    mockSuccessfulFetch();

    const input = createMockInput();
    const matrixReport = createMockReport();

    const result = await generateAIPremiumReport(input, matrixReport, {
      name: 'John Doe',
      birthDate: '1990-01-01',
    });

    expect(result.profile.name).toBe('John Doe');
    expect(result.profile.birthDate).toBe('1990-01-01');
    expect(result.profile.dayMaster).toBe('목');
  });

  it('should include matrix summary', async () => {
    mockSuccessfulFetch();

    const input = createMockInput();
    const matrixReport = createMockReport();

    const result = await generateAIPremiumReport(input, matrixReport);

    expect(result.matrixSummary).toHaveProperty('overallScore');
    expect(result.matrixSummary).toHaveProperty('grade');
    expect(result.matrixSummary).toHaveProperty('topInsights');
    expect(result.matrixSummary).toHaveProperty('keyStrengths');
    expect(result.matrixSummary).toHaveProperty('keyChallenges');
  });

  it('should include metadata', async () => {
    mockSuccessfulFetch();

    const input = createMockInput();
    const matrixReport = createMockReport();

    const result = await generateAIPremiumReport(input, matrixReport);

    expect(result.meta).toHaveProperty('modelUsed');
    expect(result.meta).toHaveProperty('tokensUsed');
    expect(result.meta).toHaveProperty('processingTime');
    expect(result.meta).toHaveProperty('reportVersion');
  });
});

// ===========================
// Tests: Options & Themes
// ===========================

describe('generateAIPremiumReport - Options', () => {
  it('should handle focus domain option', async () => {
    mockSuccessfulFetch();

    const input = createMockInput();
    const matrixReport = createMockReport();

    const result = await generateAIPremiumReport(input, matrixReport, {
      focusDomain: 'career',
    });

    expect(result).toBeDefined();
  });

  it('should handle detail level option', async () => {
    mockSuccessfulFetch();

    const input = createMockInput();
    const matrixReport = createMockReport();

    const result = await generateAIPremiumReport(input, matrixReport, {
      detailLevel: 'comprehensive',
    });

    expect(result).toBeDefined();
  });

  it('should handle themed report', async () => {
    mockSuccessfulFetch();

    const input = createMockInput();
    const matrixReport = createMockReport();

    const result = await generateAIPremiumReport(input, matrixReport, {
      theme: 'career',
    });

    expect(result).toBeDefined();
  });

  it('should handle comprehensive theme', async () => {
    mockSuccessfulFetch();

    const input = createMockInput();
    const matrixReport = createMockReport();

    const result = await generateAIPremiumReport(input, matrixReport, {
      theme: 'comprehensive',
    });

    expect(result).toBeDefined();
  });
});

// ===========================
// Tests: Error Handling
// ===========================

describe('generateAIPremiumReport - Error Handling', () => {
  it('should handle fetch error', async () => {
    mockFailedFetch(500);

    const input = createMockInput();
    const matrixReport = createMockReport();

    await expect(
      generateAIPremiumReport(input, matrixReport)
    ).rejects.toThrow();
  });

  it('should handle 404 error', async () => {
    mockFailedFetch(404);

    const input = createMockInput();
    const matrixReport = createMockReport();

    await expect(
      generateAIPremiumReport(input, matrixReport)
    ).rejects.toThrow();
  });

  it('should handle malformed JSON response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          response: 'Not valid JSON',
        },
      }),
    } as Response);

    const input = createMockInput();
    const matrixReport = createMockReport();

    const result = await generateAIPremiumReport(input, matrixReport);

    // Should fallback gracefully
    expect(result.sections.introduction).toBeDefined();
    expect(result.sections.conclusion).toBeDefined();
  });

  it('should handle missing response field', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {},
      }),
    } as Response);

    const input = createMockInput();
    const matrixReport = createMockReport();

    const result = await generateAIPremiumReport(input, matrixReport);

    expect(result.sections.conclusion).toBeDefined();
  });
});

// ===========================
// Tests: Fetch Behavior
// ===========================

describe('generateAIPremiumReport - Fetch Behavior', () => {
  it('should call fetch with correct URL', async () => {
    mockSuccessfulFetch();

    const input = createMockInput();
    const matrixReport = createMockReport();

    await generateAIPremiumReport(input, matrixReport);

    expect(global.fetch).toHaveBeenCalled();
    const call = (global.fetch as any).mock.calls[0];
    expect(call[0]).toMatch(/\/generate$/);
  });

  it('should send POST request', async () => {
    mockSuccessfulFetch();

    const input = createMockInput();
    const matrixReport = createMockReport();

    await generateAIPremiumReport(input, matrixReport);

    const call = (global.fetch as any).mock.calls[0];
    expect(call[1].method).toBe('POST');
  });

  it('should send correct headers', async () => {
    mockSuccessfulFetch();

    const input = createMockInput();
    const matrixReport = createMockReport();

    await generateAIPremiumReport(input, matrixReport);

    const call = (global.fetch as any).mock.calls[0];
    expect(call[1].headers['Content-Type']).toBe('application/json');
  });

  it('should send request body with prompt', async () => {
    mockSuccessfulFetch();

    const input = createMockInput();
    const matrixReport = createMockReport();

    await generateAIPremiumReport(input, matrixReport);

    const call = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body).toHaveProperty('prompt');
    expect(body).toHaveProperty('mode', 'premium_report');
    expect(body).toHaveProperty('locale');
  });
});

// ===========================
// Tests: Response Parsing
// ===========================

describe('generateAIPremiumReport - Response Parsing', () => {
  it('should parse sections from JSON response', async () => {
    mockSuccessfulFetch({
      data: {
        response: JSON.stringify({
          introduction: 'Test intro',
          personalityDeep: 'Test personality',
          careerPath: 'Test career',
          relationshipDynamics: 'Test relationships',
          wealthPotential: 'Test wealth',
          healthGuidance: 'Test health',
          lifeMission: 'Test mission',
          timingAdvice: 'Test timing',
          actionPlan: 'Test action',
          conclusion: 'Test conclusion',
        }),
      },
    });

    const input = createMockInput();
    const matrixReport = createMockReport();

    const result = await generateAIPremiumReport(input, matrixReport);

    expect(result.sections.introduction).toBe('Test intro');
    expect(result.sections.personalityDeep).toBe('Test personality');
    expect(result.sections.conclusion).toBe('Test conclusion');
  });

  it('should extract model and token info', async () => {
    mockSuccessfulFetch({
      data: {
        response: JSON.stringify({
          introduction: 'Test',
          personalityDeep: '',
          careerPath: '',
          relationshipDynamics: '',
          wealthPotential: '',
          healthGuidance: '',
          lifeMission: '',
          timingAdvice: '',
          actionPlan: '',
          conclusion: '',
        }),
        model: 'claude-4',
        usage: { total_tokens: 2500 },
      },
    });

    const input = createMockInput();
    const matrixReport = createMockReport();

    const result = await generateAIPremiumReport(input, matrixReport);

    expect(result.meta.modelUsed).toBe('claude-4');
    expect(result.meta.tokensUsed).toBe(2500);
  });

  it('should measure processing time', async () => {
    mockSuccessfulFetch();

    const input = createMockInput();
    const matrixReport = createMockReport();

    const result = await generateAIPremiumReport(input, matrixReport);

    expect(result.meta.processingTime).toBeGreaterThanOrEqual(0);
  });
});

// ===========================
// Tests: Report ID Generation
// ===========================

describe('generateAIPremiumReport - Report ID', () => {
  it('should generate unique report IDs', async () => {
    mockSuccessfulFetch();

    const input = createMockInput();
    const matrixReport = createMockReport();

    const result1 = await generateAIPremiumReport(input, matrixReport);
    const result2 = await generateAIPremiumReport(input, matrixReport);

    expect(result1.id).not.toBe(result2.id);
    expect(result1.id).toMatch(/^air_/);
    expect(result2.id).toMatch(/^air_/);
  });

  it('should include timestamp in ID', async () => {
    mockSuccessfulFetch();

    const input = createMockInput();
    const matrixReport = createMockReport();

    const result = await generateAIPremiumReport(input, matrixReport);

    expect(result.id).toMatch(/^air_\d+_/);
  });
});

// ===========================
// Tests: Matrix Summary Extraction
// ===========================

describe('generateAIPremiumReport - Matrix Summary', () => {
  it('should extract top 3 top insights', async () => {
    mockSuccessfulFetch();

    const input = createMockInput();
    const matrixReport = createMockReport();
    matrixReport.topInsights = [
      { title: 'Insight 1', category: 'strength' } as any,
      { title: 'Insight 2', category: 'strength' } as any,
      { title: 'Insight 3', category: 'strength' } as any,
      { title: 'Insight 4', category: 'strength' } as any,
    ];

    const result = await generateAIPremiumReport(input, matrixReport);

    expect(result.matrixSummary.topInsights).toHaveLength(3);
  });

  it('should extract key strengths', async () => {
    mockSuccessfulFetch();

    const input = createMockInput();
    const matrixReport = createMockReport();
    matrixReport.topInsights = [
      { title: 'Strength 1', category: 'strength' } as any,
      { title: 'Strength 2', category: 'strength' } as any,
    ];

    const result = await generateAIPremiumReport(input, matrixReport);

    expect(result.matrixSummary.keyStrengths).toHaveLength(2);
    expect(result.matrixSummary.keyStrengths).toContain('Strength 1');
  });

  it('should extract key challenges', async () => {
    mockSuccessfulFetch();

    const input = createMockInput();
    const matrixReport = createMockReport();
    matrixReport.topInsights = [
      { title: 'Challenge 1', category: 'challenge' } as any,
      { title: 'Caution 1', category: 'caution' } as any,
    ];

    const result = await generateAIPremiumReport(input, matrixReport);

    expect(result.matrixSummary.keyChallenges.length).toBeGreaterThan(0);
  });
});
