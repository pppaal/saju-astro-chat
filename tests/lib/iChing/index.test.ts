/**
 * Comprehensive tests for I Ching Index Module
 * Tests all exports and module structure
 */

import { describe, it, expect } from 'vitest';
import * as IChingModule from '@/lib/iChing/index';

describe('I Ching Index - Basic Data Exports', () => {
  it('should export IChingData', () => {
    expect(IChingModule).toHaveProperty('IChingData');
    expect(IChingModule.IChingData).toBeDefined();
  });

  it('should export Hexagram type', () => {
    expect(typeof IChingModule.IChingData).toBe('object');
  });
});

describe('I Ching Index - Advanced Core Exports', () => {
  it('should export TRIGRAMS constant', () => {
    expect(IChingModule).toHaveProperty('TRIGRAMS');
    expect(IChingModule.TRIGRAMS).toBeDefined();
  });

  it('should export analyzeHoGwa function', () => {
    expect(IChingModule).toHaveProperty('analyzeHoGwa');
    expect(typeof IChingModule.analyzeHoGwa).toBe('function');
  });

  it('should export analyzeChakGwa function', () => {
    expect(IChingModule).toHaveProperty('analyzeChakGwa');
    expect(typeof IChingModule.analyzeChakGwa).toBe('function');
  });

  it('should export analyzeDoGwa function', () => {
    expect(IChingModule).toHaveProperty('analyzeDoGwa');
    expect(typeof IChingModule.analyzeDoGwa).toBe('function');
  });

  it('should export analyzeSangbanGwa function', () => {
    expect(IChingModule).toHaveProperty('analyzeSangbanGwa');
    expect(typeof IChingModule.analyzeSangbanGwa).toBe('function');
  });

  it('should export analyzeBokGwa function', () => {
    expect(IChingModule).toHaveProperty('analyzeBokGwa');
    expect(typeof IChingModule.analyzeBokGwa).toBe('function');
  });

  it('should export analyzeHaekGwa function', () => {
    expect(IChingModule).toHaveProperty('analyzeHaekGwa');
    expect(typeof IChingModule.analyzeHaekGwa).toBe('function');
  });

  it('should export analyzeTrigramInteraction function', () => {
    expect(IChingModule).toHaveProperty('analyzeTrigramInteraction');
    expect(typeof IChingModule.analyzeTrigramInteraction).toBe('function');
  });

  it('should export analyzeYaoPositions function', () => {
    expect(IChingModule).toHaveProperty('analyzeYaoPositions');
    expect(typeof IChingModule.analyzeYaoPositions).toBe('function');
  });

  it('should export analyzeChangingLines function', () => {
    expect(IChingModule).toHaveProperty('analyzeChangingLines');
    expect(typeof IChingModule.analyzeChangingLines).toBe('function');
  });

  it('should export performComprehensiveHexagramAnalysis function', () => {
    expect(IChingModule).toHaveProperty('performComprehensiveHexagramAnalysis');
    expect(typeof IChingModule.performComprehensiveHexagramAnalysis).toBe('function');
  });

  it('should export compareHexagrams function', () => {
    expect(IChingModule).toHaveProperty('compareHexagrams');
    expect(typeof IChingModule.compareHexagrams).toBe('function');
  });
});

describe('I Ching Index - Numerology Exports', () => {
  it('should export castMeihuaByTime function', () => {
    expect(IChingModule).toHaveProperty('castMeihuaByTime');
    expect(typeof IChingModule.castMeihuaByTime).toBe('function');
  });

  it('should export castMeihuaByNumbers function', () => {
    expect(IChingModule).toHaveProperty('castMeihuaByNumbers');
    expect(typeof IChingModule.castMeihuaByNumbers).toBe('function');
  });

  it('should export calculateBirthHexagram function', () => {
    expect(IChingModule).toHaveProperty('calculateBirthHexagram');
    expect(typeof IChingModule.calculateBirthHexagram).toBe('function');
  });

  it('should export calculateTimeHexagram function', () => {
    expect(IChingModule).toHaveProperty('calculateTimeHexagram');
    expect(typeof IChingModule.calculateTimeHexagram).toBe('function');
  });

  it('should export calculateYearlyFortune function', () => {
    expect(IChingModule).toHaveProperty('calculateYearlyFortune');
    expect(typeof IChingModule.calculateYearlyFortune).toBe('function');
  });

  it('should export analyzeDirectionalFortune function', () => {
    expect(IChingModule).toHaveProperty('analyzeDirectionalFortune');
    expect(typeof IChingModule.analyzeDirectionalFortune).toBe('function');
  });

  it('should export castHexagramByNumbers function', () => {
    expect(IChingModule).toHaveProperty('castHexagramByNumbers');
    expect(typeof IChingModule.castHexagramByNumbers).toBe('function');
  });
});

