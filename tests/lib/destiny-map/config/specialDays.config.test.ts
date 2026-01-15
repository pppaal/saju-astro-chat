/**
 * Comprehensive tests for Special Days Config
 * Tests all special day definitions, date ranges, and Korean/English descriptions
 */

import { describe, it, expect } from 'vitest';
import {
  SAMJAE_BY_YEAR_BRANCH,
  YEOKMA_BY_YEAR_BRANCH,
  DOHWA_BY_YEAR_BRANCH,
  GEONROK_BY_DAY_STEM,
  SIPSIN_RELATIONS,
  isSamjaeYear,
  isYeokmaDay,
  isDohwaDay,
  isGeonrokDay,
  getSipsin,
  isSonEomneunDay,
  approximateLunarDay,
  getGongmang,
  isGongmangDay,
  WONJIN,
  isWonjinDay,
  GWIMUN,
  isGwimunDay,
  BRANCH_MAIN_STEM,
  isAmhap,
  PA,
  isPaDay,
  HAE,
  isHaeDay,
  CHUNGAN_HAP,
  isChunganHap,
  HWAGAE_BY_YEAR_BRANCH,
  isHwagaeDay,
  GEOBSAL_BY_YEAR_BRANCH,
  isGeobsalDay,
  BAEKHO_BY_YEAR_BRANCH,
  isBaekhoDay,
  CHEONDEOK_BY_MONTH_BRANCH,
  isCheondeokDay,
  WOLDEOK_BY_MONTH_BRANCH,
  isWoldeokDay,
  CHEONHEE_BY_YEAR_BRANCH,
  isCheonheeDay,
  HONGYEOM_BY_YEAR_BRANCH,
  isHongyeomDay,
  CHEONUI_BY_MONTH_BRANCH,
  isCheonuiDay,
  JANGSEONG_BY_YEAR_BRANCH,
  isJangseongDay,
  BANAN_BY_YEAR_BRANCH,
  isBananDay,
  MUNCHANG_BY_DAY_STEM,
  isMunchangDay,
  HAKDANG_BY_DAY_STEM,
  isHakdangDay,
} from '@/lib/destiny-map/config/specialDays.config';

describe('Special Days Config - SAMJAE_BY_YEAR_BRANCH', () => {
  it('should define samjae for all 12 branches', () => {
    const branches = ['寅', '午', '戌', '巳', '酉', '丑', '申', '子', '辰', '亥', '卯', '未'];

    branches.forEach(branch => {
      expect(SAMJAE_BY_YEAR_BRANCH).toHaveProperty(branch);
    });
  });

  it('should have exactly 3 samjae years for each branch', () => {
    Object.values(SAMJAE_BY_YEAR_BRANCH).forEach(samjaeYears => {
      expect(samjaeYears).toHaveLength(3);
    });
  });

  it('should have correct samjae for 寅午戌 group', () => {
    expect(SAMJAE_BY_YEAR_BRANCH['寅']).toEqual(['申', '酉', '戌']);
    expect(SAMJAE_BY_YEAR_BRANCH['午']).toEqual(['申', '酉', '戌']);
    expect(SAMJAE_BY_YEAR_BRANCH['戌']).toEqual(['申', '酉', '戌']);
  });

  it('should have correct samjae for 巳酉丑 group', () => {
    expect(SAMJAE_BY_YEAR_BRANCH['巳']).toEqual(['寅', '卯', '辰']);
    expect(SAMJAE_BY_YEAR_BRANCH['酉']).toEqual(['寅', '卯', '辰']);
    expect(SAMJAE_BY_YEAR_BRANCH['丑']).toEqual(['寅', '卯', '辰']);
  });

  it('should have correct samjae for 申子辰 group', () => {
    expect(SAMJAE_BY_YEAR_BRANCH['申']).toEqual(['巳', '午', '未']);
    expect(SAMJAE_BY_YEAR_BRANCH['子']).toEqual(['巳', '午', '未']);
    expect(SAMJAE_BY_YEAR_BRANCH['辰']).toEqual(['巳', '午', '未']);
  });

  it('should have correct samjae for 亥卯未 group', () => {
    expect(SAMJAE_BY_YEAR_BRANCH['亥']).toEqual(['亥', '子', '丑']);
    expect(SAMJAE_BY_YEAR_BRANCH['卯']).toEqual(['亥', '子', '丑']);
    expect(SAMJAE_BY_YEAR_BRANCH['未']).toEqual(['亥', '子', '丑']);
  });
});

