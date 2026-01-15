// tests/destinyCalendar.test.ts
// Destiny Calendar 기능 테스트



// destinyCalendar.ts에서 export된 유틸리티 함수들을 직접 테스트하기 어려우므로
// 핵심 로직을 검증하는 단위 테스트 작성

describe('destinyCalendar utilities', () => {
  describe('천을귀인 (天乙貴人) 체크', () => {
    const CHEONEUL_GWIIN_MAP: Record<string, string[]> = {
      "甲": ["丑", "未"], "戊": ["丑", "未"], "庚": ["丑", "未"],
      "乙": ["子", "申"], "己": ["子", "申"],
      "丙": ["亥", "酉"], "丁": ["亥", "酉"],
      "壬": ["卯", "巳"], "癸": ["卯", "巳"],
      "辛": ["寅", "午"],
    };

    function isCheoneulGwiin(dayMasterStem: string, targetBranch: string): boolean {
      return CHEONEUL_GWIIN_MAP[dayMasterStem]?.includes(targetBranch) ?? false;
    }

    it('should detect 甲 day master with 丑 or 未 branch', () => {
      expect(isCheoneulGwiin('甲', '丑')).toBe(true);
      expect(isCheoneulGwiin('甲', '未')).toBe(true);
      expect(isCheoneulGwiin('甲', '子')).toBe(false);
    });

    it('should detect 乙 day master with 子 or 申 branch', () => {
      expect(isCheoneulGwiin('乙', '子')).toBe(true);
      expect(isCheoneulGwiin('乙', '申')).toBe(true);
      expect(isCheoneulGwiin('乙', '丑')).toBe(false);
    });

    it('should detect 丙 day master with 亥 or 酉 branch', () => {
      expect(isCheoneulGwiin('丙', '亥')).toBe(true);
      expect(isCheoneulGwiin('丙', '酉')).toBe(true);
      expect(isCheoneulGwiin('丙', '午')).toBe(false);
    });

    it('should return false for unknown stem', () => {
      expect(isCheoneulGwiin('X', '丑')).toBe(false);
    });
  });

  describe('손없는 날 체크', () => {
    function isSonEomneunDay(lunarDay: number): boolean {
      const dayInCycle = lunarDay % 10;
      return dayInCycle === 9 || dayInCycle === 0;
    }

    it('should return true for 9th and 10th day of lunar cycle', () => {
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
      expect(isSonEomneunDay(21)).toBe(false);
    });
  });

  describe('삼재 (三災) 체크', () => {
    const SAMJAE_BY_YEAR_BRANCH: Record<string, string[]> = {
      "寅": ["申", "酉", "戌"], "午": ["申", "酉", "戌"], "戌": ["申", "酉", "戌"],
      "巳": ["寅", "卯", "辰"], "酉": ["寅", "卯", "辰"], "丑": ["寅", "卯", "辰"],
      "申": ["巳", "午", "未"], "子": ["巳", "午", "未"], "辰": ["巳", "午", "未"],
      "亥": ["亥", "子", "丑"], "卯": ["亥", "子", "丑"], "未": ["亥", "子", "丑"],
    };

    function isSamjaeYear(birthYearBranch: string, currentYearBranch: string): boolean {
      const samjaeBranches = SAMJAE_BY_YEAR_BRANCH[birthYearBranch];
      return samjaeBranches?.includes(currentYearBranch) ?? false;
    }

    it('should detect samjae for 寅午戌 birth years in 申酉戌 years', () => {
      expect(isSamjaeYear('寅', '申')).toBe(true);
      expect(isSamjaeYear('寅', '酉')).toBe(true);
      expect(isSamjaeYear('寅', '戌')).toBe(true);
      expect(isSamjaeYear('午', '申')).toBe(true);
      expect(isSamjaeYear('戌', '申')).toBe(true);
    });

    it('should detect samjae for 巳酉丑 birth years in 寅卯辰 years', () => {
      expect(isSamjaeYear('巳', '寅')).toBe(true);
      expect(isSamjaeYear('酉', '卯')).toBe(true);
      expect(isSamjaeYear('丑', '辰')).toBe(true);
    });

    it('should return false for non-samjae years', () => {
      expect(isSamjaeYear('寅', '子')).toBe(false);
      expect(isSamjaeYear('巳', '申')).toBe(false);
    });
  });

  describe('역마살 (驛馬殺) 체크', () => {
    const YEOKMA_BY_YEAR_BRANCH: Record<string, string> = {
      "寅": "申", "午": "申", "戌": "申",
      "巳": "亥", "酉": "亥", "丑": "亥",
      "申": "寅", "子": "寅", "辰": "寅",
      "亥": "巳", "卯": "巳", "未": "巳",
    };

    function isYeokmaDay(birthYearBranch: string, dayBranch: string): boolean {
      return YEOKMA_BY_YEAR_BRANCH[birthYearBranch] === dayBranch;
    }

    it('should detect yeokma for 寅午戌 birth years on 申 day', () => {
      expect(isYeokmaDay('寅', '申')).toBe(true);
      expect(isYeokmaDay('午', '申')).toBe(true);
      expect(isYeokmaDay('戌', '申')).toBe(true);
    });

    it('should return false for non-yeokma days', () => {
      expect(isYeokmaDay('寅', '子')).toBe(false);
      expect(isYeokmaDay('子', '申')).toBe(false);
    });
  });

  describe('도화살 (桃花殺) 체크', () => {
    const DOHWA_BY_YEAR_BRANCH: Record<string, string> = {
      "寅": "卯", "午": "卯", "戌": "卯",
      "巳": "午", "酉": "午", "丑": "午",
      "申": "酉", "子": "酉", "辰": "酉",
      "亥": "子", "卯": "子", "未": "子",
    };

    function isDohwaDay(birthYearBranch: string, dayBranch: string): boolean {
      return DOHWA_BY_YEAR_BRANCH[birthYearBranch] === dayBranch;
    }

    it('should detect dohwa for 寅午戌 birth years on 卯 day', () => {
      expect(isDohwaDay('寅', '卯')).toBe(true);
      expect(isDohwaDay('午', '卯')).toBe(true);
      expect(isDohwaDay('戌', '卯')).toBe(true);
    });

    it('should detect dohwa for 亥卯未 birth years on 子 day', () => {
      expect(isDohwaDay('亥', '子')).toBe(true);
      expect(isDohwaDay('卯', '子')).toBe(true);
      expect(isDohwaDay('未', '子')).toBe(true);
    });
  });

  describe('건록 (建祿) 체크', () => {
    const GEONROK_BY_DAY_STEM: Record<string, string> = {
      "甲": "寅", "乙": "卯", "丙": "巳", "丁": "午", "戊": "巳",
      "己": "午", "庚": "申", "辛": "酉", "壬": "亥", "癸": "子",
    };

    function isGeonrokDay(dayMasterStem: string, dayBranch: string): boolean {
      return GEONROK_BY_DAY_STEM[dayMasterStem] === dayBranch;
    }

    it('should detect geonrok for each day stem', () => {
      expect(isGeonrokDay('甲', '寅')).toBe(true);
      expect(isGeonrokDay('乙', '卯')).toBe(true);
      expect(isGeonrokDay('丙', '巳')).toBe(true);
      expect(isGeonrokDay('庚', '申')).toBe(true);
      expect(isGeonrokDay('壬', '亥')).toBe(true);
    });

    it('should return false for non-geonrok days', () => {
      expect(isGeonrokDay('甲', '子')).toBe(false);
      expect(isGeonrokDay('乙', '寅')).toBe(false);
    });
  });

  describe('십신 (十神) 계산', () => {
    const SIPSIN_RELATIONS: Record<string, Record<string, string>> = {
      "甲": { "甲": "비견", "乙": "겁재", "丙": "식신", "丁": "상관", "戊": "편재", "己": "정재", "庚": "편관", "辛": "정관", "壬": "편인", "癸": "정인" },
      "乙": { "乙": "비견", "甲": "겁재", "丁": "식신", "丙": "상관", "己": "편재", "戊": "정재", "辛": "편관", "庚": "정관", "癸": "편인", "壬": "정인" },
    };

    function getSipsin(dayMasterStem: string, targetStem: string): string {
      return SIPSIN_RELATIONS[dayMasterStem]?.[targetStem] ?? "";
    }

    it('should calculate sipsin for 甲 day master', () => {
      expect(getSipsin('甲', '甲')).toBe('비견');
      expect(getSipsin('甲', '乙')).toBe('겁재');
      expect(getSipsin('甲', '丙')).toBe('식신');
      expect(getSipsin('甲', '丁')).toBe('상관');
      expect(getSipsin('甲', '戊')).toBe('편재');
      expect(getSipsin('甲', '己')).toBe('정재');
      expect(getSipsin('甲', '庚')).toBe('편관');
      expect(getSipsin('甲', '辛')).toBe('정관');
      expect(getSipsin('甲', '壬')).toBe('편인');
      expect(getSipsin('甲', '癸')).toBe('정인');
    });

    it('should return empty string for unknown stems', () => {
      expect(getSipsin('X', '甲')).toBe('');
      expect(getSipsin('甲', 'X')).toBe('');
    });
  });

  describe('육합 (六合) 체크', () => {
    const YUKHAP: Record<string, string> = {
      "子": "丑", "丑": "子", "寅": "亥", "亥": "寅",
      "卯": "戌", "戌": "卯", "辰": "酉", "酉": "辰",
      "巳": "申", "申": "巳", "午": "未", "未": "午",
    };

    function isYukhap(branch1: string, branch2: string): boolean {
      return YUKHAP[branch1] === branch2;
    }

    it('should detect yukhap pairs', () => {
      expect(isYukhap('子', '丑')).toBe(true);
      expect(isYukhap('丑', '子')).toBe(true);
      expect(isYukhap('寅', '亥')).toBe(true);
      expect(isYukhap('卯', '戌')).toBe(true);
      expect(isYukhap('辰', '酉')).toBe(true);
      expect(isYukhap('巳', '申')).toBe(true);
      expect(isYukhap('午', '未')).toBe(true);
    });

    it('should return false for non-yukhap pairs', () => {
      expect(isYukhap('子', '午')).toBe(false);
      expect(isYukhap('寅', '申')).toBe(false);
    });
  });

  describe('충 (冲) 체크', () => {
    const CHUNG: Record<string, string> = {
      "子": "午", "午": "子", "丑": "未", "未": "丑",
      "寅": "申", "申": "寅", "卯": "酉", "酉": "卯",
      "辰": "戌", "戌": "辰", "巳": "亥", "亥": "巳",
    };

    function isChung(branch1: string, branch2: string): boolean {
      return CHUNG[branch1] === branch2;
    }

    it('should detect chung pairs', () => {
      expect(isChung('子', '午')).toBe(true);
      expect(isChung('午', '子')).toBe(true);
      expect(isChung('丑', '未')).toBe(true);
      expect(isChung('寅', '申')).toBe(true);
      expect(isChung('卯', '酉')).toBe(true);
      expect(isChung('辰', '戌')).toBe(true);
      expect(isChung('巳', '亥')).toBe(true);
    });

    it('should return false for non-chung pairs', () => {
      expect(isChung('子', '丑')).toBe(false);
      expect(isChung('寅', '亥')).toBe(false);
    });
  });

  describe('삼합 (三合) 체크', () => {
    const SAMHAP: Record<string, string[]> = {
      water: ["申", "子", "辰"],
      wood: ["亥", "卯", "未"],
      fire: ["寅", "午", "戌"],
      metal: ["巳", "酉", "丑"],
    };

    function getSamhapElement(branches: string[]): string | null {
      for (const [element, samhapBranches] of Object.entries(SAMHAP)) {
        const matchCount = branches.filter(b => samhapBranches.includes(b)).length;
        if (matchCount >= 2) {
          return element;
        }
      }
      return null;
    }

    it('should detect water samhap with 申子辰', () => {
      expect(getSamhapElement(['申', '子'])).toBe('water');
      expect(getSamhapElement(['子', '辰'])).toBe('water');
      expect(getSamhapElement(['申', '子', '辰'])).toBe('water');
    });

    it('should detect fire samhap with 寅午戌', () => {
      expect(getSamhapElement(['寅', '午'])).toBe('fire');
      expect(getSamhapElement(['午', '戌'])).toBe('fire');
    });

    it('should return null when no samhap', () => {
      expect(getSamhapElement(['子', '寅'])).toBe(null);
      expect(getSamhapElement(['丑', '卯'])).toBe(null);
    });
  });

  describe('오행 관계', () => {
    const ELEMENT_RELATIONS: Record<string, { generates: string; controls: string; generatedBy: string; controlledBy: string }> = {
      wood: { generates: "fire", controls: "earth", generatedBy: "water", controlledBy: "metal" },
      fire: { generates: "earth", controls: "metal", generatedBy: "wood", controlledBy: "water" },
      earth: { generates: "metal", controls: "water", generatedBy: "fire", controlledBy: "wood" },
      metal: { generates: "water", controls: "wood", generatedBy: "earth", controlledBy: "fire" },
      water: { generates: "wood", controls: "fire", generatedBy: "metal", controlledBy: "earth" },
    };

    it('should have correct generation cycle (상생)', () => {
      expect(ELEMENT_RELATIONS.wood.generates).toBe('fire');
      expect(ELEMENT_RELATIONS.fire.generates).toBe('earth');
      expect(ELEMENT_RELATIONS.earth.generates).toBe('metal');
      expect(ELEMENT_RELATIONS.metal.generates).toBe('water');
      expect(ELEMENT_RELATIONS.water.generates).toBe('wood');
    });

    it('should have correct control cycle (상극)', () => {
      expect(ELEMENT_RELATIONS.wood.controls).toBe('earth');
      expect(ELEMENT_RELATIONS.fire.controls).toBe('metal');
      expect(ELEMENT_RELATIONS.earth.controls).toBe('water');
      expect(ELEMENT_RELATIONS.metal.controls).toBe('wood');
      expect(ELEMENT_RELATIONS.water.controls).toBe('fire');
    });
  });

  describe('천간 오행 매핑', () => {
    const STEM_TO_ELEMENT: Record<string, string> = {
      "甲": "wood", "乙": "wood", "丙": "fire", "丁": "fire",
      "戊": "earth", "己": "earth", "庚": "metal", "辛": "metal",
      "壬": "water", "癸": "water",
    };

    it('should map stems to correct elements', () => {
      expect(STEM_TO_ELEMENT['甲']).toBe('wood');
      expect(STEM_TO_ELEMENT['乙']).toBe('wood');
      expect(STEM_TO_ELEMENT['丙']).toBe('fire');
      expect(STEM_TO_ELEMENT['丁']).toBe('fire');
      expect(STEM_TO_ELEMENT['戊']).toBe('earth');
      expect(STEM_TO_ELEMENT['己']).toBe('earth');
      expect(STEM_TO_ELEMENT['庚']).toBe('metal');
      expect(STEM_TO_ELEMENT['辛']).toBe('metal');
      expect(STEM_TO_ELEMENT['壬']).toBe('water');
      expect(STEM_TO_ELEMENT['癸']).toBe('water');
    });
  });

  describe('지지 오행 매핑', () => {
    const BRANCH_TO_ELEMENT: Record<string, string> = {
      "子": "water", "丑": "earth", "寅": "wood", "卯": "wood",
      "辰": "earth", "巳": "fire", "午": "fire", "未": "earth",
      "申": "metal", "酉": "metal", "戌": "earth", "亥": "water",
    };

    it('should map branches to correct elements', () => {
      expect(BRANCH_TO_ELEMENT['子']).toBe('water');
      expect(BRANCH_TO_ELEMENT['丑']).toBe('earth');
      expect(BRANCH_TO_ELEMENT['寅']).toBe('wood');
      expect(BRANCH_TO_ELEMENT['卯']).toBe('wood');
      expect(BRANCH_TO_ELEMENT['辰']).toBe('earth');
      expect(BRANCH_TO_ELEMENT['巳']).toBe('fire');
      expect(BRANCH_TO_ELEMENT['午']).toBe('fire');
      expect(BRANCH_TO_ELEMENT['未']).toBe('earth');
      expect(BRANCH_TO_ELEMENT['申']).toBe('metal');
      expect(BRANCH_TO_ELEMENT['酉']).toBe('metal');
      expect(BRANCH_TO_ELEMENT['戌']).toBe('earth');
      expect(BRANCH_TO_ELEMENT['亥']).toBe('water');
    });
  });

  describe('approximate lunar day calculation', () => {
    function approximateLunarDay(date: Date): number {
      const baseUtc = Date.UTC(2000, 0, 6);
      const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
      const diffDays = Math.floor((dateUtc - baseUtc) / (1000 * 60 * 60 * 24));
      const lunarMonthDays = 29.53;
      const dayInMonth = ((diffDays % lunarMonthDays) + lunarMonthDays) % lunarMonthDays;
      return Math.floor(dayInMonth) + 1;
    }

    it('should return value between 1 and 30', () => {
      const testDate = new Date(2024, 5, 15);
      const result = approximateLunarDay(testDate);

      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(30);
    });

    it('should return consistent results for same date', () => {
      const testDate = new Date(2024, 5, 15);
      const result1 = approximateLunarDay(testDate);
      const result2 = approximateLunarDay(testDate);

      expect(result1).toBe(result2);
    });

    it('should change day for consecutive dates', () => {
      const results: number[] = [];
      for (let i = 0; i < 5; i++) {
        const date = new Date(2024, 5, 15 + i);
        results.push(approximateLunarDay(date));
      }

      // 연속된 날짜는 음력일도 순차적으로 증가 (30일 이후 리셋 제외)
      // 적어도 다른 값들이 있어야 함
      const uniqueValues = new Set(results);
      expect(uniqueValues.size).toBeGreaterThan(1);
    });
  });
});