describe('I Ching Index - Pattern Analysis Exports', () => {
  it('should export analyzeInversionRelations function', () => {
    expect(IChingModule).toHaveProperty('analyzeInversionRelations');
    expect(typeof IChingModule.analyzeInversionRelations).toBe('function');
  });

  it('should export analyzeNuclearHexagram function', () => {
    expect(IChingModule).toHaveProperty('analyzeNuclearHexagram');
    expect(typeof IChingModule.analyzeNuclearHexagram).toBe('function');
  });

  it('should export analyzeSequencePosition function', () => {
    expect(IChingModule).toHaveProperty('analyzeSequencePosition');
    expect(typeof IChingModule.analyzeSequencePosition).toBe('function');
  });

  it('should export getXuguaPair function', () => {
    expect(IChingModule).toHaveProperty('getXuguaPair');
    expect(typeof IChingModule.getXuguaPair).toBe('function');
  });

  it('should export classifyByPalace function', () => {
    expect(IChingModule).toHaveProperty('classifyByPalace');
    expect(typeof IChingModule.classifyByPalace).toBe('function');
  });

  it('should export classifyByElement function', () => {
    expect(IChingModule).toHaveProperty('classifyByElement');
    expect(typeof IChingModule.classifyByElement).toBe('function');
  });

  it('should export getMonthlyHexagrams function', () => {
    expect(IChingModule).toHaveProperty('getMonthlyHexagrams');
    expect(typeof IChingModule.getMonthlyHexagrams).toBe('function');
  });

  it('should export getCurrentSeasonalHexagram function', () => {
    expect(IChingModule).toHaveProperty('getCurrentSeasonalHexagram');
    expect(typeof IChingModule.getCurrentSeasonalHexagram).toBe('function');
  });

  it('should export findOppositePairs function', () => {
    expect(IChingModule).toHaveProperty('findOppositePairs');
    expect(typeof IChingModule.findOppositePairs).toBe('function');
  });

  it('should export findHexagramsByPattern function', () => {
    expect(IChingModule).toHaveProperty('findHexagramsByPattern');
    expect(typeof IChingModule.findHexagramsByPattern).toBe('function');
  });

  it('should export getSpecialPatternHexagrams function', () => {
    expect(IChingModule).toHaveProperty('getSpecialPatternHexagrams');
    expect(typeof IChingModule.getSpecialPatternHexagrams).toBe('function');
  });

  it('should export analyzeHexagramRelationship function', () => {
    expect(IChingModule).toHaveProperty('analyzeHexagramRelationship');
    expect(typeof IChingModule.analyzeHexagramRelationship).toBe('function');
  });

  it('should export generateHexagramNetwork function', () => {
    expect(IChingModule).toHaveProperty('generateHexagramNetwork');
    expect(typeof IChingModule.generateHexagramNetwork).toBe('function');
  });
});

describe('I Ching Index - Wisdom Generator Exports', () => {
  it('should export HEXAGRAM_WISDOM constant', () => {
    expect(IChingModule).toHaveProperty('HEXAGRAM_WISDOM');
    expect(IChingModule.HEXAGRAM_WISDOM).toBeDefined();
  });

  it('should export YAO_POSITION_MEANINGS constant', () => {
    expect(IChingModule).toHaveProperty('YAO_POSITION_MEANINGS');
    expect(IChingModule.YAO_POSITION_MEANINGS).toBeDefined();
  });

  it('should export getHexagramWisdom function', () => {
    expect(IChingModule).toHaveProperty('getHexagramWisdom');
    expect(typeof IChingModule.getHexagramWisdom).toBe('function');
  });

  it('should export generateSituationalAdvice function', () => {
    expect(IChingModule).toHaveProperty('generateSituationalAdvice');
    expect(typeof IChingModule.generateSituationalAdvice).toBe('function');
  });

  it('should export generateWisdomPrompt function', () => {
    expect(IChingModule).toHaveProperty('generateWisdomPrompt');
    expect(typeof IChingModule.generateWisdomPrompt).toBe('function');
  });

  it('should export interpretChangingLines function', () => {
    expect(IChingModule).toHaveProperty('interpretChangingLines');
    expect(typeof IChingModule.interpretChangingLines).toBe('function');
  });

  it('should export generateDailyWisdom function', () => {
    expect(IChingModule).toHaveProperty('generateDailyWisdom');
    expect(typeof IChingModule.generateDailyWisdom).toBe('function');
  });

  it('should export analyzeHexagramRelationshipWisdom function', () => {
    expect(IChingModule).toHaveProperty('analyzeHexagramRelationshipWisdom');
    expect(typeof IChingModule.analyzeHexagramRelationshipWisdom).toBe('function');
  });

  it('should export generatePeriodicWisdom function', () => {
    expect(IChingModule).toHaveProperty('generatePeriodicWisdom');
    expect(typeof IChingModule.generatePeriodicWisdom).toBe('function');
  });

  it('should export deepWisdomAnalysis function', () => {
    expect(IChingModule).toHaveProperty('deepWisdomAnalysis');
    expect(typeof IChingModule.deepWisdomAnalysis).toBe('function');
  });
});

