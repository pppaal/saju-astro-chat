/**
 * Tests for src/lib/destiny-map/calendar/builders/category-generator.ts
 * 카테고리 생성 테스트
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/destiny-map/calendar/category-scoring', () => ({
  calculateAreaScoresForCategories: vi.fn(() => ({
    career: 80,
    love: 60,
    health: 40,
    wealth: 70,
  })),
  getBestAreaCategory: vi.fn(() => 'career'),
}));

import { generateCategories, type CategoryGeneratorInput } from '@/lib/destiny-map/calendar/builders/category-generator';
import { getBestAreaCategory } from '@/lib/destiny-map/calendar/category-scoring';

describe('category-generator', () => {
  const baseInput: CategoryGeneratorInput = {
    ganzhi: { stem: '甲', branch: '子', stemElement: 'wood', branchElement: 'water' },
    dayMasterElement: 'wood',
    dayBranch: '子',
    relations: {
      generates: 'fire',
      generatedBy: 'water',
      controls: 'earth',
      controlledBy: 'metal',
    },
    seunScore: 70,
    wolunScore: 65,
    specialFlags: {
      hasCheoneulGwiin: false,
      hasSonEomneun: false,
      hasGeonrok: false,
      hasYeokma: false,
      hasDohwa: false,
    },
  };

  it('should include best area category from scoring', () => {
    const result = generateCategories(baseInput);
    expect(result.categories).toContain('career');
  });

  it('should add general for 손없는 날', () => {
    const result = generateCategories({
      ...baseInput,
      specialFlags: { ...baseInput.specialFlags, hasSonEomneun: true },
    });
    expect(result.categories).toContain('general');
  });

  it('should add career for 건록', () => {
    const result = generateCategories({
      ...baseInput,
      specialFlags: { ...baseInput.specialFlags, hasGeonrok: true },
    });
    expect(result.categories).toContain('career');
  });

  it('should add travel for 역마살', () => {
    const result = generateCategories({
      ...baseInput,
      specialFlags: { ...baseInput.specialFlags, hasYeokma: true },
    });
    expect(result.categories).toContain('travel');
  });

  it('should add love for 도화살', () => {
    const result = generateCategories({
      ...baseInput,
      specialFlags: { ...baseInput.specialFlags, hasDohwa: true },
    });
    expect(result.categories).toContain('love');
  });

  describe('천간 element relationships', () => {
    it('should add career for 비견 (same element)', () => {
      const result = generateCategories({
        ...baseInput,
        ganzhi: { ...baseInput.ganzhi, stemElement: 'wood' },
        dayMasterElement: 'wood',
      });
      expect(result.categories).toContain('career');
    });

    it('should add study and career for 인성 (generatedBy)', () => {
      const result = generateCategories({
        ...baseInput,
        ganzhi: { ...baseInput.ganzhi, stemElement: 'water' },
        dayMasterElement: 'wood',
        relations: { ...baseInput.relations, generatedBy: 'water' },
      });
      expect(result.categories).toContain('study');
      expect(result.categories).toContain('career');
    });

    it('should add wealth and love for 재성 (controls)', () => {
      const result = generateCategories({
        ...baseInput,
        ganzhi: { ...baseInput.ganzhi, stemElement: 'earth' },
        dayMasterElement: 'wood',
        relations: { ...baseInput.relations, controls: 'earth' },
      });
      expect(result.categories).toContain('wealth');
      expect(result.categories).toContain('love');
    });

    it('should add love and career for 식상 (generates)', () => {
      const result = generateCategories({
        ...baseInput,
        ganzhi: { ...baseInput.ganzhi, stemElement: 'fire' },
        dayMasterElement: 'wood',
        relations: { ...baseInput.relations, generates: 'fire' },
      });
      expect(result.categories).toContain('love');
      expect(result.categories).toContain('career');
    });

    it('should add health and career for 관살 (controlledBy)', () => {
      const result = generateCategories({
        ...baseInput,
        ganzhi: { ...baseInput.ganzhi, stemElement: 'metal' },
        dayMasterElement: 'wood',
        relations: { ...baseInput.relations, controlledBy: 'metal' },
      });
      expect(result.categories).toContain('health');
      expect(result.categories).toContain('career');
    });
  });

  it('should add general when no categories generated', () => {
    (getBestAreaCategory as any).mockReturnValueOnce(null);

    const result = generateCategories({
      ...baseInput,
      // Use an element not in any relation to avoid category generation
      ganzhi: { ...baseInput.ganzhi, stemElement: 'unknown' },
    });
    expect(result.categories).toContain('general');
  });

  it('should not duplicate categories', () => {
    const result = generateCategories({
      ...baseInput,
      specialFlags: { ...baseInput.specialFlags, hasGeonrok: true },
      ganzhi: { ...baseInput.ganzhi, stemElement: 'wood' },
      dayMasterElement: 'wood',
    });

    const careerCount = result.categories.filter(c => c === 'career').length;
    expect(careerCount).toBe(1);
  });
});