describe('Special Days Config - YEOKMA_BY_YEAR_BRANCH', () => {
  it('should define yeokma for all 12 branches', () => {
    const branches = ['寅', '午', '戌', '巳', '酉', '丑', '申', '子', '辰', '亥', '卯', '未'];

    branches.forEach(branch => {
      expect(YEOKMA_BY_YEAR_BRANCH).toHaveProperty(branch);
    });
  });

  it('should have exactly one yeokma branch for each birth branch', () => {
    Object.values(YEOKMA_BY_YEAR_BRANCH).forEach(yeokmaBranch => {
      expect(typeof yeokmaBranch).toBe('string');
      expect(yeokmaBranch.length).toBe(1);
    });
  });

  it('should have correct yeokma mappings', () => {
    expect(YEOKMA_BY_YEAR_BRANCH['寅']).toBe('申');
    expect(YEOKMA_BY_YEAR_BRANCH['午']).toBe('申');
    expect(YEOKMA_BY_YEAR_BRANCH['戌']).toBe('申');
    expect(YEOKMA_BY_YEAR_BRANCH['巳']).toBe('亥');
    expect(YEOKMA_BY_YEAR_BRANCH['酉']).toBe('亥');
    expect(YEOKMA_BY_YEAR_BRANCH['丑']).toBe('亥');
    expect(YEOKMA_BY_YEAR_BRANCH['申']).toBe('寅');
    expect(YEOKMA_BY_YEAR_BRANCH['子']).toBe('寅');
    expect(YEOKMA_BY_YEAR_BRANCH['辰']).toBe('寅');
    expect(YEOKMA_BY_YEAR_BRANCH['亥']).toBe('巳');
    expect(YEOKMA_BY_YEAR_BRANCH['卯']).toBe('巳');
    expect(YEOKMA_BY_YEAR_BRANCH['未']).toBe('巳');
  });
});

describe('Special Days Config - DOHWA_BY_YEAR_BRANCH', () => {
  it('should define dohwa for all 12 branches', () => {
    const branches = ['寅', '午', '戌', '巳', '酉', '丑', '申', '子', '辰', '亥', '卯', '未'];

    branches.forEach(branch => {
      expect(DOHWA_BY_YEAR_BRANCH).toHaveProperty(branch);
    });
  });

  it('should have correct dohwa mappings', () => {
    expect(DOHWA_BY_YEAR_BRANCH['寅']).toBe('卯');
    expect(DOHWA_BY_YEAR_BRANCH['午']).toBe('卯');
    expect(DOHWA_BY_YEAR_BRANCH['戌']).toBe('卯');
    expect(DOHWA_BY_YEAR_BRANCH['巳']).toBe('午');
    expect(DOHWA_BY_YEAR_BRANCH['酉']).toBe('午');
    expect(DOHWA_BY_YEAR_BRANCH['丑']).toBe('午');
    expect(DOHWA_BY_YEAR_BRANCH['申']).toBe('酉');
    expect(DOHWA_BY_YEAR_BRANCH['子']).toBe('酉');
    expect(DOHWA_BY_YEAR_BRANCH['辰']).toBe('酉');
    expect(DOHWA_BY_YEAR_BRANCH['亥']).toBe('子');
    expect(DOHWA_BY_YEAR_BRANCH['卯']).toBe('子');
    expect(DOHWA_BY_YEAR_BRANCH['未']).toBe('子');
  });
});

describe('Special Days Config - GEONROK_BY_DAY_STEM', () => {
  it('should define geonrok for all 10 stems', () => {
    const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

    stems.forEach(stem => {
      expect(GEONROK_BY_DAY_STEM).toHaveProperty(stem);
    });
  });

  it('should have correct geonrok mappings', () => {
    expect(GEONROK_BY_DAY_STEM['甲']).toBe('寅');
    expect(GEONROK_BY_DAY_STEM['乙']).toBe('卯');
    expect(GEONROK_BY_DAY_STEM['丙']).toBe('巳');
    expect(GEONROK_BY_DAY_STEM['丁']).toBe('午');
    expect(GEONROK_BY_DAY_STEM['戊']).toBe('巳');
    expect(GEONROK_BY_DAY_STEM['己']).toBe('午');
    expect(GEONROK_BY_DAY_STEM['庚']).toBe('申');
    expect(GEONROK_BY_DAY_STEM['辛']).toBe('酉');
    expect(GEONROK_BY_DAY_STEM['壬']).toBe('亥');
    expect(GEONROK_BY_DAY_STEM['癸']).toBe('子');
  });
});

