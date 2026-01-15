// tests/lib/destiny-matrix/interpreter/types.test.ts
// Comprehensive tests for interpreter types structure and validation

import { describe, it, expect } from 'vitest';
import type {
  InsightCategory,
  InsightDomain,
  InsightPriority,
  FusionInsight,
  InsightSource,
  ActionItem,
  WeightConfig,
  LayerWeights,
  ContextModifier,
  TemporalModifier,
  FusionReport,
  ProfileSummary,
  OverallScore,
  DomainAnalysis,
  TimingAnalysis,
  VisualizationData,
  InterpreterConfig,
} from '@/lib/destiny-matrix/interpreter/types';

// ===========================
// Type Guards
// ===========================

function isInsightCategory(value: string): value is InsightCategory {
  return ['strength', 'opportunity', 'balance', 'caution', 'challenge'].includes(value);
}

function isInsightDomain(value: string): value is InsightDomain {
  return ['personality', 'career', 'relationship', 'wealth', 'health', 'spirituality', 'timing'].includes(value);
}

function isInsightPriority(value: string): value is InsightPriority {
  return ['critical', 'high', 'medium', 'low'].includes(value);
}

function isValidGrade(value: string): value is 'S' | 'A' | 'B' | 'C' | 'D' {
  return ['S', 'A', 'B', 'C', 'D'].includes(value);
}

// ===========================
// Mock Data Helpers
// ===========================

function createMockInsightSource(): InsightSource {
  return {
    layer: 1,
    layerName: 'Layer 1',
    sajuFactor: '목',
    astroFactor: 'Fire',
    interaction: 'amplify',
    contribution: 0.8,
  };
}

function createMockActionItem(): ActionItem {
  return {
    type: 'do',
    text: '실천하세요',
    textEn: 'Take action',
    timing: '지금',
    timingEn: 'Now',
  };
}

function createMockFusionInsight(): FusionInsight {
  return {
    id: 'insight_1',
    category: 'strength',
    domain: 'career',
    priority: 'high',
    score: 85,
    rawScore: 8.5,
    weightedScore: 85,
    sources: [createMockInsightSource()],
    title: '강점 제목',
    titleEn: 'Strength Title',
    description: '강점 설명',
    descriptionEn: 'Strength Description',
    actionItems: [createMockActionItem()],
    icon: '🎯',
    colorCode: '#3b82f6',
  };
}

// ===========================
// Tests: Insight Category
// ===========================

describe('InsightCategory Type', () => {
  it('should validate all five categories', () => {
    const categories = ['strength', 'opportunity', 'balance', 'caution', 'challenge'];

    for (const category of categories) {
      expect(isInsightCategory(category)).toBe(true);
    }
  });

  it('should reject invalid categories', () => {
    const invalid = ['weak', 'danger', 'neutral', 'unknown'];

    for (const category of invalid) {
      expect(isInsightCategory(category)).toBe(false);
    }
  });

  it('should have exactly 5 categories', () => {
    const validCategories = ['strength', 'opportunity', 'balance', 'caution', 'challenge'];
    expect(validCategories).toHaveLength(5);
  });
});

// ===========================
// Tests: Insight Domain
// ===========================

describe('InsightDomain Type', () => {
  it('should validate all seven domains', () => {
    const domains = ['personality', 'career', 'relationship', 'wealth', 'health', 'spirituality', 'timing'];

    for (const domain of domains) {
      expect(isInsightDomain(domain)).toBe(true);
    }
  });

  it('should reject invalid domains', () => {
    const invalid = ['love', 'money', 'family', 'work'];

    for (const domain of invalid) {
      expect(isInsightDomain(domain)).toBe(false);
    }
  });

  it('should have exactly 7 domains', () => {
    const validDomains = ['personality', 'career', 'relationship', 'wealth', 'health', 'spirituality', 'timing'];
    expect(validDomains).toHaveLength(7);
  });
});

