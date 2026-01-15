// tests/lib/destiny-matrix/interpretation-guide.test.ts
// Comprehensive tests for INTERPRETATION_GUIDE and getQuickInterpretation

import { describe, it, expect } from 'vitest';
import { INTERPRETATION_GUIDE, getQuickInterpretation } from '@/lib/destiny-matrix/interpretation-guide';

// ===========================
// Tests: INTERPRETATION_GUIDE Structure
// ===========================

describe('INTERPRETATION_GUIDE - Structure', () => {
  it('should have basics section', () => {
    expect(INTERPRETATION_GUIDE).toHaveProperty('basics');
    expect(INTERPRETATION_GUIDE.basics).toHaveProperty('title');
    expect(INTERPRETATION_GUIDE.basics).toHaveProperty('titleEn');
    expect(INTERPRETATION_GUIDE.basics).toHaveProperty('sections');
  });

  it('should have layerGuides section', () => {
    expect(INTERPRETATION_GUIDE).toHaveProperty('layerGuides');
  });

  it('should have newInterpretations section', () => {
    expect(INTERPRETATION_GUIDE).toHaveProperty('newInterpretations');
    expect(INTERPRETATION_GUIDE.newInterpretations).toHaveProperty('title');
    expect(INTERPRETATION_GUIDE.newInterpretations).toHaveProperty('methods');
  });

  it('should have all 10 layers in layerGuides', () => {
    expect(INTERPRETATION_GUIDE.layerGuides).toHaveProperty('layer1');
    expect(INTERPRETATION_GUIDE.layerGuides).toHaveProperty('layer2');
    expect(INTERPRETATION_GUIDE.layerGuides).toHaveProperty('layer3');
    expect(INTERPRETATION_GUIDE.layerGuides).toHaveProperty('layer4');
    expect(INTERPRETATION_GUIDE.layerGuides).toHaveProperty('layer5');
    expect(INTERPRETATION_GUIDE.layerGuides).toHaveProperty('layer6');
    expect(INTERPRETATION_GUIDE.layerGuides).toHaveProperty('layer7');
    expect(INTERPRETATION_GUIDE.layerGuides).toHaveProperty('layer8');
    expect(INTERPRETATION_GUIDE.layerGuides).toHaveProperty('layer9');
    expect(INTERPRETATION_GUIDE.layerGuides).toHaveProperty('layer10');
  });
});

// ===========================
// Tests: Basics Section
// ===========================

describe('INTERPRETATION_GUIDE - Basics', () => {
  it('should have interaction levels section', () => {
    expect(INTERPRETATION_GUIDE.basics.sections).toHaveProperty('interactionLevels');
    const levels = INTERPRETATION_GUIDE.basics.sections.interactionLevels;
    expect(levels).toHaveProperty('title');
    expect(levels).toHaveProperty('titleEn');
    expect(levels).toHaveProperty('description');
    expect(levels).toHaveProperty('levels');
  });

  it('should have 5 interaction levels', () => {
    const levels = INTERPRETATION_GUIDE.basics.sections.interactionLevels.levels;
    expect(levels).toHaveLength(5);
    expect(levels.map(l => l.level)).toContain('extreme');
    expect(levels.map(l => l.level)).toContain('amplify');
    expect(levels.map(l => l.level)).toContain('balance');
    expect(levels.map(l => l.level)).toContain('clash');
    expect(levels.map(l => l.level)).toContain('conflict');
  });

  it('should have crossReference section', () => {
    expect(INTERPRETATION_GUIDE.basics.sections).toHaveProperty('crossReference');
    const crossRef = INTERPRETATION_GUIDE.basics.sections.crossReference;
    expect(crossRef).toHaveProperty('title');
    expect(crossRef).toHaveProperty('steps');
    expect(crossRef.steps.length).toBeGreaterThan(0);
  });

  it('should have 4 cross-reference steps', () => {
    const steps = INTERPRETATION_GUIDE.basics.sections.crossReference.steps;
    expect(steps).toHaveLength(4);
    for (const step of steps) {
      expect(step).toHaveProperty('step');
      expect(step).toHaveProperty('title');
      expect(step).toHaveProperty('titleEn');
      expect(step).toHaveProperty('description');
      expect(step).toHaveProperty('descriptionEn');
    }
  });
});

// ===========================
// Tests: Layer Guides
// ===========================