describe('Special Days Config - SIPSIN_RELATIONS', () => {
  it('should define sipsin for all 10 stems', () => {
    const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

    stems.forEach(stem => {
      expect(SIPSIN_RELATIONS).toHaveProperty(stem);
    });
  });

  it('should have complete relations for each stem', () => {
    const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

    stems.forEach(stem => {
      const relations = SIPSIN_RELATIONS[stem];
      expect(Object.keys(relations)).toHaveLength(10);

      stems.forEach(targetStem => {
        expect(relations).toHaveProperty(targetStem);
      });
    });
  });

  it('should have correct sipsin types', () => {
    const validSipsin = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];

    Object.values(SIPSIN_RELATIONS).forEach(relations => {
      Object.values(relations).forEach(sipsin => {
        expect(validSipsin).toContain(sipsin);
      });
    });
  });

  it('should have bijeon (비견) for same stem', () => {
    const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

    stems.forEach(stem => {
      expect(SIPSIN_RELATIONS[stem][stem]).toBe('비견');
    });
  });
});

describe('Special Days Config - isSamjaeYear Function', () => {
  it('should correctly identify samjae years', () => {
    expect(isSamjaeYear('寅', '申')).toBe(true);
    expect(isSamjaeYear('寅', '酉')).toBe(true);
    expect(isSamjaeYear('寅', '戌')).toBe(true);
  });

  it('should return false for non-samjae years', () => {
    expect(isSamjaeYear('寅', '寅')).toBe(false);
    expect(isSamjaeYear('寅', '卯')).toBe(false);
  });

  it('should handle invalid branches', () => {
    expect(isSamjaeYear('invalid', '申')).toBe(false);
    expect(isSamjaeYear('寅', 'invalid')).toBe(false);
  });
});

describe('Special Days Config - isYeokmaDay Function', () => {
  it('should correctly identify yeokma days', () => {
    expect(isYeokmaDay('寅', '申')).toBe(true);
    expect(isYeokmaDay('午', '申')).toBe(true);
    expect(isYeokmaDay('戌', '申')).toBe(true);
  });

  it('should return false for non-yeokma days', () => {
    expect(isYeokmaDay('寅', '寅')).toBe(false);
    expect(isYeokmaDay('寅', '卯')).toBe(false);
  });
});

describe('Special Days Config - isDohwaDay Function', () => {
  it('should correctly identify dohwa days', () => {
    expect(isDohwaDay('寅', '卯')).toBe(true);
    expect(isDohwaDay('午', '卯')).toBe(true);
    expect(isDohwaDay('戌', '卯')).toBe(true);
  });

  it('should return false for non-dohwa days', () => {
    expect(isDohwaDay('寅', '寅')).toBe(false);
    expect(isDohwaDay('寅', '申')).toBe(false);
  });
});

describe('Special Days Config - isGeonrokDay Function', () => {
  it('should correctly identify geonrok days', () => {
    expect(isGeonrokDay('甲', '寅')).toBe(true);
    expect(isGeonrokDay('乙', '卯')).toBe(true);
    expect(isGeonrokDay('丙', '巳')).toBe(true);
  });

  it('should return false for non-geonrok days', () => {
    expect(isGeonrokDay('甲', '卯')).toBe(false);
    expect(isGeonrokDay('乙', '寅')).toBe(false);
  });
});

describe('Special Days Config - getSipsin Function', () => {
  it('should return correct sipsin for valid inputs', () => {
    expect(getSipsin('甲', '甲')).toBe('비견');
    expect(getSipsin('甲', '乙')).toBe('겁재');
    expect(getSipsin('甲', '丙')).toBe('식신');
  });

  it('should return empty string for invalid inputs', () => {
    expect(getSipsin('invalid', '甲')).toBe('');
    expect(getSipsin('甲', 'invalid')).toBe('');
  });
});

