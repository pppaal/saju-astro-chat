/**
 * Tests for src/lib/destiny-map/calendar/utils/shinsal-mapper.ts
 * 신살 매핑 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  mapShinsal,
  processShinsals,
  getShinsalType,
} from '@/lib/destiny-map/calendar/utils/shinsal-mapper';

describe('shinsal-mapper', () => {
  describe('mapShinsal', () => {
    describe('lucky shinsals (길신)', () => {
      it('should map 태극귀인', () => {
        const result = mapShinsal('태극귀인');
        expect(result).not.toBeNull();
        expect(result!.factorKey).toBe('shinsal_taegukGwiin');
        expect(result!.recommendations).toContain('majorLuck');
        expect(result!.warnings).toEqual([]);
      });

      it('should map 천덕귀인', () => {
        const result = mapShinsal('천덕귀인');
        expect(result!.factorKey).toBe('shinsal_cheondeokGwiin');
        expect(result!.recommendations).toContain('heavenlyHelp');
      });

      it('should map 천덕 (alias)', () => {
        const result = mapShinsal('천덕');
        expect(result!.factorKey).toBe('shinsal_cheondeokGwiin');
      });

      it('should map 월덕귀인', () => {
        const result = mapShinsal('월덕귀인');
        expect(result!.factorKey).toBe('shinsal_woldeokGwiin');
        expect(result!.recommendations).toContain('lunarBlessing');
      });

      it('should map 월덕 (alias)', () => {
        const result = mapShinsal('월덕');
        expect(result!.factorKey).toBe('shinsal_woldeokGwiin');
      });

      it('should map 화개', () => {
        const result = mapShinsal('화개');
        expect(result!.factorKey).toBe('shinsal_hwagae');
        expect(result!.recommendations).toContain('creativity');
        expect(result!.recommendations).toContain('spiritual');
      });
    });

    describe('unlucky shinsals (흉신)', () => {
      it('should map 공망', () => {
        const result = mapShinsal('공망');
        expect(result!.factorKey).toBe('shinsal_gongmang');
        expect(result!.warnings).toContain('emptiness');
        expect(result!.recommendations).toEqual([]);
      });

      it('should map 원진', () => {
        const result = mapShinsal('원진');
        expect(result!.warnings).toContain('resentment');
        expect(result!.warnings).toContain('conflict');
      });

      it('should map 양인', () => {
        const result = mapShinsal('양인');
        expect(result!.warnings).toContain('danger');
      });

      it('should map 괴강', () => {
        const result = mapShinsal('괴강');
        expect(result!.warnings).toContain('extremes');
      });

      it('should map 백호', () => {
        const result = mapShinsal('백호');
        expect(result!.warnings).toContain('accident');
        expect(result!.warnings).toContain('surgery');
      });

      it('should map 귀문관', () => {
        const result = mapShinsal('귀문관');
        expect(result!.warnings).toContain('mentalConfusion');
      });
    });

    describe('special shinsals (특수)', () => {
      it('should map 역마', () => {
        const result = mapShinsal('역마');
        expect(result!.factorKey).toBe('shinsal_yeokma');
        expect(result!.recommendations).toContain('travel');
        expect(result!.recommendations).toContain('movement');
      });

      it('should map 재살', () => {
        const result = mapShinsal('재살');
        expect(result!.factorKey).toBe('shinsal_jaesal');
        expect(result!.warnings).toContain('dispute');
      });
    });

    it('should return null for unknown shinsal', () => {
      expect(mapShinsal('알수없는신살')).toBeNull();
      expect(mapShinsal('')).toBeNull();
    });
  });

  describe('processShinsals', () => {
    it('should aggregate multiple shinsal effects', () => {
      const result = processShinsals([
        { name: '태극귀인' },
        { name: '공망' },
        { name: '역마' },
      ]);

      expect(result.factorKeys).toHaveLength(3);
      expect(result.factorKeys).toContain('shinsal_taegukGwiin');
      expect(result.factorKeys).toContain('shinsal_gongmang');
      expect(result.factorKeys).toContain('shinsal_yeokma');

      expect(result.recommendations).toContain('majorLuck');
      expect(result.recommendations).toContain('travel');
      expect(result.warnings).toContain('emptiness');
    });

    it('should handle empty array', () => {
      const result = processShinsals([]);
      expect(result.factorKeys).toEqual([]);
      expect(result.recommendations).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('should skip unknown shinsals', () => {
      const result = processShinsals([
        { name: '태극귀인' },
        { name: '알수없는' },
      ]);

      expect(result.factorKeys).toHaveLength(1);
      expect(result.factorKeys).toContain('shinsal_taegukGwiin');
    });

    it('should aggregate all recommendations and warnings', () => {
      const result = processShinsals([
        { name: '천덕귀인' },
        { name: '월덕귀인' },
      ]);

      expect(result.recommendations).toContain('heavenlyHelp');
      expect(result.recommendations).toContain('protection');
      expect(result.recommendations).toContain('lunarBlessing');
      expect(result.recommendations).toContain('assistance');
    });
  });

  describe('getShinsalType', () => {
    it('should return lucky for lucky shinsals', () => {
      expect(getShinsalType('태극귀인')).toBe('lucky');
      expect(getShinsalType('천덕귀인')).toBe('lucky');
      expect(getShinsalType('월덕귀인')).toBe('lucky');
      expect(getShinsalType('화개')).toBe('lucky');
    });

    it('should return unlucky for unlucky shinsals', () => {
      expect(getShinsalType('공망')).toBe('unlucky');
      expect(getShinsalType('원진')).toBe('unlucky');
      expect(getShinsalType('양인')).toBe('unlucky');
      expect(getShinsalType('백호')).toBe('unlucky');
    });

    it('should return special for special shinsals', () => {
      expect(getShinsalType('역마')).toBe('special');
      expect(getShinsalType('재살')).toBe('special');
    });

    it('should return null for unknown shinsal', () => {
      expect(getShinsalType('없는신살')).toBeNull();
    });
  });
});