describe('I Ching Index - Statistics Engine Exports', () => {
  it('should export THEORETICAL_PROBABILITIES constant', () => {
    expect(IChingModule).toHaveProperty('THEORETICAL_PROBABILITIES');
    expect(IChingModule.THEORETICAL_PROBABILITIES).toBeDefined();
  });

  it('should export IChingStatisticsEngine class', () => {
    expect(IChingModule).toHaveProperty('IChingStatisticsEngine');
    expect(typeof IChingModule.IChingStatisticsEngine).toBe('function');
  });

  it('should export chiSquareTest function', () => {
    expect(IChingModule).toHaveProperty('chiSquareTest');
    expect(typeof IChingModule.chiSquareTest).toBe('function');
  });

  it('should export generateExpectedDistribution function', () => {
    expect(IChingModule).toHaveProperty('generateExpectedDistribution');
    expect(typeof IChingModule.generateExpectedDistribution).toBe('function');
  });

  it('should export getGlobalStatisticsEngine function', () => {
    expect(IChingModule).toHaveProperty('getGlobalStatisticsEngine');
    expect(typeof IChingModule.getGlobalStatisticsEngine).toBe('function');
  });

  it('should export resetGlobalStatisticsEngine function', () => {
    expect(IChingModule).toHaveProperty('resetGlobalStatisticsEngine');
    expect(typeof IChingModule.resetGlobalStatisticsEngine).toBe('function');
  });
});

describe('I Ching Index - Integrated Analysis Functions', () => {
  it('should export performCompleteAnalysis function', () => {
    expect(IChingModule).toHaveProperty('performCompleteAnalysis');
    expect(typeof IChingModule.performCompleteAnalysis).toBe('function');
  });

  it('should export performMeihuaAnalysis function', () => {
    expect(IChingModule).toHaveProperty('performMeihuaAnalysis');
    expect(typeof IChingModule.performMeihuaAnalysis).toBe('function');
  });

  it('should export performBirthAnalysis function', () => {
    expect(IChingModule).toHaveProperty('performBirthAnalysis');
    expect(typeof IChingModule.performBirthAnalysis).toBe('function');
  });

  it('should export generateFullHexagramNetwork function', () => {
    expect(IChingModule).toHaveProperty('generateFullHexagramNetwork');
    expect(typeof IChingModule.generateFullHexagramNetwork).toBe('function');
  });

  it('should export recordReading function', () => {
    expect(IChingModule).toHaveProperty('recordReading');
    expect(typeof IChingModule.recordReading).toBe('function');
  });

  it('should export getStatisticsReport function', () => {
    expect(IChingModule).toHaveProperty('getStatisticsReport');
    expect(typeof IChingModule.getStatisticsReport).toBe('function');
  });
});

describe('I Ching Index - performCompleteAnalysis Function', () => {
  it('should perform complete analysis for valid hexagram', () => {
    const result = IChingModule.performCompleteAnalysis(1);

    expect(result).toBeDefined();
    expect(result.hexagram).toBeDefined();
    expect(result.comprehensive).toBeDefined();
    expect(result.relationships).toBeDefined();
    expect(result.aiPrompt).toBeDefined();
  });

  it('should include hexagram basic info', () => {
    const result = IChingModule.performCompleteAnalysis(1);

    expect(result.hexagram.number).toBe(1);
    expect(result.hexagram.binary).toBe('111111');
    expect(result.hexagram.name).toBeTruthy();
  });

  it('should handle changing lines', () => {
    const result = IChingModule.performCompleteAnalysis(1, [1, 3]);

    expect(result).toBeDefined();
    expect(result.targetComparison).toBeDefined();
  });

  it('should include user profile in analysis', () => {
    const result = IChingModule.performCompleteAnalysis(1, [], {
      userProfile: { birthYear: 1990, gender: 'M' }
    });

    expect(result.personalizedAdvice).toBeDefined();
  });

  it('should handle different consultation types', () => {
    const consultationTypes: Array<'general' | 'career' | 'relationship' | 'health' | 'wealth' | 'spiritual'> =
      ['general', 'career', 'relationship', 'health', 'wealth', 'spiritual'];

    consultationTypes.forEach(type => {
      const result = IChingModule.performCompleteAnalysis(1, [], {
        consultationType: type
      });

      expect(result).toBeDefined();
      expect(result.aiPrompt).toBeTruthy();
    });
  });

  it('should generate AI prompt for all hexagrams', () => {
    for (let i = 1; i <= 64; i++) {
      const result = IChingModule.performCompleteAnalysis(i);
      expect(result.aiPrompt).toBeTruthy();
      expect(typeof result.aiPrompt).toBe('string');
    }
  });
});

