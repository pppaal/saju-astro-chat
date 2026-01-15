// tests/lib/destiny-matrix/interpreter/report-generator.test.ts
// Comprehensive tests for FusionReportGenerator

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FusionReportGenerator } from '@/lib/destiny-matrix/interpreter/report-generator';
import type {
  MatrixCalculationInput,
  MatrixCell,
} from '@/lib/destiny-matrix/types';
import type { FiveElement } from '@/lib/Saju/types';
import type {
  InsightDomain,
  FusionInsight,
  InsightCategory,
} from '@/lib/destiny-matrix/interpreter/types';

// ===========================
// Mock Data Helpers
// ===========================

function createMockInput(overrides?: Partial<MatrixCalculationInput>): MatrixCalculationInput {
  return {
    dayMasterElement: '목' as FiveElement,
    dominantWesternElement: 'Earth',
    lang: 'ko',
    geokguk: '종격',
    yongsin: '화' as FiveElement,
    sibsinDistribution: {
      '비견': 2,
      '식신': 3,
      '재성': 1,
    },
    shinsalList: ['천을귀인', '도화'],
    planetSigns: {
      Sun: 'Aries',
      Moon: 'Taurus',
    },
    currentDaeunElement: '화' as FiveElement,
    activeTransits: ['saturnReturn'],
    ...overrides,
  } as MatrixCalculationInput;
}

function createMockLayerResults(): Record<string, Record<string, MatrixCell>> {
  return {
    layer1: {
      'cell_1_1': { value: 8.5, code: 'amplify', source: { sajuFactor: '목', astroFactor: 'Fire' } },
      'cell_1_2': { value: 5.0, code: 'balance', source: { sajuFactor: '목', astroFactor: 'Earth' } },
    },
    layer2: {
      'cell_2_1': { value: 9.0, code: 'extreme', source: { sajuFactor: '식신', astroFactor: 'Venus' } },
      'cell_2_2': { value: 3.0, code: 'clash', source: { sajuFactor: '겁재', astroFactor: 'Saturn' } },
    },
  };
}

// ===========================
// Tests: Constructor & Configuration
// ===========================

describe('FusionReportGenerator - Constructor', () => {
  it('should create instance with default config', () => {
    const generator = new FusionReportGenerator();
    expect(generator).toBeDefined();
  });

  it('should create instance with custom config', () => {
    const generator = new FusionReportGenerator({
      lang: 'en',
      maxTopInsights: 10,
      includeDetailedData: true,
    });
    expect(generator).toBeDefined();
  });

  it('should merge custom config with defaults', () => {
    const generator = new FusionReportGenerator({
      maxTopInsights: 8,
    });
    expect(generator).toBeDefined();
  });

  it('should handle empty config', () => {
    const generator = new FusionReportGenerator({});
    expect(generator).toBeDefined();
  });
});

// ===========================
// Tests: generateReport
// ===========================

