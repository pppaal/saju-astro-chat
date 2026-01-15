/**
 * Saju stemBranchUtils 테스트
 * - 천간/지지 정규화
 * - 오행/음양 조회
 * - 인덱스 조회 및 변환
 * - 유효성 검증
 */


import {
  normalizeStem,
  normalizeBranch,
  getStemInfo,
  getBranchInfo,
  getStemElement,
  getBranchElement,
  getStemYinYang,
  getBranchYinYang,
  isValidStem,
  isValidBranch,
  getStemIndex,
  getBranchIndex,
  getStemByIndex,
  getBranchByIndex,
} from "@/lib/Saju/stemBranchUtils";

describe("normalizeStem", () => {
  it("converts Korean stem to Chinese character", () => {
    expect(normalizeStem("갑")).toBe("甲");
    expect(normalizeStem("을")).toBe("乙");
    expect(normalizeStem("병")).toBe("丙");
    expect(normalizeStem("정")).toBe("丁");
    expect(normalizeStem("무")).toBe("戊");
    expect(normalizeStem("기")).toBe("己");
    expect(normalizeStem("경")).toBe("庚");
    expect(normalizeStem("신")).toBe("辛");
    expect(normalizeStem("임")).toBe("壬");
    expect(normalizeStem("계")).toBe("癸");
  });

  it("returns Chinese character unchanged", () => {
    expect(normalizeStem("甲")).toBe("甲");
    expect(normalizeStem("乙")).toBe("乙");
    expect(normalizeStem("丙")).toBe("丙");
  });

  it("handles empty string", () => {
    expect(normalizeStem("")).toBe("");
  });

  it("handles null/undefined", () => {
    expect(normalizeStem(null as unknown as string)).toBe("");
    expect(normalizeStem(undefined as unknown as string)).toBe("");
  });

  it("trims whitespace", () => {
    expect(normalizeStem("  갑  ")).toBe("甲");
    expect(normalizeStem("  甲  ")).toBe("甲");
  });

  it("returns unknown values unchanged", () => {
    expect(normalizeStem("xyz")).toBe("xyz");
    expect(normalizeStem("가")).toBe("가");
  });
});

describe("normalizeBranch", () => {
  it("converts Korean branch to Chinese character", () => {
    expect(normalizeBranch("자")).toBe("子");
    expect(normalizeBranch("축")).toBe("丑");
    expect(normalizeBranch("인")).toBe("寅");
    expect(normalizeBranch("묘")).toBe("卯");
    expect(normalizeBranch("진")).toBe("辰");
    expect(normalizeBranch("사")).toBe("巳");
    expect(normalizeBranch("오")).toBe("午");
    expect(normalizeBranch("미")).toBe("未");
    expect(normalizeBranch("신")).toBe("申");
    expect(normalizeBranch("유")).toBe("酉");
    expect(normalizeBranch("술")).toBe("戌");
    expect(normalizeBranch("해")).toBe("亥");
  });

  it("returns Chinese character unchanged", () => {
    expect(normalizeBranch("子")).toBe("子");
    expect(normalizeBranch("丑")).toBe("丑");
    expect(normalizeBranch("寅")).toBe("寅");
  });

  it("handles empty string", () => {
    expect(normalizeBranch("")).toBe("");
  });

  it("handles null/undefined", () => {
    expect(normalizeBranch(null as unknown as string)).toBe("");
    expect(normalizeBranch(undefined as unknown as string)).toBe("");
  });

  it("trims whitespace", () => {
    expect(normalizeBranch("  자  ")).toBe("子");
  });
});

describe("getStemInfo", () => {
  it("returns info for valid Chinese stem", () => {
    const info = getStemInfo("甲");
    expect(info).toBeDefined();
    expect(info?.name).toBe("甲");
    expect(info?.element).toBe("목");
    expect(info?.yin_yang).toBe("양");
  });

  it("returns info for Korean stem", () => {
    const info = getStemInfo("갑");
    expect(info).toBeDefined();
    expect(info?.name).toBe("甲");
  });

  it("returns undefined for invalid stem", () => {
    expect(getStemInfo("xyz")).toBeUndefined();
    expect(getStemInfo("")).toBeUndefined();
  });

  it("returns correct info for all stems", () => {
    const stems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
    stems.forEach((stem) => {
      const info = getStemInfo(stem);
      expect(info).toBeDefined();
      expect(info?.name).toBe(stem);
    });
  });
});