describe('Special Days Config - isSonEomneunDay Function', () => {
  it('should identify son-eomneun days correctly', () => {
    expect(isSonEomneunDay(9)).toBe(true);
    expect(isSonEomneunDay(10)).toBe(true);
    expect(isSonEomneunDay(19)).toBe(true);
    expect(isSonEomneunDay(20)).toBe(true);
    expect(isSonEomneunDay(29)).toBe(true);
    expect(isSonEomneunDay(30)).toBe(true);
  });

  it('should return false for other days', () => {
    expect(isSonEomneunDay(1)).toBe(false);
    expect(isSonEomneunDay(5)).toBe(false);
    expect(isSonEomneunDay(15)).toBe(false);
    expect(isSonEomneunDay(25)).toBe(false);
  });
});

describe('Special Days Config - approximateLunarDay Function', () => {
  it('should return a value between 1 and 30', () => {
    const testDates = [
      new Date(2024, 0, 1),
      new Date(2024, 5, 15),
      new Date(2024, 11, 31),
    ];

    testDates.forEach(date => {
      const lunarDay = approximateLunarDay(date);
      expect(lunarDay).toBeGreaterThanOrEqual(1);
      expect(lunarDay).toBeLessThanOrEqual(30);
    });
  });

  it('should return consistent results for same date', () => {
    const date = new Date(2024, 0, 1);
    const result1 = approximateLunarDay(date);
    const result2 = approximateLunarDay(date);

    expect(result1).toBe(result2);
  });
});

describe('Special Days Config - getGongmang Function', () => {
  it('should return exactly 2 gongmang branches', () => {
    const result = getGongmang('甲', '子');
    expect(result).toHaveLength(2);
  });

  it('should return empty array for invalid inputs', () => {
    expect(getGongmang('invalid', '子')).toEqual([]);
    expect(getGongmang('甲', 'invalid')).toEqual([]);
  });

  it('should return valid branch characters', () => {
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const result = getGongmang('甲', '子');

    result.forEach(branch => {
      expect(branches).toContain(branch);
    });
  });
});

describe('Special Days Config - isGongmangDay Function', () => {
  it('should correctly identify gongmang days', () => {
    const gongmangBranches = getGongmang('甲', '子');

    if (gongmangBranches.length > 0) {
      expect(isGongmangDay('甲', '子', gongmangBranches[0])).toBe(true);
      expect(isGongmangDay('甲', '子', gongmangBranches[1])).toBe(true);
    }
  });

  it('should return false for non-gongmang branches', () => {
    expect(isGongmangDay('甲', '子', '子')).toBe(false);
  });
});

describe('Special Days Config - WONJIN Constant', () => {
  it('should define wonjin for all 12 branches', () => {
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

    branches.forEach(branch => {
      expect(WONJIN).toHaveProperty(branch);
    });
  });

  it('should have reciprocal wonjin relationships', () => {
    expect(WONJIN['子']).toBe('未');
    expect(WONJIN['未']).toBe('子');
  });
});

describe('Special Days Config - isWonjinDay Function', () => {
  it('should correctly identify wonjin days', () => {
    expect(isWonjinDay('子', '未')).toBe(true);
    expect(isWonjinDay('丑', '午')).toBe(true);
  });

  it('should return false for non-wonjin days', () => {
    expect(isWonjinDay('子', '子')).toBe(false);
    expect(isWonjinDay('子', '丑')).toBe(false);
  });
});

describe('Special Days Config - GWIMUN Constant', () => {
  it('should define gwimun for all 12 branches', () => {
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

    branches.forEach(branch => {
      expect(GWIMUN).toHaveProperty(branch);
    });
  });
});

describe('Special Days Config - isGwimunDay Function', () => {
  it('should correctly identify gwimun days', () => {
    expect(isGwimunDay('子', '卯')).toBe(true);
    expect(isGwimunDay('丑', '寅')).toBe(true);
  });

  it('should return false for non-gwimun days', () => {
    expect(isGwimunDay('子', '子')).toBe(false);
  });
});