describe('I Ching Index - performMeihuaAnalysis Function', () => {
  it('should perform Meihua analysis', () => {
    const result = IChingModule.performMeihuaAnalysis();

    expect(result).toBeDefined();
    expect(result.casting).toBeDefined();
    expect(result.analysis).toBeDefined();
  });

  it('should handle specific date', () => {
    const date = new Date(2024, 0, 1);
    const result = IChingModule.performMeihuaAnalysis(date);

    expect(result).toBeDefined();
    expect(result.casting).toBeDefined();
  });

  it('should include consultation options', () => {
    const result = IChingModule.performMeihuaAnalysis(undefined, {
      userQuestion: 'Test question',
      consultationType: 'career'
    });

    expect(result).toBeDefined();
    expect(result.analysis.aiPrompt).toBeTruthy();
  });
});

describe('I Ching Index - performBirthAnalysis Function', () => {
  it('should perform birth analysis', () => {
    const birthDate = new Date(1990, 0, 1);
    const result = IChingModule.performBirthAnalysis(birthDate);

    expect(result).toBeDefined();
    expect(result.birthHexagram).toBeDefined();
    expect(result.lifeAnalysis).toBeDefined();
  });

  it('should handle birth time', () => {
    const birthDate = new Date(1990, 0, 1);
    const birthTime = { hour: 14, minute: 30 };
    const result = IChingModule.performBirthAnalysis(birthDate, birthTime);

    expect(result).toBeDefined();
  });

  it('should handle gender', () => {
    const birthDate = new Date(1990, 0, 1);
    const result = IChingModule.performBirthAnalysis(birthDate, undefined, 'F');

    expect(result).toBeDefined();
  });
});

describe('I Ching Index - recordReading and Statistics', () => {
  it('should record reading', () => {
    expect(() => {
      IChingModule.recordReading(1, []);
    }).not.toThrow();
  });

  it('should record reading with options', () => {
    expect(() => {
      IChingModule.recordReading(1, [1], {
        question: 'Test question',
        category: 'career',
        outcome: 'positive',
        notes: 'Test notes'
      });
    }).not.toThrow();
  });

  it('should generate statistics report', () => {
    const report = IChingModule.getStatisticsReport();

    expect(typeof report).toBe('string');
  });
});

describe('I Ching Index - Module Structure', () => {
  it('should have all major export categories', () => {
    const hasBasicData = 'IChingData' in IChingModule;
    const hasAdvancedCore = 'TRIGRAMS' in IChingModule;
    const hasNumerology = 'castMeihuaByTime' in IChingModule;
    const hasPatterns = 'analyzeInversionRelations' in IChingModule;
    const hasWisdom = 'HEXAGRAM_WISDOM' in IChingModule;
    const hasStatistics = 'IChingStatisticsEngine' in IChingModule;
    const hasIntegrated = 'performCompleteAnalysis' in IChingModule;

    expect(hasBasicData).toBe(true);
    expect(hasAdvancedCore).toBe(true);
    expect(hasNumerology).toBe(true);
    expect(hasPatterns).toBe(true);
    expect(hasWisdom).toBe(true);
    expect(hasStatistics).toBe(true);
    expect(hasIntegrated).toBe(true);
  });

  it('should not have duplicate exports', () => {
    const exportNames = Object.keys(IChingModule);
    const uniqueNames = new Set(exportNames);

    expect(exportNames.length).toBe(uniqueNames.size);
  });

  it('should export at least 50 items', () => {
    const exportCount = Object.keys(IChingModule).length;
    expect(exportCount).toBeGreaterThanOrEqual(50);
  });
});

describe('I Ching Index - Type Exports', () => {
  it('should properly type CompleteIChingAnalysis', () => {
    const result = IChingModule.performCompleteAnalysis(1);

    expect(result).toHaveProperty('hexagram');
    expect(result).toHaveProperty('comprehensive');
    expect(result).toHaveProperty('relationships');
    expect(result).toHaveProperty('wisdom');
    expect(result).toHaveProperty('aiPrompt');
  });

  it('should properly type MeihuaCompleteAnalysis', () => {
    const result = IChingModule.performMeihuaAnalysis();

    expect(result).toHaveProperty('casting');
    expect(result).toHaveProperty('analysis');
  });

  it('should properly type BirthHexagramCompleteAnalysis', () => {
    const birthDate = new Date(1990, 0, 1);
    const result = IChingModule.performBirthAnalysis(birthDate);

    expect(result).toHaveProperty('birthHexagram');
    expect(result).toHaveProperty('lifeAnalysis');
  });
});
