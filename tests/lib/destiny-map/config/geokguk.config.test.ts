// tests/lib/destiny-map/config/geokguk.config.test.ts
import { describe, it, expect } from 'vitest';
import { GEOKGUK_PREFERENCES } from '@/lib/destiny-map/config/geokguk.config';

describe('GEOKGUK_PREFERENCES', () => {
  it('should have preferences for all major geokguk types', () => {
    expect(GEOKGUK_PREFERENCES).toHaveProperty('정관격');
    expect(GEOKGUK_PREFERENCES).toHaveProperty('편관격');
    expect(GEOKGUK_PREFERENCES).toHaveProperty('정인격');
    expect(GEOKGUK_PREFERENCES).toHaveProperty('식신격');
  });

  it('should have favor and avoid arrays for each geokguk', () => {
    Object.values(GEOKGUK_PREFERENCES).forEach(pref => {
      expect(pref).toHaveProperty('favor');
      expect(pref).toHaveProperty('avoid');
      expect(Array.isArray(pref.favor)).toBe(true);
      expect(Array.isArray(pref.avoid)).toBe(true);
    });
  });

  it('should not have overlapping favor and avoid', () => {
    Object.entries(GEOKGUK_PREFERENCES).forEach(([name, pref]) => {
      const overlap = pref.favor.filter(f => pref.avoid.includes(f));
      expect(overlap).toEqual([]);
    });
  });

  it('should include special geokguk types', () => {
    expect(GEOKGUK_PREFERENCES).toHaveProperty('종아격');
    expect(GEOKGUK_PREFERENCES).toHaveProperty('종재격');
    expect(GEOKGUK_PREFERENCES).toHaveProperty('양인격');
  });

  it('should have non-empty favor lists', () => {
    Object.values(GEOKGUK_PREFERENCES).forEach(pref => {
      expect(pref.favor.length).toBeGreaterThan(0);
    });
  });

  it('should have non-empty avoid lists', () => {
    Object.values(GEOKGUK_PREFERENCES).forEach(pref => {
      expect(pref.avoid.length).toBeGreaterThan(0);
    });
  });

  it('should have valid sibsin names', () => {
    const validSibsin = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인', '양인'];
    
    Object.values(GEOKGUK_PREFERENCES).forEach(pref => {
      pref.favor.forEach(s => {
        expect(validSibsin).toContain(s);
      });
      pref.avoid.forEach(s => {
        expect(validSibsin).toContain(s);
      });
    });
  });
});