describe('INTERPRETATION_GUIDE - Layer Guides', () => {
  it('should have bilingual titles for all layers', () => {
    for (let i = 1; i <= 10; i++) {
      const layer = INTERPRETATION_GUIDE.layerGuides[`layer${i}` as keyof typeof INTERPRETATION_GUIDE.layerGuides];
      expect(layer).toHaveProperty('title');
      expect(layer).toHaveProperty('titleEn');
      expect(layer.title).toBeTruthy();
      expect(layer.titleEn).toBeTruthy();
    }
  });

  it('should have purpose for all layers', () => {
    for (let i = 1; i <= 10; i++) {
      const layer = INTERPRETATION_GUIDE.layerGuides[`layer${i}` as keyof typeof INTERPRETATION_GUIDE.layerGuides];
      expect(layer).toHaveProperty('purpose');
      expect(layer).toHaveProperty('purposeEn');
      expect(layer.purpose).toBeTruthy();
      expect(layer.purposeEn).toBeTruthy();
    }
  });

  it('should have interpretation for all layers', () => {
    for (let i = 1; i <= 10; i++) {
      const layer = INTERPRETATION_GUIDE.layerGuides[`layer${i}` as keyof typeof INTERPRETATION_GUIDE.layerGuides];
      expect(layer).toHaveProperty('interpretation');
      expect(layer.interpretation).toHaveProperty('question');
      expect(layer.interpretation).toHaveProperty('questionEn');
      expect(layer.interpretation).toHaveProperty('examples');
    }
  });

  it('should have examples for all layers', () => {
    for (let i = 1; i <= 10; i++) {
      const layer = INTERPRETATION_GUIDE.layerGuides[`layer${i}` as keyof typeof INTERPRETATION_GUIDE.layerGuides];
      expect(layer.interpretation.examples.length).toBeGreaterThan(0);
      for (const example of layer.interpretation.examples) {
        expect(example).toHaveProperty('case');
        expect(example).toHaveProperty('meaning');
        expect(example).toHaveProperty('meaningEn');
      }
    }
  });

  it('should have Layer 1 as element core', () => {
    const layer1 = INTERPRETATION_GUIDE.layerGuides.layer1;
    expect(layer1.title).toContain('기운핵심');
    expect(layer1.titleEn).toContain('Element Core');
  });

  it('should have Layer 4 as timing overlay', () => {
    const layer4 = INTERPRETATION_GUIDE.layerGuides.layer4;
    expect(layer4.title).toContain('타이밍');
    expect(layer4.titleEn).toContain('Timing');
  });

  it('should have Layer 10 as extra points', () => {
    const layer10 = INTERPRETATION_GUIDE.layerGuides.layer10;
    expect(layer10.title).toContain('엑스트라포인트');
    expect(layer10.titleEn).toContain('Extra Points');
  });
});

// ===========================
// Tests: New Interpretations
// ===========================

describe('INTERPRETATION_GUIDE - New Interpretations', () => {
  it('should have methods array', () => {
    expect(Array.isArray(INTERPRETATION_GUIDE.newInterpretations.methods)).toBe(true);
    expect(INTERPRETATION_GUIDE.newInterpretations.methods.length).toBeGreaterThan(0);
  });

  it('should have bilingual method descriptions', () => {
    for (const method of INTERPRETATION_GUIDE.newInterpretations.methods) {
      expect(method).toHaveProperty('method');
      expect(method).toHaveProperty('methodEn');
      expect(method).toHaveProperty('description');
      expect(method).toHaveProperty('descriptionEn');
      expect(method).toHaveProperty('example');
      expect(method).toHaveProperty('exampleEn');
    }
  });

  it('should have multi-layer cross analysis method', () => {
    const method = INTERPRETATION_GUIDE.newInterpretations.methods.find(m =>
      m.method.includes('다중 레이어')
    );
    expect(method).toBeDefined();
    expect(method?.methodEn).toContain('Multi-Layer');
  });

  it('should have timing overlap analysis method', () => {
    const method = INTERPRETATION_GUIDE.newInterpretations.methods.find(m =>
      m.method.includes('타이밍 중첩')
    );
    expect(method).toBeDefined();
  });
});

// ===========================
// Tests: getQuickInterpretation Function
// ===========================

describe('getQuickInterpretation - All Levels', () => {
  const levels = ['extreme', 'amplify', 'balance', 'clash', 'conflict'] as const;
  const contexts = ['career', 'love', 'health', 'wealth', 'general'] as const;

  for (const level of levels) {
    describe(`Level: ${level}`, () => {
      for (const context of contexts) {
        it(`should return interpretation for ${level} + ${context}`, () => {
          const result = getQuickInterpretation(level, context);
          expect(typeof result).toBe('string');
          expect(result.length).toBeGreaterThan(0);
        });
      }
    });
  }
});