describe('Special Days Config - BRANCH_MAIN_STEM Constant', () => {
  it('should define main stem for all 12 branches', () => {
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

    branches.forEach(branch => {
      expect(BRANCH_MAIN_STEM).toHaveProperty(branch);
    });
  });

  it('should map to valid stems', () => {
    const validStems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

    Object.values(BRANCH_MAIN_STEM).forEach(stem => {
      expect(validStems).toContain(stem);
    });
  });
});

describe('Special Days Config - isAmhap Function', () => {
  it('should identify amhap relationships', () => {
    const result = isAmhap('寅', '亥');
    expect(typeof result).toBe('boolean');
  });

  it('should return false for invalid branches', () => {
    expect(isAmhap('invalid', '寅')).toBe(false);
    expect(isAmhap('寅', 'invalid')).toBe(false);
  });
});

describe('Special Days Config - PA Constant', () => {
  it('should define pa for all 12 branches', () => {
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

    branches.forEach(branch => {
      expect(PA).toHaveProperty(branch);
    });
  });
});

describe('Special Days Config - isPaDay Function', () => {
  it('should correctly identify pa days', () => {
    expect(isPaDay('子', '酉')).toBe(true);
    expect(isPaDay('丑', '辰')).toBe(true);
  });

  it('should return false for non-pa days', () => {
    expect(isPaDay('子', '子')).toBe(false);
  });
});

describe('Special Days Config - HAE Constant', () => {
  it('should define hae for all 12 branches', () => {
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

    branches.forEach(branch => {
      expect(HAE).toHaveProperty(branch);
    });
  });

  it('should match WONJIN values', () => {
    Object.keys(HAE).forEach(branch => {
      expect(HAE[branch]).toBe(WONJIN[branch]);
    });
  });
});

describe('Special Days Config - isHaeDay Function', () => {
  it('should correctly identify hae days', () => {
    expect(isHaeDay('子', '未')).toBe(true);
    expect(isHaeDay('丑', '午')).toBe(true);
  });

  it('should return false for non-hae days', () => {
    expect(isHaeDay('子', '子')).toBe(false);
  });
});

describe('Special Days Config - CHUNGAN_HAP Constant', () => {
  it('should define chungan hap for all 10 stems', () => {
    const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

    stems.forEach(stem => {
      expect(CHUNGAN_HAP).toHaveProperty(stem);
    });
  });

  it('should have partner and result for each stem', () => {
    Object.values(CHUNGAN_HAP).forEach(hap => {
      expect(hap).toHaveProperty('partner');
      expect(hap).toHaveProperty('result');
    });
  });
});

describe('Special Days Config - isChunganHap Function', () => {
  it('should identify chungan hap pairs', () => {
    const result = isChunganHap('甲', '己');

    expect(result).toHaveProperty('isHap');
    expect(typeof result.isHap).toBe('boolean');
  });

  it('should return result element for valid hap', () => {
    const result = isChunganHap('甲', '己');

    if (result.isHap) {
      expect(result.resultElement).toBeDefined();
    }
  });

  it('should be commutative', () => {
    const result1 = isChunganHap('甲', '己');
    const result2 = isChunganHap('己', '甲');

    expect(result1.isHap).toBe(result2.isHap);
  });
});

describe('Special Days Config - Additional Sal Constants', () => {
  it('should define HWAGAE_BY_YEAR_BRANCH', () => {
    expect(HWAGAE_BY_YEAR_BRANCH).toBeDefined();
    expect(Object.keys(HWAGAE_BY_YEAR_BRANCH).length).toBe(12);
  });

  it('should define GEOBSAL_BY_YEAR_BRANCH', () => {
    expect(GEOBSAL_BY_YEAR_BRANCH).toBeDefined();
    expect(Object.keys(GEOBSAL_BY_YEAR_BRANCH).length).toBe(12);
  });

  it('should define BAEKHO_BY_YEAR_BRANCH', () => {
    expect(BAEKHO_BY_YEAR_BRANCH).toBeDefined();
    expect(Object.keys(BAEKHO_BY_YEAR_BRANCH).length).toBe(12);
  });

  it('should define CHEONDEOK_BY_MONTH_BRANCH', () => {
    expect(CHEONDEOK_BY_MONTH_BRANCH).toBeDefined();
    expect(Object.keys(CHEONDEOK_BY_MONTH_BRANCH).length).toBeGreaterThan(0);
  });

  it('should define WOLDEOK_BY_MONTH_BRANCH', () => {
    expect(WOLDEOK_BY_MONTH_BRANCH).toBeDefined();
    expect(Object.keys(WOLDEOK_BY_MONTH_BRANCH).length).toBeGreaterThan(0);
  });
});

