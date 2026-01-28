/**
 * Tests for src/lib/destiny-map/calendar/utils/branch-relationship-analyzer.ts
 * 지지 관계 분석 테스트
 */

import { describe, it, expect } from 'vitest';
import { analyzeBranchRelationships } from '@/lib/destiny-map/calendar/utils/branch-relationship-analyzer';

describe('branch-relationship-analyzer', () => {
  const SAMHAP = {
    wood: ['寅', '午', '戌'],
    fire: ['巳', '酉', '丑'],
    metal: ['申', '子', '辰'],
    water: ['亥', '卯', '未'],
  };
  const YUKHAP: Record<string, string> = {
    '子': '丑', '丑': '子', '寅': '亥', '亥': '寅',
    '卯': '戌', '戌': '卯', '辰': '酉', '酉': '辰',
    '巳': '申', '申': '巳', '午': '未', '未': '午',
  };
  const CHUNG: Record<string, string> = {
    '子': '午', '午': '子', '丑': '未', '未': '丑',
    '寅': '申', '申': '寅', '卯': '酉', '酉': '卯',
    '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳',
  };
  const XING: Record<string, string[]> = {
    '寅': ['巳', '申'], '巳': ['寅', '申'], '申': ['寅', '巳'],
    '丑': ['戌', '未'], '戌': ['丑', '未'], '未': ['丑', '戌'],
    '子': ['卯'], '卯': ['子'],
  };

  const baseInput = {
    dayBranch: '子',
    ganzhiBranch: '丑',
    dayMasterElement: 'water',
    relations: {
      generates: 'wood',
      generatedBy: 'metal',
      controls: 'fire',
      controlledBy: 'earth',
    },
    SAMHAP,
    YUKHAP,
    CHUNG,
    XING,
  };

  it('should return empty result for empty dayBranch', () => {
    const result = analyzeBranchRelationships({
      ...baseInput,
      dayBranch: '',
    });

    expect(result.factorKeys).toEqual([]);
    expect(result.recommendations).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.categories).toEqual([]);
    expect(result.filterScenarios).toEqual([]);
  });

  describe('삼합 (Samhap / Three Harmony)', () => {
    it('should detect positive samhap with dayMasterElement', () => {
      const result = analyzeBranchRelationships({
        ...baseInput,
        dayBranch: '申',       // metal group
        ganzhiBranch: '子',    // metal group
        dayMasterElement: 'metal',
      });

      expect(result.factorKeys).toContain('branchSamhap');
      expect(result.titleKey).toBe('calendar.samhap');
      expect(result.recommendations).toContain('bigDecision');
      expect(result.recommendations).toContain('contract');
      expect(result.categories).toContain('general');
    });

    it('should detect positive samhap with generatedBy element', () => {
      const result = analyzeBranchRelationships({
        ...baseInput,
        dayBranch: '申',       // metal group
        ganzhiBranch: '子',    // metal group
        dayMasterElement: 'water',
        relations: { ...baseInput.relations, generatedBy: 'metal' },
      });

      expect(result.factorKeys).toContain('branchSamhap');
    });

    it('should detect negative samhap with controlledBy element', () => {
      const result = analyzeBranchRelationships({
        ...baseInput,
        dayBranch: '申',
        ganzhiBranch: '子',
        dayMasterElement: 'wood',
        relations: { ...baseInput.relations, generatedBy: 'water', controlledBy: 'metal' },
      });

      expect(result.factorKeys).toContain('branchSamhapNegative');
      expect(result.warnings).toContain('opposition');
    });
  });

  describe('육합 (Yukhap / Six Harmony)', () => {
    it('should detect yukhap relationship', () => {
      const result = analyzeBranchRelationships({
        ...baseInput,
        dayBranch: '子',
        ganzhiBranch: '丑',
      });

      expect(result.factorKeys).toContain('branchYukhap');
      expect(result.categories).toContain('love');
      expect(result.recommendations).toContain('love');
      expect(result.recommendations).toContain('meeting');
    });

    it('should set titleKey for yukhap when no existing title', () => {
      const result = analyzeBranchRelationships({
        ...baseInput,
        dayBranch: '卯',
        ganzhiBranch: '戌',
      });

      expect(result.titleKey).toBe('calendar.yukhap');
    });
  });

  describe('충 (Chung / Clash)', () => {
    it('should detect chung relationship', () => {
      const result = analyzeBranchRelationships({
        ...baseInput,
        dayBranch: '子',
        ganzhiBranch: '午',
      });

      expect(result.factorKeys).toContain('branchChung');
      expect(result.titleKey).toBe('calendar.chung');
      expect(result.warnings).toContain('avoidTravel');
      expect(result.warnings).toContain('conflict');
      expect(result.recommendations).toContain('careful');
      expect(result.filterScenarios).toContain('chung');
      expect(result.categories).toContain('travel');
      expect(result.categories).toContain('health');
    });
  });

  describe('형 (Xing / Punishment)', () => {
    it('should detect xing relationship', () => {
      const result = analyzeBranchRelationships({
        ...baseInput,
        dayBranch: '寅',
        ganzhiBranch: '巳',
      });

      expect(result.factorKeys).toContain('branchXing');
      expect(result.warnings).toContain('legal');
      expect(result.warnings).toContain('injury');
      expect(result.filterScenarios).toContain('xing');
    });
  });

  describe('해 (Hai / Harm)', () => {
    it('should detect hai relationship (子-未)', () => {
      const result = analyzeBranchRelationships({
        ...baseInput,
        dayBranch: '子',
        ganzhiBranch: '未',
      });

      expect(result.factorKeys).toContain('branchHai');
      expect(result.warnings).toContain('betrayal');
      expect(result.warnings).toContain('misunderstanding');
      expect(result.filterScenarios).toContain('hai');
    });

    it('should detect hai relationship (酉-戌)', () => {
      const result = analyzeBranchRelationships({
        ...baseInput,
        dayBranch: '酉',
        ganzhiBranch: '戌',
      });

      expect(result.factorKeys).toContain('branchHai');
    });
  });

  describe('no relationship', () => {
    it('should return empty results when no relationship found', () => {
      const result = analyzeBranchRelationships({
        ...baseInput,
        dayBranch: '子',
        ganzhiBranch: '辰',
        dayMasterElement: 'wood', // not metal (samhap group)
      });

      // 子-辰 is samhap metal, but dayMasterElement is wood
      // None of the other relationships match
      expect(result.warnings).not.toContain('avoidTravel');
      expect(result.filterScenarios).toEqual([]);
    });
  });

  describe('multiple relationships', () => {
    it('should detect multiple relationships simultaneously', () => {
      // 子-卯 has xing relationship AND yukhap check negative
      const result = analyzeBranchRelationships({
        ...baseInput,
        dayBranch: '子',
        ganzhiBranch: '卯',
      });

      expect(result.factorKeys).toContain('branchXing');
    });
  });

  describe('titleKey precedence', () => {
    it('should not override existing currentTitleKey for samhap', () => {
      const result = analyzeBranchRelationships({
        ...baseInput,
        dayBranch: '申',
        ganzhiBranch: '子',
        dayMasterElement: 'metal',
        currentTitleKey: 'existing.title',
      });

      expect(result.factorKeys).toContain('branchSamhap');
      expect(result.titleKey).toBeUndefined();
    });

    it('chung should always override titleKey', () => {
      const result = analyzeBranchRelationships({
        ...baseInput,
        dayBranch: '子',
        ganzhiBranch: '午',
        currentTitleKey: 'existing.title',
      });

      expect(result.titleKey).toBe('calendar.chung');
    });
  });
});