describe('getQuickInterpretation - Content Validation', () => {
  it('should return extreme career interpretation', () => {
    const result = getQuickInterpretation('extreme', 'career');
    expect(result).toContain('폭발적');
    expect(result).toContain('성과');
  });

  it('should return amplify love interpretation', () => {
    const result = getQuickInterpretation('amplify', 'love');
    expect(result).toContain('좋은');
    expect(result).toContain('연애');
  });

  it('should return balance health interpretation', () => {
    const result = getQuickInterpretation('balance', 'health');
    expect(result).toContain('안정적');
    expect(result).toContain('건강');
  });

  it('should return clash wealth interpretation', () => {
    const result = getQuickInterpretation('clash', 'wealth');
    expect(result).toContain('재물');
    expect(result).toContain('변동');
  });

  it('should return conflict general interpretation', () => {
    const result = getQuickInterpretation('conflict', 'general');
    expect(result).toContain('어려운');
    expect(result).toContain('시기');
  });
});

// ===========================
// Tests: Interaction Level Details
// ===========================

describe('INTERPRETATION_GUIDE - Interaction Level Details', () => {
  it('should have extreme level with score 9-10', () => {
    const extreme = INTERPRETATION_GUIDE.basics.sections.interactionLevels.levels.find(l => l.level === 'extreme');
    expect(extreme).toBeDefined();
    expect(extreme?.score).toBe('9-10');
    expect(extreme?.icon).toBe('💥');
  });

  it('should have amplify level with score 7-8', () => {
    const amplify = INTERPRETATION_GUIDE.basics.sections.interactionLevels.levels.find(l => l.level === 'amplify');
    expect(amplify).toBeDefined();
    expect(amplify?.score).toBe('7-8');
    expect(amplify?.icon).toBe('🚀');
  });

  it('should have balance level with score 5-6', () => {
    const balance = INTERPRETATION_GUIDE.basics.sections.interactionLevels.levels.find(l => l.level === 'balance');
    expect(balance).toBeDefined();
    expect(balance?.score).toBe('5-6');
    expect(balance?.icon).toBe('⚖️');
  });

  it('should have clash level with score 3-4', () => {
    const clash = INTERPRETATION_GUIDE.basics.sections.interactionLevels.levels.find(l => l.level === 'clash');
    expect(clash).toBeDefined();
    expect(clash?.score).toBe('3-4');
    expect(clash?.icon).toBe('⚡');
  });

  it('should have conflict level with score 1-2', () => {
    const conflict = INTERPRETATION_GUIDE.basics.sections.interactionLevels.levels.find(l => l.level === 'conflict');
    expect(conflict).toBeDefined();
    expect(conflict?.score).toBe('1-2');
    expect(conflict?.icon).toBe('❌');
  });

  it('should have colors for all levels', () => {
    for (const level of INTERPRETATION_GUIDE.basics.sections.interactionLevels.levels) {
      expect(level).toHaveProperty('color');
      expect(level.color).toBeTruthy();
    }
  });

  it('should have bilingual meanings', () => {
    for (const level of INTERPRETATION_GUIDE.basics.sections.interactionLevels.levels) {
      expect(level).toHaveProperty('meaning');
      expect(level).toHaveProperty('meaningEn');
      expect(level).toHaveProperty('interpretation');
      expect(level).toHaveProperty('interpretationEn');
    }
  });
});

// ===========================
// Tests: Layer-Specific Examples
// ===========================

describe('INTERPRETATION_GUIDE - Layer Examples', () => {
  it('should have Layer 1 example with 목+Fire', () => {
    const example = INTERPRETATION_GUIDE.layerGuides.layer1.interpretation.examples.find(e =>
      e.case.includes('목') && e.case.includes('Fire')
    );
    expect(example).toBeDefined();
    expect(example?.meaning).toContain('성장');
  });

  it('should have Layer 2 example with 식신+Venus', () => {
    const example = INTERPRETATION_GUIDE.layerGuides.layer2.interpretation.examples.find(e =>
      e.case.includes('식신') && e.case.includes('Venus')
    );
    expect(example).toBeDefined();
    expect(example?.meaning).toContain('예술');
  });

  it('should have Layer 4 example with Saturn Return', () => {
    const example = INTERPRETATION_GUIDE.layerGuides.layer4.interpretation.examples.find(e =>
      e.case.includes('Saturn Return')
    );
    expect(example).toBeDefined();
    expect(example?.meaning).toContain('전환');
  });

  it('should have Layer 8 example with 천을귀인', () => {
    const example = INTERPRETATION_GUIDE.layerGuides.layer8.interpretation.examples.find(e =>
      e.case.includes('천을귀인')
    );
    expect(example).toBeDefined();
  });
});
