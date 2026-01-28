/**
 * Tests for src/lib/destiny-map/calendar/utils/recommendation-filter.ts
 * 추천 필터링 유틸리티 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  filterOutRecommendations,
  filterByScenario,
  CONFLICT_SCENARIOS,
} from '@/lib/destiny-map/calendar/utils/recommendation-filter';

describe('recommendation-filter', () => {
  describe('filterOutRecommendations', () => {
    it('should remove matching recommendations', () => {
      const recs = ['travel', 'career', 'contract', 'study'];
      filterOutRecommendations(recs, {
        chung: ['travel', 'contract'],
      });
      expect(recs).toEqual(['career', 'study']);
    });

    it('should handle multiple conflict scenarios', () => {
      const recs = ['travel', 'contract', 'networking', 'study'];
      filterOutRecommendations(recs, {
        chung: ['travel'],
        xing: ['contract'],
        hai: ['networking'],
      });
      expect(recs).toEqual(['study']);
    });

    it('should not modify array when no conflicts', () => {
      const recs = ['career', 'study', 'meditation'];
      filterOutRecommendations(recs, {
        chung: ['travel', 'change'],
      });
      expect(recs).toEqual(['career', 'study', 'meditation']);
    });

    it('should handle empty recommendations', () => {
      const recs: string[] = [];
      filterOutRecommendations(recs, { chung: ['travel'] });
      expect(recs).toEqual([]);
    });

    it('should handle empty conflict scenarios', () => {
      const recs = ['travel', 'study'];
      filterOutRecommendations(recs, {});
      expect(recs).toEqual(['travel', 'study']);
    });

    it('should remove duplicates across scenarios', () => {
      const recs = ['contract', 'study'];
      filterOutRecommendations(recs, {
        xing: ['contract'],
        mercury: ['contract'],
      });
      expect(recs).toEqual(['study']);
    });
  });

  describe('CONFLICT_SCENARIOS', () => {
    it('should define gwansal conflicts', () => {
      expect(CONFLICT_SCENARIOS.gwansal).toContain('authority');
      expect(CONFLICT_SCENARIOS.gwansal).toContain('promotion');
      expect(CONFLICT_SCENARIOS.gwansal).toContain('interview');
    });

    it('should define chung conflicts', () => {
      expect(CONFLICT_SCENARIOS.chung).toContain('travel');
      expect(CONFLICT_SCENARIOS.chung).toContain('change');
    });

    it('should define xing conflicts', () => {
      expect(CONFLICT_SCENARIOS.xing).toContain('contract');
      expect(CONFLICT_SCENARIOS.xing).toContain('bigDecision');
      expect(CONFLICT_SCENARIOS.xing).toContain('partnership');
    });

    it('should define hai conflicts', () => {
      expect(CONFLICT_SCENARIOS.hai).toContain('networking');
      expect(CONFLICT_SCENARIOS.hai).toContain('socializing');
    });

    it('should define mercuryRetrograde conflicts', () => {
      expect(CONFLICT_SCENARIOS.mercuryRetrograde).toContain('contract');
      expect(CONFLICT_SCENARIOS.mercuryRetrograde).toContain('documents');
    });

    it('should define venusRetrograde conflicts', () => {
      expect(CONFLICT_SCENARIOS.venusRetrograde).toContain('dating');
      expect(CONFLICT_SCENARIOS.venusRetrograde).toContain('love');
      expect(CONFLICT_SCENARIOS.venusRetrograde).toContain('investment');
    });
  });

  describe('filterByScenario', () => {
    it('should filter by gwansal scenario', () => {
      const recs = ['authority', 'promotion', 'study', 'interview'];
      filterByScenario(recs, 'gwansal');
      expect(recs).toEqual(['study']);
    });

    it('should filter by chung scenario', () => {
      const recs = ['travel', 'change', 'meditation'];
      filterByScenario(recs, 'chung');
      expect(recs).toEqual(['meditation']);
    });

    it('should filter by mercuryRetrograde scenario', () => {
      const recs = ['contract', 'documents', 'interview', 'career'];
      filterByScenario(recs, 'mercuryRetrograde');
      expect(recs).toEqual(['career']);
    });

    it('should filter by venusRetrograde scenario', () => {
      const recs = ['dating', 'love', 'finance', 'investment', 'shopping', 'career'];
      filterByScenario(recs, 'venusRetrograde');
      expect(recs).toEqual(['career']);
    });

    it('should handle no matching items', () => {
      const recs = ['career', 'study'];
      filterByScenario(recs, 'gwansal');
      expect(recs).toEqual(['career', 'study']);
    });
  });
});