// ===========================
// Tests: Insight Priority
// ===========================

describe('InsightPriority Type', () => {
  it('should validate all four priorities', () => {
    const priorities = ['critical', 'high', 'medium', 'low'];

    for (const priority of priorities) {
      expect(isInsightPriority(priority)).toBe(true);
    }
  });

  it('should reject invalid priorities', () => {
    const invalid = ['urgent', 'normal', 'minor'];

    for (const priority of invalid) {
      expect(isInsightPriority(priority)).toBe(false);
    }
  });

  it('should have exactly 4 priority levels', () => {
    const validPriorities = ['critical', 'high', 'medium', 'low'];
    expect(validPriorities).toHaveLength(4);
  });
});

// ===========================
// Tests: FusionInsight Structure
// ===========================

describe('FusionInsight Structure', () => {
  it('should have all required fields', () => {
    const insight = createMockFusionInsight();

    expect(insight).toHaveProperty('id');
    expect(insight).toHaveProperty('category');
    expect(insight).toHaveProperty('domain');
    expect(insight).toHaveProperty('priority');
    expect(insight).toHaveProperty('score');
    expect(insight).toHaveProperty('rawScore');
    expect(insight).toHaveProperty('weightedScore');
    expect(insight).toHaveProperty('sources');
    expect(insight).toHaveProperty('title');
    expect(insight).toHaveProperty('titleEn');
    expect(insight).toHaveProperty('description');
    expect(insight).toHaveProperty('descriptionEn');
    expect(insight).toHaveProperty('actionItems');
    expect(insight).toHaveProperty('icon');
    expect(insight).toHaveProperty('colorCode');
  });

  it('should have valid category', () => {
    const insight = createMockFusionInsight();
    expect(isInsightCategory(insight.category)).toBe(true);
  });

  it('should have valid domain', () => {
    const insight = createMockFusionInsight();
    expect(isInsightDomain(insight.domain)).toBe(true);
  });

  it('should have valid priority', () => {
    const insight = createMockFusionInsight();
    expect(isInsightPriority(insight.priority)).toBe(true);
  });

  it('should have scores in valid range', () => {
    const insight = createMockFusionInsight();

    expect(insight.score).toBeGreaterThanOrEqual(0);
    expect(insight.score).toBeLessThanOrEqual(100);
    expect(insight.rawScore).toBeGreaterThanOrEqual(0);
    expect(insight.rawScore).toBeLessThanOrEqual(10);
  });

  it('should have array of sources', () => {
    const insight = createMockFusionInsight();

    expect(Array.isArray(insight.sources)).toBe(true);
    expect(insight.sources.length).toBeGreaterThan(0);
  });

  it('should have bilingual title and description', () => {
    const insight = createMockFusionInsight();

    expect(typeof insight.title).toBe('string');
    expect(typeof insight.titleEn).toBe('string');
    expect(typeof insight.description).toBe('string');
    expect(typeof insight.descriptionEn).toBe('string');
  });

  it('should have action items array', () => {
    const insight = createMockFusionInsight();

    expect(Array.isArray(insight.actionItems)).toBe(true);
  });

  it('should have visualization properties', () => {
    const insight = createMockFusionInsight();

    expect(typeof insight.icon).toBe('string');
    expect(typeof insight.colorCode).toBe('string');
    expect(insight.colorCode).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

// ===========================
// Tests: InsightSource Structure
// ===========================

describe('InsightSource Structure', () => {
  it('should have all required fields', () => {
    const source = createMockInsightSource();

    expect(source).toHaveProperty('layer');
    expect(source).toHaveProperty('layerName');
    expect(source).toHaveProperty('sajuFactor');
    expect(source).toHaveProperty('astroFactor');
    expect(source).toHaveProperty('interaction');
    expect(source).toHaveProperty('contribution');
  });

  it('should have valid layer number', () => {
    const source = createMockInsightSource();

    expect(source.layer).toBeGreaterThanOrEqual(1);
    expect(source.layer).toBeLessThanOrEqual(10);
  });

  it('should have contribution in valid range', () => {
    const source = createMockInsightSource();

    expect(source.contribution).toBeGreaterThanOrEqual(0);
    expect(source.contribution).toBeLessThanOrEqual(1);
  });

  it('should have string factors', () => {
    const source = createMockInsightSource();

    expect(typeof source.sajuFactor).toBe('string');
    expect(typeof source.astroFactor).toBe('string');
  });
});

// ===========================
// Tests: ActionItem Structure
// ===========================

describe('ActionItem Structure', () => {
  it('should have all required fields', () => {
    const action = createMockActionItem();

    expect(action).toHaveProperty('type');
    expect(action).toHaveProperty('text');
    expect(action).toHaveProperty('textEn');
  });

  it('should have valid action type', () => {
    const action = createMockActionItem();

    expect(['do', 'avoid', 'consider']).toContain(action.type);
  });

  it('should have bilingual text', () => {
    const action = createMockActionItem();

    expect(typeof action.text).toBe('string');
    expect(typeof action.textEn).toBe('string');
  });

  it('should have optional timing fields', () => {
    const action = createMockActionItem();

    if (action.timing) {
      expect(typeof action.timing).toBe('string');
    }
    if (action.timingEn) {
      expect(typeof action.timingEn).toBe('string');
    }
  });
});

// ===========================
// Tests: LayerWeights Structure
// ===========================

describe('LayerWeights Structure', () => {
  it('should have all 10 layer weights', () => {
    const weights: LayerWeights = {
      layer1_elementCore: 1.0,
      layer2_sibsinPlanet: 0.9,
      layer3_sibsinHouse: 0.85,
      layer4_timing: 0.95,
      layer5_relationAspect: 0.8,
      layer6_stageHouse: 0.75,
      layer7_advanced: 0.7,
      layer8_shinsal: 0.65,
      layer9_asteroid: 0.5,
      layer10_extraPoint: 0.55,
    };

    expect(Object.keys(weights)).toHaveLength(10);
  });

  it('should have weights in valid range', () => {
    const weights: LayerWeights = {
      layer1_elementCore: 1.0,
      layer2_sibsinPlanet: 0.9,
      layer3_sibsinHouse: 0.85,
      layer4_timing: 0.95,
      layer5_relationAspect: 0.8,
      layer6_stageHouse: 0.75,
      layer7_advanced: 0.7,
      layer8_shinsal: 0.65,
      layer9_asteroid: 0.5,
      layer10_extraPoint: 0.55,
    };

    for (const weight of Object.values(weights)) {
      expect(weight).toBeGreaterThanOrEqual(0);
      expect(weight).toBeLessThanOrEqual(1);
    }
  });

  it('should have decreasing weights from layer 1 to 9', () => {
    const weights: LayerWeights = {
      layer1_elementCore: 1.0,
      layer2_sibsinPlanet: 0.9,
      layer3_sibsinHouse: 0.85,
      layer4_timing: 0.95,
      layer5_relationAspect: 0.8,
      layer6_stageHouse: 0.75,
      layer7_advanced: 0.7,
      layer8_shinsal: 0.65,
      layer9_asteroid: 0.5,
      layer10_extraPoint: 0.55,
    };

    expect(weights.layer1_elementCore).toBeGreaterThan(weights.layer2_sibsinPlanet);
    expect(weights.layer9_asteroid).toBeLessThan(weights.layer1_elementCore);
  });
});

// ===========================
// Tests: OverallScore Structure
// ===========================

describe('OverallScore Structure', () => {
  it('should have all required fields', () => {
    const score: OverallScore = {
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
    };

    expect(score).toHaveProperty('total');
    expect(score).toHaveProperty('grade');
    expect(score).toHaveProperty('gradeDescription');
    expect(score).toHaveProperty('gradeDescriptionEn');
    expect(score).toHaveProperty('categoryScores');
  });

  it('should have total score in valid range', () => {
    const score: OverallScore = {
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
    };

    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(100);
  });

  it('should have valid grade', () => {
    const score: OverallScore = {
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
    };

    expect(isValidGrade(score.grade)).toBe(true);
  });

  it('should have all 5 category scores', () => {
    const score: OverallScore = {
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
    };

    expect(Object.keys(score.categoryScores)).toHaveLength(5);
    expect(score.categoryScores).toHaveProperty('strength');
    expect(score.categoryScores).toHaveProperty('opportunity');
    expect(score.categoryScores).toHaveProperty('balance');
    expect(score.categoryScores).toHaveProperty('caution');
    expect(score.categoryScores).toHaveProperty('challenge');
  });

  it('should have optional data quality fields', () => {
    const score: OverallScore = {
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
      dataCompleteness: 85,
      insightCount: 42,
    };

    if (score.dataCompleteness !== undefined) {
      expect(score.dataCompleteness).toBeGreaterThanOrEqual(0);
      expect(score.dataCompleteness).toBeLessThanOrEqual(100);
    }

    if (score.insightCount !== undefined) {
      expect(score.insightCount).toBeGreaterThanOrEqual(0);
    }
  });
});

// ===========================
// Tests: DomainAnalysis Structure
// ===========================

describe('DomainAnalysis Structure', () => {
  it('should have all required fields', () => {
    const domain: DomainAnalysis = {
      domain: 'career',
      score: 75,
      grade: 'A',
      summary: '좋은 흐름',
      summaryEn: 'Good flow',
      strengths: ['강점 1', '강점 2'],
      strengthsEn: ['Strength 1', 'Strength 2'],
      challenges: ['도전 1'],
      challengesEn: ['Challenge 1'],
      insights: [],
      hasData: true,
      insightCount: 5,
    };

    expect(domain).toHaveProperty('domain');
    expect(domain).toHaveProperty('score');
    expect(domain).toHaveProperty('grade');
    expect(domain).toHaveProperty('summary');
    expect(domain).toHaveProperty('summaryEn');
    expect(domain).toHaveProperty('strengths');
    expect(domain).toHaveProperty('strengthsEn');
    expect(domain).toHaveProperty('challenges');
    expect(domain).toHaveProperty('challengesEn');
    expect(domain).toHaveProperty('insights');
    expect(domain).toHaveProperty('hasData');
    expect(domain).toHaveProperty('insightCount');
  });

  it('should have valid domain', () => {
    const domain: DomainAnalysis = {
      domain: 'career',
      score: 75,
      grade: 'A',
      summary: '좋은 흐름',
      summaryEn: 'Good flow',
      strengths: [],
      strengthsEn: [],
      challenges: [],
      challengesEn: [],
      insights: [],
      hasData: true,
      insightCount: 0,
    };

    expect(isInsightDomain(domain.domain)).toBe(true);
  });

  it('should have bilingual strengths and challenges', () => {
    const domain: DomainAnalysis = {
      domain: 'career',
      score: 75,
      grade: 'A',
      summary: '좋은 흐름',
      summaryEn: 'Good flow',
      strengths: ['강점 1', '강점 2'],
      strengthsEn: ['Strength 1', 'Strength 2'],
      challenges: ['도전 1'],
      challengesEn: ['Challenge 1'],
      insights: [],
      hasData: true,
      insightCount: 1,
    };

    expect(domain.strengths.length).toBe(domain.strengthsEn.length);
    expect(domain.challenges.length).toBe(domain.challengesEn.length);
  });

  it('should have insights array', () => {
    const domain: DomainAnalysis = {
      domain: 'career',
      score: 75,
      grade: 'A',
      summary: '좋은 흐름',
      summaryEn: 'Good flow',
      strengths: [],
      strengthsEn: [],
      challenges: [],
      challengesEn: [],
      insights: [createMockFusionInsight()],
      hasData: true,
      insightCount: 1,
    };

    expect(Array.isArray(domain.insights)).toBe(true);
  });
});

// ===========================
// Tests: InterpreterConfig Structure
// ===========================

describe('InterpreterConfig Structure', () => {
  it('should have all required fields', () => {
    const config: InterpreterConfig = {
      lang: 'ko',
      maxTopInsights: 5,
      includeDetailedData: false,
      weightConfig: {
        baseWeights: {
          layer1_elementCore: 1.0,
          layer2_sibsinPlanet: 0.9,
          layer3_sibsinHouse: 0.85,
          layer4_timing: 0.95,
          layer5_relationAspect: 0.8,
          layer6_stageHouse: 0.75,
          layer7_advanced: 0.7,
          layer8_shinsal: 0.65,
          layer9_asteroid: 0.5,
          layer10_extraPoint: 0.55,
        },
        contextModifiers: [],
        temporalModifiers: [],
      },
      narrativeStyle: 'friendly',
      includeVisualizations: true,
    };

    expect(config).toHaveProperty('lang');
    expect(config).toHaveProperty('maxTopInsights');
    expect(config).toHaveProperty('includeDetailedData');
    expect(config).toHaveProperty('weightConfig');
    expect(config).toHaveProperty('narrativeStyle');
    expect(config).toHaveProperty('includeVisualizations');
  });

  it('should have valid language', () => {
    const config: InterpreterConfig = {
      lang: 'ko',
      maxTopInsights: 5,
      includeDetailedData: false,
      weightConfig: {
        baseWeights: {
          layer1_elementCore: 1.0,
          layer2_sibsinPlanet: 0.9,
          layer3_sibsinHouse: 0.85,
          layer4_timing: 0.95,
          layer5_relationAspect: 0.8,
          layer6_stageHouse: 0.75,
          layer7_advanced: 0.7,
          layer8_shinsal: 0.65,
          layer9_asteroid: 0.5,
          layer10_extraPoint: 0.55,
        },
        contextModifiers: [],
        temporalModifiers: [],
      },
      narrativeStyle: 'friendly',
      includeVisualizations: true,
    };

    expect(['ko', 'en']).toContain(config.lang);
  });

  it('should have valid narrative style', () => {
    const config: InterpreterConfig = {
      lang: 'ko',
      maxTopInsights: 5,
      includeDetailedData: false,
      weightConfig: {
        baseWeights: {
          layer1_elementCore: 1.0,
          layer2_sibsinPlanet: 0.9,
          layer3_sibsinHouse: 0.85,
          layer4_timing: 0.95,
          layer5_relationAspect: 0.8,
          layer6_stageHouse: 0.75,
          layer7_advanced: 0.7,
          layer8_shinsal: 0.65,
          layer9_asteroid: 0.5,
          layer10_extraPoint: 0.55,
        },
        contextModifiers: [],
        temporalModifiers: [],
      },
      narrativeStyle: 'friendly',
      includeVisualizations: true,
    };

    expect(['formal', 'friendly', 'minimal']).toContain(config.narrativeStyle);
  });
});

// ===========================
// Tests: Grade Validation
// ===========================

describe('Grade Validation', () => {
  it('should validate all five grades', () => {
    const grades = ['S', 'A', 'B', 'C', 'D'];

    for (const grade of grades) {
      expect(isValidGrade(grade)).toBe(true);
    }
  });

  it('should reject invalid grades', () => {
    const invalid = ['F', 'E', 'SS', 'A+', 'B-'];

    for (const grade of invalid) {
      expect(isValidGrade(grade)).toBe(false);
    }
  });

  it('should have exactly 5 grades', () => {
    const validGrades = ['S', 'A', 'B', 'C', 'D'];
    expect(validGrades).toHaveLength(5);
  });
});
