import { describe, it, expect } from 'vitest';

import {
  extractSajuSynergy,
  extractAstroSynergy,
} from '@/lib/destiny-match/synergyHighlight';

describe('extractSajuSynergy', () => {
  it('returns null for missing input', () => {
    expect(extractSajuSynergy(null)).toBeNull();
    expect(extractSajuSynergy(undefined)).toBeNull();
  });

  it('prioritises 천간합 (stem-hap) over other harmonies', () => {
    const result = extractSajuSynergy({
      stemCompatibility: {
        score: 80,
        hapPairs: [{ stem1: '丁', stem2: '壬', result: '목으로 합화' }],
        chungPairs: [],
        analysis: '',
      },
      branchCompatibility: {
        score: 60,
        yukhapPairs: [{ branch1: '寅', branch2: '亥', result: '목' }],
        samhapGroups: [],
        chungPairs: [],
        hyeongPairs: [],
        haePairs: [],
        analysis: '',
      },
      // dayMasterRelation intentionally minimal
      dayMasterRelation: {
        person1DayMaster: '丙',
        person2DayMaster: '壬',
        relation: '편관',
        sibsin: '편관',
        reverseSibsin: '편관',
        dynamics: '긴장감 있는 관계',
        score: 50,
      },
    });

    expect(result).toEqual({
      kind: 'stem-hap',
      label: '정임합',
      chars: ['丁', '壬'],
      result: '목',
    });
  });

  it('falls back to 육합 when 천간합 is empty', () => {
    const result = extractSajuSynergy({
      stemCompatibility: {
        score: 50,
        hapPairs: [],
        chungPairs: [],
        analysis: '',
      },
      branchCompatibility: {
        score: 70,
        yukhapPairs: [{ branch1: '寅', branch2: '亥', result: '목' }],
        samhapGroups: [],
        chungPairs: [],
        hyeongPairs: [],
        haePairs: [],
        analysis: '',
      },
      dayMasterRelation: {
        person1DayMaster: '甲',
        person2DayMaster: '乙',
        relation: '비견',
        sibsin: '비견',
        reverseSibsin: '비견',
        dynamics: '',
        score: 50,
      },
    });

    expect(result?.kind).toBe('branch-yukhap');
    expect(result?.label).toBe('인해합');
    expect(result?.chars).toEqual(['寅', '亥']);
    expect(result?.result).toBe('목');
  });

  it('falls back to 삼합 when both 천간합 and 육합 empty', () => {
    const result = extractSajuSynergy({
      stemCompatibility: { score: 0, hapPairs: [], chungPairs: [], analysis: '' },
      branchCompatibility: {
        score: 70,
        yukhapPairs: [],
        samhapGroups: [{ branches: ['亥', '卯', '未'], result: '목' }],
        chungPairs: [],
        hyeongPairs: [],
        haePairs: [],
        analysis: '',
      },
      dayMasterRelation: {
        person1DayMaster: '甲',
        person2DayMaster: '乙',
        relation: '',
        sibsin: '비견',
        reverseSibsin: '비견',
        dynamics: '',
        score: 50,
      },
    });

    expect(result?.kind).toBe('branch-samhap');
    expect(result?.label).toBe('해묘미 삼합');
  });

  it('returns null when all fields empty (no day-master fallback w/o data)', () => {
    expect(
      extractSajuSynergy({
        stemCompatibility: { score: 0, hapPairs: [], chungPairs: [], analysis: '' },
        branchCompatibility: {
          score: 0,
          yukhapPairs: [],
          samhapGroups: [],
          chungPairs: [],
          hyeongPairs: [],
          haePairs: [],
          analysis: '',
        },
        // @ts-expect-error – simulating engine returning empty day master
        dayMasterRelation: {},
      }),
    ).toBeNull();
  });
});

describe('extractAstroSynergy', () => {
  it('detects Trine between signs 4 apart', () => {
    expect(extractAstroSynergy('Aries', 'Leo')).toMatchObject({
      kind: 'trine',
      label: 'Trine',
      angle: 120,
      harmony: 'harmonious',
    });
  });

  it('detects Opposition between signs 6 apart', () => {
    expect(extractAstroSynergy('Aries', 'Libra')).toMatchObject({
      kind: 'opposition',
      angle: 180,
      harmony: 'challenging',
    });
  });

  it('detects Sextile (60°) and Square (90°)', () => {
    expect(extractAstroSynergy('Aries', 'Gemini')?.kind).toBe('sextile');
    expect(extractAstroSynergy('Aries', 'Cancer')?.kind).toBe('square');
  });

  it('detects Conjunction for same sign', () => {
    expect(extractAstroSynergy('Leo', 'Leo')).toMatchObject({
      kind: 'conjunction',
      angle: 0,
      harmony: 'neutral',
    });
  });

  it('returns null for non-major aspects (5 signs apart)', () => {
    expect(extractAstroSynergy('Aries', 'Virgo')).toBeNull();
  });

  it('returns null for unknown signs', () => {
    expect(extractAstroSynergy('Foo', 'Aries')).toBeNull();
    expect(extractAstroSynergy(null, 'Aries')).toBeNull();
    expect(extractAstroSynergy('Aries', undefined)).toBeNull();
  });

  it('is symmetric across sign order', () => {
    expect(extractAstroSynergy('Aries', 'Leo')?.kind).toBe(
      extractAstroSynergy('Leo', 'Aries')?.kind,
    );
  });
});