describe('FusionReportGenerator - generateReport', () => {
  let generator: FusionReportGenerator;

  beforeEach(() => {
    generator = new FusionReportGenerator();
    vi.clearAllMocks();
  });

  it('should generate complete report with all sections', () => {
    const input = createMockInput();
    const layerResults = createMockLayerResults();

    const report = generator.generateReport(input, layerResults);

    expect(report).toHaveProperty('id');
    expect(report).toHaveProperty('generatedAt');
    expect(report).toHaveProperty('version', '2.0.0');
    expect(report).toHaveProperty('lang', 'ko');
    expect(report).toHaveProperty('profile');
    expect(report).toHaveProperty('overallScore');
    expect(report).toHaveProperty('topInsights');
    expect(report).toHaveProperty('domainAnalysis');
    expect(report).toHaveProperty('timingAnalysis');
    expect(report).toHaveProperty('visualizations');
  });

  it('should generate report in English', () => {
    const input = createMockInput({ lang: 'en' });
    const layerResults = createMockLayerResults();

    const report = generator.generateReport(input, layerResults);

    expect(report.lang).toBe('en');
    expect(report.profile.dayMasterDescription).toContain('Wood');
  });

  it('should generate report with query domain', () => {
    const input = createMockInput();
    const layerResults = createMockLayerResults();

    const report = generator.generateReport(input, layerResults, 'career');

    expect(report).toBeDefined();
    expect(report.domainAnalysis).toBeDefined();
  });

  it('should include detailed data when configured', () => {
    const generator = new FusionReportGenerator({ includeDetailedData: true });
    const input = createMockInput();
    const layerResults = createMockLayerResults();

    const report = generator.generateReport(input, layerResults);

    expect(report.detailedData).toBeDefined();
    expect(report.detailedData?.allInsights).toBeDefined();
    expect(report.detailedData?.layerData).toBeDefined();
  });

  it('should not include detailed data by default', () => {
    const input = createMockInput();
    const layerResults = createMockLayerResults();

    const report = generator.generateReport(input, layerResults);

    expect(report.detailedData).toBeUndefined();
  });

  it('should handle empty layer results', () => {
    const input = createMockInput();
    const layerResults: Record<string, Record<string, MatrixCell>> = {};

    const report = generator.generateReport(input, layerResults);

    expect(report).toBeDefined();
    expect(report.topInsights).toEqual([]);
  });

  it('should generate unique report IDs', () => {
    const input = createMockInput();
    const layerResults = createMockLayerResults();

    const report1 = generator.generateReport(input, layerResults);
    // Small delay to ensure different timestamp
    const now = Date.now();
    while (Date.now() === now) { /* busy wait */ }
    const report2 = generator.generateReport(input, layerResults);

    expect(report1.id).not.toBe(report2.id);
  });

  it('should set generatedAt timestamp', () => {
    const input = createMockInput();
    const layerResults = createMockLayerResults();

    const before = new Date();
    const report = generator.generateReport(input, layerResults);
    const after = new Date();

    expect(report.generatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(report.generatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should limit top insights to maxTopInsights', () => {
    const generator = new FusionReportGenerator({ maxTopInsights: 3 });
    const input = createMockInput();
    const layerResults = createMockLayerResults();

    const report = generator.generateReport(input, layerResults);

    expect(report.topInsights.length).toBeLessThanOrEqual(3);
  });
});

// ===========================
// Tests: Profile Summary
// ===========================

describe('FusionReportGenerator - Profile Summary', () => {
  let generator: FusionReportGenerator;

  beforeEach(() => {
    generator = new FusionReportGenerator();
  });

  it('should generate profile with day master element', () => {
    const input = createMockInput({ dayMasterElement: '화' as FiveElement });
    const report = generator.generateReport(input, {});

    expect(report.profile.dayMasterElement).toBe('화');
    expect(report.profile.dayMasterDescription).toContain('화');
  });

  it('should generate profile in Korean', () => {
    const input = createMockInput({ lang: 'ko' });
    const report = generator.generateReport(input, {});

    expect(report.profile.dayMasterDescription).toMatch(/기운/);
  });

  it('should generate profile in English', () => {
    const input = createMockInput({ lang: 'en' });
    const report = generator.generateReport(input, {});

    expect(report.profile.dayMasterDescription).toContain('energy');
  });

  it('should include geokguk when available', () => {
    const input = createMockInput({ geokguk: '종격' });
    const report = generator.generateReport(input, {});

    expect(report.profile.geokguk).toBe('종격');
    // geokgukDescription may or may not be present depending on implementation
    if (report.profile.geokgukDescription) {
      expect(typeof report.profile.geokgukDescription).toBe('string');
    }
  });

  it('should handle missing geokguk', () => {
    const input = createMockInput({ geokguk: undefined });
    const report = generator.generateReport(input, {});

    expect(report.profile.geokguk).toBeUndefined();
    expect(report.profile.geokgukDescription).toBeUndefined();
  });

  it('should extract key shinsals (first 5)', () => {
    const input = createMockInput({
      shinsalList: ['천을귀인', '도화', '역마', '화개', '백호', '자살', '년살'],
    });
    const report = generator.generateReport(input, {});

    expect(report.profile.keyShinsals).toHaveLength(5);
  });

  it('should include western sun and moon signs', () => {
    const input = createMockInput({
      planetSigns: { Sun: 'Leo', Moon: 'Cancer' },
    });
    const report = generator.generateReport(input, {});

    expect(report.profile.westernSunSign).toBe('Leo');
    expect(report.profile.westernMoonSign).toBe('Cancer');
  });
});

// ===========================
// Tests: Overall Score
// ===========================

describe('FusionReportGenerator - Overall Score', () => {
  let generator: FusionReportGenerator;

  beforeEach(() => {
    generator = new FusionReportGenerator();
  });

  it('should calculate overall score from insights', () => {
    const input = createMockInput();
    const layerResults = createMockLayerResults();

    const report = generator.generateReport(input, layerResults);

    expect(report.overallScore.total).toBeGreaterThanOrEqual(0);
    expect(report.overallScore.total).toBeLessThanOrEqual(100);
  });

  it('should assign valid grades', () => {
    const input = createMockInput();
    const layerResults = createMockLayerResults();

    const report = generator.generateReport(input, layerResults);

    expect(['S', 'A', 'B', 'C', 'D']).toContain(report.overallScore.grade);
  });

  it('should calculate category scores', () => {
    const input = createMockInput();
    const layerResults = createMockLayerResults();

    const report = generator.generateReport(input, layerResults);

    expect(report.overallScore.categoryScores).toHaveProperty('strength');
    expect(report.overallScore.categoryScores).toHaveProperty('opportunity');
    expect(report.overallScore.categoryScores).toHaveProperty('balance');
    expect(report.overallScore.categoryScores).toHaveProperty('caution');
    expect(report.overallScore.categoryScores).toHaveProperty('challenge');
  });

  it('should calculate data completeness', () => {
    const input = createMockInput();
    const layerResults = createMockLayerResults();

    const report = generator.generateReport(input, layerResults);

    expect(report.overallScore.dataCompleteness).toBeGreaterThanOrEqual(0);
    expect(report.overallScore.dataCompleteness).toBeLessThanOrEqual(100);
  });

  it('should count total insights', () => {
    const input = createMockInput();
    const layerResults = createMockLayerResults();

    const report = generator.generateReport(input, layerResults);

    expect(report.overallScore.insightCount).toBeDefined();
    expect(report.overallScore.insightCount).toBeGreaterThanOrEqual(0);
  });

  it('should provide grade description in Korean', () => {
    const input = createMockInput({ lang: 'ko' });
    const layerResults = createMockLayerResults();

    const report = generator.generateReport(input, layerResults);

    expect(report.overallScore.gradeDescription).toMatch(/조화|균형|성장|도전|주의|영역|진행/);
  });

  it('should provide grade description in English', () => {
    const input = createMockInput({ lang: 'en' });
    const layerResults = createMockLayerResults();

    const report = generator.generateReport(input, layerResults);

    expect(report.overallScore.gradeDescriptionEn).toMatch(/harmony|balance|growth|challenge|attention|area|proceed/i);
  });

  it('should default to 50 when no data', () => {
    const input = createMockInput();
    const layerResults: Record<string, Record<string, MatrixCell>> = {};

    const report = generator.generateReport(input, layerResults);

    expect(report.overallScore.total).toBe(50);
  });
});

// ===========================
// Tests: Domain Analysis
// ===========================

describe('FusionReportGenerator - Domain Analysis', () => {
  let generator: FusionReportGenerator;

  beforeEach(() => {
    generator = new FusionReportGenerator();
  });

  it('should analyze all 7 domains', () => {
    const input = createMockInput();
    const layerResults = createMockLayerResults();

    const report = generator.generateReport(input, layerResults);

    expect(report.domainAnalysis).toHaveLength(7);
    const domains = report.domainAnalysis.map(d => d.domain);
    expect(domains).toContain('personality');
    expect(domains).toContain('career');
    expect(domains).toContain('relationship');
    expect(domains).toContain('wealth');
    expect(domains).toContain('health');
    expect(domains).toContain('spirituality');
    expect(domains).toContain('timing');
  });

  it('should calculate score for each domain', () => {
    const input = createMockInput();
    const layerResults = createMockLayerResults();

    const report = generator.generateReport(input, layerResults);

    for (const domain of report.domainAnalysis) {
      expect(domain.score).toBeGreaterThanOrEqual(0);
      expect(domain.score).toBeLessThanOrEqual(100);
    }
  });

  it('should assign grade for each domain', () => {
    const input = createMockInput();
    const layerResults = createMockLayerResults();

    const report = generator.generateReport(input, layerResults);

    const validGrades = ['S', 'A', 'B', 'C', 'D'];
    for (const domain of report.domainAnalysis) {
      expect(validGrades).toContain(domain.grade);
    }
  });

  it('should provide summary for each domain', () => {
    const input = createMockInput();
    const layerResults = createMockLayerResults();

    const report = generator.generateReport(input, layerResults);

    for (const domain of report.domainAnalysis) {
      expect(domain.summary).toBeDefined();
      expect(domain.summary.length).toBeGreaterThan(0);
    }
  });

  it('should provide bilingual summaries', () => {
    const input = createMockInput();
    const layerResults = createMockLayerResults();

    const report = generator.generateReport(input, layerResults);

    for (const domain of report.domainAnalysis) {
      expect(domain.summary).toBeDefined();
      expect(domain.summaryEn).toBeDefined();
    }
  });

  it('should show "insufficient data" message when no data', () => {
    const input = createMockInput();
    const layerResults: Record<string, Record<string, MatrixCell>> = {};

    const report = generator.generateReport(input, layerResults);

    for (const domain of report.domainAnalysis) {
      expect(domain.hasData).toBe(false);
      expect(domain.summary).toContain('데이터 부족');
    }
  });
});

// ===========================
// Tests: Timing Analysis
// ===========================

describe('FusionReportGenerator - Timing Analysis', () => {
  let generator: FusionReportGenerator;

  beforeEach(() => {
    generator = new FusionReportGenerator();
  });

  it('should analyze current period', () => {
    const input = createMockInput();
    const layerResults = createMockLayerResults();

    const report = generator.generateReport(input, layerResults);

    expect(report.timingAnalysis.currentPeriod).toBeDefined();
    expect(report.timingAnalysis.currentPeriod.name).toBeDefined();
    expect(report.timingAnalysis.currentPeriod.nameEn).toBeDefined();
    expect(report.timingAnalysis.currentPeriod.score).toBeGreaterThanOrEqual(0);
  });

  it('should list active transits', () => {
    const input = createMockInput({
      activeTransits: ['saturnReturn', 'jupiterReturn'],
    });
    const layerResults = createMockLayerResults();

    const report = generator.generateReport(input, layerResults);

    expect(report.timingAnalysis.activeTransits).toHaveLength(2);
  });

  it('should categorize transit influence', () => {
    const input = createMockInput({
      activeTransits: ['saturnReturn', 'jupiterReturn'],
    });
    const layerResults = createMockLayerResults();

    const report = generator.generateReport(input, layerResults);

    const validInfluences = ['positive', 'neutral', 'challenging'];
    for (const transit of report.timingAnalysis.activeTransits) {
      expect(validInfluences).toContain(transit.influence);
    }
  });

  it('should handle empty active transits', () => {
    const input = createMockInput({ activeTransits: [] });
    const layerResults = createMockLayerResults();

    const report = generator.generateReport(input, layerResults);

    expect(report.timingAnalysis.activeTransits).toEqual([]);
  });
});

// ===========================
// Tests: Visualizations
// ===========================

describe('FusionReportGenerator - Visualizations', () => {
  it('should generate radar chart data', () => {
    const generator = new FusionReportGenerator({ includeVisualizations: true });
    const input = createMockInput();
    const layerResults = createMockLayerResults();

    const report = generator.generateReport(input, layerResults);

    expect(report.visualizations.radarChart).toBeDefined();
    expect(report.visualizations.radarChart.labels).toHaveLength(7);
    expect(report.visualizations.radarChart.values).toHaveLength(7);
    expect(report.visualizations.radarChart.maxValue).toBe(100);
  });

  it('should not include visualizations when disabled', () => {
    const generator = new FusionReportGenerator({ includeVisualizations: false });
    const input = createMockInput();
    const layerResults = createMockLayerResults();

    const report = generator.generateReport(input, layerResults);

    expect(report.visualizations.radarChart.labels).toEqual([]);
    expect(report.visualizations.heatmap.rows).toEqual([]);
  });
});

// ===========================
// Tests: Edge Cases
// ===========================

describe('FusionReportGenerator - Edge Cases', () => {
  let generator: FusionReportGenerator;

  beforeEach(() => {
    generator = new FusionReportGenerator();
  });

  it('should handle null sibsin distribution', () => {
    const input = createMockInput({ sibsinDistribution: undefined });
    const report = generator.generateReport(input, {});

    expect(report.profile.dominantSibsin).toEqual([]);
  });

  it('should handle null shinsal list', () => {
    const input = createMockInput({ shinsalList: undefined });
    const report = generator.generateReport(input, {});

    expect(report.profile.keyShinsals).toEqual([]);
  });

  it('should handle all five elements', () => {
    const elements: FiveElement[] = ['목', '화', '토', '금', '수'];

    for (const element of elements) {
      const input = createMockInput({ dayMasterElement: element });
      const report = generator.generateReport(input, {});

      expect(report.profile.dayMasterElement).toBe(element);
      expect(report.profile.dayMasterDescription).toBeDefined();
    }
  });
});
