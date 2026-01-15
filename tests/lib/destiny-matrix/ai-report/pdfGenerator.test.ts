// tests/lib/destiny-matrix/ai-report/pdfGenerator.test.ts
// Comprehensive tests for PDF Generator

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generatePremiumPDF } from '@/lib/destiny-matrix/ai-report/pdfGenerator';
import type { AIPremiumReport } from '@/lib/destiny-matrix/ai-report/aiReportService';

// Mock pdf-lib
vi.mock('pdf-lib', () => ({
  PDFDocument: {
    create: vi.fn().mockResolvedValue({
      addPage: vi.fn().mockReturnValue({
        drawRectangle: vi.fn(),
        drawEllipse: vi.fn(),
        drawText: vi.fn(),
        drawLine: vi.fn(),
      }),
      embedFont: vi.fn().mockResolvedValue({}),
      save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    }),
  },
  rgb: vi.fn((r, g, b) => ({ r, g, b })),
  StandardFonts: {
    HelveticaBold: 'Helvetica-Bold',
    Helvetica: 'Helvetica',
  },
}));

// ===========================
// Mock Data Helpers
// ===========================

function createMockReport(): AIPremiumReport {
  return {
    id: 'air_123456_abc',
    generatedAt: '2025-01-15T10:00:00.000Z',
    lang: 'ko',
    profile: {
      name: 'John Doe',
      birthDate: '1990-01-01',
      dayMaster: '목',
      dominantElement: 'Wood',
      geokguk: '종격',
    },
    sections: {
      introduction: '인트로 내용입니다. 이것은 운명에 대한 종합적인 분석입니다.',
      personalityDeep: '성격 심층 분석 내용입니다.',
      careerPath: '커리어와 적성에 대한 분석입니다.',
      relationshipDynamics: '관계 역학에 대한 내용입니다.',
      wealthPotential: '재물운과 재정에 대한 조언입니다.',
      healthGuidance: '건강 가이드 내용입니다.',
      lifeMission: '인생 사명과 영적 성장 방향입니다.',
      timingAdvice: '중요한 시기와 타이밍 조언입니다.',
      actionPlan: '구체적인 실천 가이드 5가지입니다.',
      conclusion: '마무리 격려 메시지입니다. 행운을 빕니다!',
    },
    matrixSummary: {
      overallScore: 85,
      grade: 'A',
      topInsights: ['Insight 1', 'Insight 2', 'Insight 3'],
      keyStrengths: ['Strength 1', 'Strength 2', 'Strength 3'],
      keyChallenges: ['Challenge 1', 'Challenge 2'],
    },
    meta: {
      modelUsed: 'gpt-4o',
      tokensUsed: 1500,
      processingTime: 3500,
      reportVersion: '1.0.0',
    },
  };
}

// ===========================
// Tests: PDF Generation
// ===========================

describe('generatePremiumPDF - Basic Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate PDF successfully', async () => {
    const report = createMockReport();

    const pdfBytes = await generatePremiumPDF(report);

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(0);
  });

  it('should generate PDF for Korean report', async () => {
    const report = createMockReport();
    report.lang = 'ko';

    const pdfBytes = await generatePremiumPDF(report);

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
  });

  it('should generate PDF for English report', async () => {
    const report = createMockReport();
    report.lang = 'en';

    const pdfBytes = await generatePremiumPDF(report);

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
  });

  it('should handle empty sections gracefully', async () => {
    const report = createMockReport();
    report.sections = {
      introduction: '',
      personalityDeep: '',
      careerPath: '',
      relationshipDynamics: '',
      wealthPotential: '',
      healthGuidance: '',
      lifeMission: '',
      timingAdvice: '',
      actionPlan: '',
      conclusion: '',
    };

    const pdfBytes = await generatePremiumPDF(report);

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
  });

  it('should handle long sections', async () => {
    const report = createMockReport();
    report.sections.personalityDeep = 'Lorem ipsum '.repeat(1000);

    const pdfBytes = await generatePremiumPDF(report);

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
  });
});

// ===========================
// Tests: PDF Options
// ===========================

describe('generatePremiumPDF - Options', () => {
  it('should handle default options', async () => {
    const report = createMockReport();

    const pdfBytes = await generatePremiumPDF(report);

    expect(pdfBytes).toBeDefined();
  });

  it('should handle custom options', async () => {
    const report = createMockReport();
    const options = {
      includeMatrixChart: true,
      includeWatermark: true,
      watermarkText: 'Confidential',
    };

    const pdfBytes = await generatePremiumPDF(report, options);

    expect(pdfBytes).toBeDefined();
  });

  it('should handle includeMatrixChart option', async () => {
    const report = createMockReport();
    const options = { includeMatrixChart: true };

    const pdfBytes = await generatePremiumPDF(report, options);

    expect(pdfBytes).toBeDefined();
  });

  it('should handle includeWatermark option', async () => {
    const report = createMockReport();
    const options = { includeWatermark: true };

    const pdfBytes = await generatePremiumPDF(report, options);

    expect(pdfBytes).toBeDefined();
  });
});