describe("getBranchInfo", () => {
  it("returns info for valid Chinese branch", () => {
    const info = getBranchInfo("子");
    expect(info).toBeDefined();
    expect(info?.name).toBe("子");
    expect(info?.element).toBe("수");
    expect(info?.yin_yang).toBe("양");
  });

  it("returns info for Korean branch", () => {
    const info = getBranchInfo("자");
    expect(info).toBeDefined();
    expect(info?.name).toBe("子");
  });

  it("returns undefined for invalid branch", () => {
    expect(getBranchInfo("xyz")).toBeUndefined();
    expect(getBranchInfo("")).toBeUndefined();
  });

  it("returns correct info for all branches", () => {
    const branches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
    branches.forEach((branch) => {
      const info = getBranchInfo(branch);
      expect(info).toBeDefined();
      expect(info?.name).toBe(branch);
    });
  });
});

describe("getStemElement", () => {
  it("returns correct element for each stem", () => {
    expect(getStemElement("甲")).toBe("목");
    expect(getStemElement("乙")).toBe("목");
    expect(getStemElement("丙")).toBe("화");
    expect(getStemElement("丁")).toBe("화");
    expect(getStemElement("戊")).toBe("토");
    expect(getStemElement("己")).toBe("토");
    expect(getStemElement("庚")).toBe("금");
    expect(getStemElement("辛")).toBe("금");
    expect(getStemElement("壬")).toBe("수");
    expect(getStemElement("癸")).toBe("수");
  });

  it("works with Korean stems", () => {
    expect(getStemElement("갑")).toBe("목");
    expect(getStemElement("을")).toBe("목");
    expect(getStemElement("병")).toBe("화");
  });

  it("returns default 토 for invalid stem", () => {
    expect(getStemElement("xyz")).toBe("토");
    expect(getStemElement("")).toBe("토");
  });
});

describe("getBranchElement", () => {
  it("returns correct element for each branch", () => {
    expect(getBranchElement("子")).toBe("수");
    expect(getBranchElement("丑")).toBe("토");
    expect(getBranchElement("寅")).toBe("목");
    expect(getBranchElement("卯")).toBe("목");
    expect(getBranchElement("辰")).toBe("토");
    expect(getBranchElement("巳")).toBe("화");
    expect(getBranchElement("午")).toBe("화");
    expect(getBranchElement("未")).toBe("토");
    expect(getBranchElement("申")).toBe("금");
    expect(getBranchElement("酉")).toBe("금");
    expect(getBranchElement("戌")).toBe("토");
    expect(getBranchElement("亥")).toBe("수");
  });

  it("works with Korean branches", () => {
    expect(getBranchElement("자")).toBe("수");
    expect(getBranchElement("인")).toBe("목");
    expect(getBranchElement("오")).toBe("화");
  });

  it("returns default 토 for invalid branch", () => {
    expect(getBranchElement("xyz")).toBe("토");
    expect(getBranchElement("")).toBe("토");
  });
});

describe("getStemYinYang", () => {
  it("returns 양 for yang stems", () => {
    expect(getStemYinYang("甲")).toBe("양");
    expect(getStemYinYang("丙")).toBe("양");
    expect(getStemYinYang("戊")).toBe("양");
    expect(getStemYinYang("庚")).toBe("양");
    expect(getStemYinYang("壬")).toBe("양");
  });

  it("returns 음 for yin stems", () => {
    expect(getStemYinYang("乙")).toBe("음");
    expect(getStemYinYang("丁")).toBe("음");
    expect(getStemYinYang("己")).toBe("음");
    expect(getStemYinYang("辛")).toBe("음");
    expect(getStemYinYang("癸")).toBe("음");
  });

  it("returns default 양 for invalid stem", () => {
    expect(getStemYinYang("xyz")).toBe("양");
  });
});

describe("getBranchYinYang", () => {
  it("returns 양 for yang branches", () => {
    expect(getBranchYinYang("子")).toBe("양");
    expect(getBranchYinYang("寅")).toBe("양");
    expect(getBranchYinYang("辰")).toBe("양");
    expect(getBranchYinYang("午")).toBe("양");
    expect(getBranchYinYang("申")).toBe("양");
    expect(getBranchYinYang("戌")).toBe("양");
  });

  it("returns 음 for yin branches", () => {
    expect(getBranchYinYang("丑")).toBe("음");
    expect(getBranchYinYang("卯")).toBe("음");
    expect(getBranchYinYang("巳")).toBe("음");
    expect(getBranchYinYang("未")).toBe("음");
    expect(getBranchYinYang("酉")).toBe("음");
    expect(getBranchYinYang("亥")).toBe("음");
  });

  it("returns default 양 for invalid branch", () => {
    expect(getBranchYinYang("xyz")).toBe("양");
  });
});