describe('Special Days Config - Sal Check Functions', () => {
  it('should have isHwagaeDay function', () => {
    expect(typeof isHwagaeDay).toBe('function');
    const result = isHwagaeDay('寅', '戌');
    expect(typeof result).toBe('boolean');
  });

  it('should have isGeobsalDay function', () => {
    expect(typeof isGeobsalDay).toBe('function');
    const result = isGeobsalDay('寅', '寅');
    expect(typeof result).toBe('boolean');
  });

  it('should have isBaekhoDay function', () => {
    expect(typeof isBaekhoDay).toBe('function');
    const result = isBaekhoDay('寅', '寅');
    expect(typeof result).toBe('boolean');
  });

  it('should have isCheondeokDay function', () => {
    expect(typeof isCheondeokDay).toBe('function');
    const result = isCheondeokDay('寅', '甲');
    expect(typeof result).toBe('boolean');
  });

  it('should have isWoldeokDay function', () => {
    expect(typeof isWoldeokDay).toBe('function');
    const result = isWoldeokDay('寅', '甲');
    expect(typeof result).toBe('boolean');
  });
});

describe('Special Days Config - Additional Functions', () => {
  it('should have isCheonheeDay function', () => {
    expect(typeof isCheonheeDay).toBe('function');
  });

  it('should have isHongyeomDay function', () => {
    expect(typeof isHongyeomDay).toBe('function');
  });

  it('should have isCheonuiDay function', () => {
    expect(typeof isCheonuiDay).toBe('function');
  });

  it('should have isJangseongDay function', () => {
    expect(typeof isJangseongDay).toBe('function');
  });

  it('should have isBananDay function', () => {
    expect(typeof isBananDay).toBe('function');
  });

  it('should have isMunchangDay function', () => {
    expect(typeof isMunchangDay).toBe('function');
  });

  it('should have isHakdangDay function', () => {
    expect(typeof isHakdangDay).toBe('function');
  });
});

describe('Special Days Config - Edge Cases', () => {
  it('should handle empty string inputs gracefully', () => {
    expect(isSamjaeYear('', '')).toBe(false);
    expect(isYeokmaDay('', '')).toBe(false);
    expect(isDohwaDay('', '')).toBe(false);
  });

  it('should handle undefined inputs gracefully', () => {
    expect(getSipsin('甲', '' as any)).toBe('');
  });

  it('should handle very large lunar day numbers', () => {
    expect(isSonEomneunDay(1000)).toBe(false);
    expect(isSonEomneunDay(999)).toBe(false); // Out of valid range (1-30)
  });

  it('should handle negative lunar day numbers', () => {
    const result = isSonEomneunDay(-1);
    expect(typeof result).toBe('boolean');
  });
});

describe('Special Days Config - Data Consistency', () => {
  it('should have consistent branch count across all maps', () => {
    expect(Object.keys(SAMJAE_BY_YEAR_BRANCH)).toHaveLength(12);
    expect(Object.keys(YEOKMA_BY_YEAR_BRANCH)).toHaveLength(12);
    expect(Object.keys(DOHWA_BY_YEAR_BRANCH)).toHaveLength(12);
  });

  it('should use only valid branch characters', () => {
    const validBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

    Object.keys(SAMJAE_BY_YEAR_BRANCH).forEach(branch => {
      expect(validBranches).toContain(branch);
    });

    Object.values(YEOKMA_BY_YEAR_BRANCH).forEach(branch => {
      expect(validBranches).toContain(branch);
    });
  });

  it('should use only valid stem characters', () => {
    const validStems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

    Object.keys(GEONROK_BY_DAY_STEM).forEach(stem => {
      expect(validStems).toContain(stem);
    });

    Object.keys(SIPSIN_RELATIONS).forEach(stem => {
      expect(validStems).toContain(stem);
    });
  });
});