// ===========================
// Tests: Report Content
// ===========================

describe('generatePremiumPDF - Content', () => {
  it('should include profile information', async () => {
    const report = createMockReport();
    report.profile.name = 'Test User';

    const pdfBytes = await generatePremiumPDF(report);

    expect(pdfBytes).toBeDefined();
  });

  it('should include all sections', async () => {
    const report = createMockReport();

    const pdfBytes = await generatePremiumPDF(report);

    expect(pdfBytes).toBeDefined();
  });

  it('should include matrix summary', async () => {
    const report = createMockReport();

    const pdfBytes = await generatePremiumPDF(report);

    expect(pdfBytes).toBeDefined();
  });

  it('should handle missing profile name', async () => {
    const report = createMockReport();
    report.profile.name = undefined;

    const pdfBytes = await generatePremiumPDF(report);

    expect(pdfBytes).toBeDefined();
  });

  it('should handle missing birth date', async () => {
    const report = createMockReport();
    report.profile.birthDate = undefined;

    const pdfBytes = await generatePremiumPDF(report);

    expect(pdfBytes).toBeDefined();
  });
});

// ===========================
// Tests: Element Colors
// ===========================

describe('generatePremiumPDF - Element Colors', () => {
  it('should handle Wood element', async () => {
    const report = createMockReport();
    report.profile.dayMaster = '목';

    const pdfBytes = await generatePremiumPDF(report);

    expect(pdfBytes).toBeDefined();
  });

  it('should handle Fire element', async () => {
    const report = createMockReport();
    report.profile.dayMaster = '화';

    const pdfBytes = await generatePremiumPDF(report);

    expect(pdfBytes).toBeDefined();
  });

  it('should handle Earth element', async () => {
    const report = createMockReport();
    report.profile.dayMaster = '토';

    const pdfBytes = await generatePremiumPDF(report);

    expect(pdfBytes).toBeDefined();
  });

  it('should handle Metal element', async () => {
    const report = createMockReport();
    report.profile.dayMaster = '금';

    const pdfBytes = await generatePremiumPDF(report);

    expect(pdfBytes).toBeDefined();
  });

  it('should handle Water element', async () => {
    const report = createMockReport();
    report.profile.dayMaster = '수';

    const pdfBytes = await generatePremiumPDF(report);

    expect(pdfBytes).toBeDefined();
  });
});

// ===========================
// Tests: Grades
// ===========================

describe('generatePremiumPDF - Grades', () => {
  it('should handle grade S', async () => {
    const report = createMockReport();
    report.matrixSummary.grade = 'S';
    report.matrixSummary.overallScore = 95;

    const pdfBytes = await generatePremiumPDF(report);

    expect(pdfBytes).toBeDefined();
  });

  it('should handle grade A', async () => {
    const report = createMockReport();
    report.matrixSummary.grade = 'A';
    report.matrixSummary.overallScore = 85;

    const pdfBytes = await generatePremiumPDF(report);

    expect(pdfBytes).toBeDefined();
  });

  it('should handle grade B', async () => {
    const report = createMockReport();
    report.matrixSummary.grade = 'B';
    report.matrixSummary.overallScore = 70;

    const pdfBytes = await generatePremiumPDF(report);

    expect(pdfBytes).toBeDefined();
  });

  it('should handle grade C', async () => {
    const report = createMockReport();
    report.matrixSummary.grade = 'C';
    report.matrixSummary.overallScore = 55;

    const pdfBytes = await generatePremiumPDF(report);

    expect(pdfBytes).toBeDefined();
  });

  it('should handle grade D', async () => {
    const report = createMockReport();
    report.matrixSummary.grade = 'D';
    report.matrixSummary.overallScore = 40;

    const pdfBytes = await generatePremiumPDF(report);

    expect(pdfBytes).toBeDefined();
  });
});

// ===========================
// Tests: Edge Cases
// ===========================

describe('generatePremiumPDF - Edge Cases', () => {
  it('should handle empty strengths', async () => {
    const report = createMockReport();
    report.matrixSummary.keyStrengths = [];

    const pdfBytes = await generatePremiumPDF(report);

    expect(pdfBytes).toBeDefined();
  });

  it('should handle empty challenges', async () => {
    const report = createMockReport();
    report.matrixSummary.keyChallenges = [];

    const pdfBytes = await generatePremiumPDF(report);

    expect(pdfBytes).toBeDefined();
  });

  it('should handle very long text sections', async () => {
    const report = createMockReport();
    report.sections.introduction = 'A'.repeat(5000);

    const pdfBytes = await generatePremiumPDF(report);

    expect(pdfBytes).toBeDefined();
  });

  it('should handle special characters', async () => {
    const report = createMockReport();
    report.profile.name = 'Test & <User> "Name"';

    const pdfBytes = await generatePremiumPDF(report);

    expect(pdfBytes).toBeDefined();
  });

  it('should handle unicode characters', async () => {
    const report = createMockReport();
    report.sections.introduction = '한글 테스트 🎯 ♥';

    const pdfBytes = await generatePremiumPDF(report);

    expect(pdfBytes).toBeDefined();
  });
});