describe("isValidStem", () => {
  it("returns true for valid Chinese stems", () => {
    const stems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
    stems.forEach((stem) => {
      expect(isValidStem(stem)).toBe(true);
    });
  });

  it("returns true for valid Korean stems", () => {
    const stems = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
    stems.forEach((stem) => {
      expect(isValidStem(stem)).toBe(true);
    });
  });

  it("returns false for invalid stems", () => {
    expect(isValidStem("xyz")).toBe(false);
    expect(isValidStem("")).toBe(false);
    expect(isValidStem("子")).toBe(false);
  });
});

describe("isValidBranch", () => {
  it("returns true for valid Chinese branches", () => {
    const branches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
    branches.forEach((branch) => {
      expect(isValidBranch(branch)).toBe(true);
    });
  });

  it("returns true for valid Korean branches", () => {
    const branches = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
    branches.forEach((branch) => {
      expect(isValidBranch(branch)).toBe(true);
    });
  });

  it("returns false for invalid branches", () => {
    expect(isValidBranch("xyz")).toBe(false);
    expect(isValidBranch("")).toBe(false);
    expect(isValidBranch("甲")).toBe(false);
  });
});

describe("getStemIndex", () => {
  it("returns correct index for Chinese stems", () => {
    expect(getStemIndex("甲")).toBe(0);
    expect(getStemIndex("乙")).toBe(1);
    expect(getStemIndex("丙")).toBe(2);
    expect(getStemIndex("癸")).toBe(9);
  });

  it("returns correct index for Korean stems", () => {
    expect(getStemIndex("갑")).toBe(0);
    expect(getStemIndex("계")).toBe(9);
  });

  it("returns -1 for invalid stems", () => {
    expect(getStemIndex("xyz")).toBe(-1);
    expect(getStemIndex("")).toBe(-1);
  });
});

describe("getBranchIndex", () => {
  it("returns correct index for Chinese branches", () => {
    expect(getBranchIndex("子")).toBe(0);
    expect(getBranchIndex("丑")).toBe(1);
    expect(getBranchIndex("亥")).toBe(11);
  });

  it("returns correct index for Korean branches", () => {
    expect(getBranchIndex("자")).toBe(0);
    expect(getBranchIndex("해")).toBe(11);
  });

  it("returns -1 for invalid branches", () => {
    expect(getBranchIndex("xyz")).toBe(-1);
    expect(getBranchIndex("")).toBe(-1);
  });
});

describe("getStemByIndex", () => {
  it("returns correct stem for index 0-9", () => {
    const expected = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
    for (let i = 0; i < 10; i++) {
      expect(getStemByIndex(i).name).toBe(expected[i]);
    }
  });

  it("wraps around for overflow", () => {
    expect(getStemByIndex(10).name).toBe("甲");
    expect(getStemByIndex(-1).name).toBe("癸");
  });
});

describe("getBranchByIndex", () => {
  it("returns correct branch for index 0-11", () => {
    const expected = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
    for (let i = 0; i < 12; i++) {
      expect(getBranchByIndex(i).name).toBe(expected[i]);
    }
  });

  it("wraps around for overflow", () => {
    expect(getBranchByIndex(12).name).toBe("子");
    expect(getBranchByIndex(-1).name).toBe("亥");
  });
});

describe("Element pairing", () => {
  it("甲乙 are both 목", () => {
    expect(getStemElement("甲")).toBe("목");
    expect(getStemElement("乙")).toBe("목");
  });

  it("丙丁 are both 화", () => {
    expect(getStemElement("丙")).toBe("화");
    expect(getStemElement("丁")).toBe("화");
  });
});

describe("60 Gapja cycle", () => {
  it("generates valid 60 Gapja combinations", () => {
    const gapjaList: string[] = [];
    for (let i = 0; i < 60; i++) {
      const stem = getStemByIndex(i);
      const branch = getBranchByIndex(i);
      gapjaList.push(`${stem.name}${branch.name}`);
    }
    expect(gapjaList[0]).toBe("甲子");
    expect(gapjaList[59]).toBe("癸亥");
  });
});
