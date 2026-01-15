
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

describe("stemBranchUtils", () => {
  describe("normalizeStem", () => {
    it("converts Korean stem names to Chinese characters", () => {
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

    it("returns Chinese characters as-is", () => {
      expect(normalizeStem("甲")).toBe("甲");
      expect(normalizeStem("乙")).toBe("乙");
    });

    it("handles empty and null values", () => {
      expect(normalizeStem("")).toBe("");
      // @ts-expect-error testing null handling
      expect(normalizeStem(null)).toBe("");
      // @ts-expect-error testing undefined handling
      expect(normalizeStem(undefined)).toBe("");
    });

    it("trims whitespace", () => {
      expect(normalizeStem(" 갑 ")).toBe("甲");
      expect(normalizeStem("  甲  ")).toBe("甲");
    });
  });

  describe("normalizeBranch", () => {
    it("converts Korean branch names to Chinese characters", () => {
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

    it("returns Chinese characters as-is", () => {
      expect(normalizeBranch("子")).toBe("子");
      expect(normalizeBranch("丑")).toBe("丑");
    });
  });

  describe("getStemInfo", () => {
    it("returns stem info for valid stems", () => {
      const info = getStemInfo("甲");
      expect(info).toBeDefined();
      expect(info?.name).toBe("甲");
      expect(info?.element).toBe("목");
      expect(info?.yin_yang).toBe("양");
    });

    it("accepts Korean stem names", () => {
      const info = getStemInfo("갑");
      expect(info).toBeDefined();
      expect(info?.name).toBe("甲");
    });

    it("returns undefined for invalid stems", () => {
      expect(getStemInfo("invalid")).toBeUndefined();
      expect(getStemInfo("X")).toBeUndefined();
    });
  });

  describe("getBranchInfo", () => {
    it("returns branch info for valid branches", () => {
      const info = getBranchInfo("子");
      expect(info).toBeDefined();
      expect(info?.name).toBe("子");
    });

    it("accepts Korean branch names", () => {
      const info = getBranchInfo("자");
      expect(info).toBeDefined();
      expect(info?.name).toBe("子");
    });

    it("returns undefined for invalid branches", () => {
      expect(getBranchInfo("invalid")).toBeUndefined();
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

    it("accepts Korean stem names", () => {
      expect(getStemElement("갑")).toBe("목");
      expect(getStemElement("병")).toBe("화");
    });

    it("returns default '토' for invalid stems", () => {
      expect(getStemElement("invalid")).toBe("토");
    });
  });

  describe("getBranchElement", () => {
    it("returns correct element for branches", () => {
      expect(getBranchElement("寅")).toBe("목");
      expect(getBranchElement("卯")).toBe("목");
      expect(getBranchElement("巳")).toBe("화");
      expect(getBranchElement("午")).toBe("화");
      expect(getBranchElement("申")).toBe("금");
      expect(getBranchElement("酉")).toBe("금");
      expect(getBranchElement("子")).toBe("수");
      expect(getBranchElement("亥")).toBe("수");
    });

    it("accepts Korean branch names", () => {
      expect(getBranchElement("인")).toBe("목");
      expect(getBranchElement("사")).toBe("화");
    });

    it("returns default '토' for invalid branches", () => {
      expect(getBranchElement("invalid")).toBe("토");
    });
  });

  describe("getStemYinYang", () => {
    it("returns '양' for yang stems (甲丙戊庚壬)", () => {
      expect(getStemYinYang("甲")).toBe("양");
      expect(getStemYinYang("丙")).toBe("양");
      expect(getStemYinYang("戊")).toBe("양");
      expect(getStemYinYang("庚")).toBe("양");
      expect(getStemYinYang("壬")).toBe("양");
    });

    it("returns '음' for yin stems (乙丁己辛癸)", () => {
      expect(getStemYinYang("乙")).toBe("음");
      expect(getStemYinYang("丁")).toBe("음");
      expect(getStemYinYang("己")).toBe("음");
      expect(getStemYinYang("辛")).toBe("음");
      expect(getStemYinYang("癸")).toBe("음");
    });

    it("returns default '양' for invalid stems", () => {
      expect(getStemYinYang("invalid")).toBe("양");
    });
  });

  describe("getBranchYinYang", () => {
    it("returns correct yin/yang for branches", () => {
      expect(getBranchYinYang("子")).toBe("양");
      expect(getBranchYinYang("丑")).toBe("음");
      expect(getBranchYinYang("寅")).toBe("양");
      expect(getBranchYinYang("卯")).toBe("음");
    });

    it("returns default '양' for invalid branches", () => {
      expect(getBranchYinYang("invalid")).toBe("양");
    });
  });

  describe("isValidStem", () => {
    it("returns true for valid Chinese character stems", () => {
      expect(isValidStem("甲")).toBe(true);
      expect(isValidStem("乙")).toBe(true);
      expect(isValidStem("癸")).toBe(true);
    });

    it("returns true for valid Korean stems", () => {
      expect(isValidStem("갑")).toBe(true);
      expect(isValidStem("을")).toBe(true);
      expect(isValidStem("계")).toBe(true);
    });

    it("returns false for invalid stems", () => {
      expect(isValidStem("invalid")).toBe(false);
      expect(isValidStem("X")).toBe(false);
      expect(isValidStem("")).toBe(false);
    });
  });

  describe("isValidBranch", () => {
    it("returns true for valid Chinese character branches", () => {
      expect(isValidBranch("子")).toBe(true);
      expect(isValidBranch("丑")).toBe(true);
      expect(isValidBranch("亥")).toBe(true);
    });

    it("returns true for valid Korean branches", () => {
      expect(isValidBranch("자")).toBe(true);
      expect(isValidBranch("축")).toBe(true);
      expect(isValidBranch("해")).toBe(true);
    });

    it("returns false for invalid branches", () => {
      expect(isValidBranch("invalid")).toBe(false);
      expect(isValidBranch("")).toBe(false);
    });
  });

  describe("getStemIndex", () => {
    it("returns correct index for each stem (0-9)", () => {
      expect(getStemIndex("甲")).toBe(0);
      expect(getStemIndex("乙")).toBe(1);
      expect(getStemIndex("丙")).toBe(2);
      expect(getStemIndex("丁")).toBe(3);
      expect(getStemIndex("戊")).toBe(4);
      expect(getStemIndex("己")).toBe(5);
      expect(getStemIndex("庚")).toBe(6);
      expect(getStemIndex("辛")).toBe(7);
      expect(getStemIndex("壬")).toBe(8);
      expect(getStemIndex("癸")).toBe(9);
    });

    it("accepts Korean stem names", () => {
      expect(getStemIndex("갑")).toBe(0);
      expect(getStemIndex("계")).toBe(9);
    });

    it("returns -1 for invalid stems", () => {
      expect(getStemIndex("invalid")).toBe(-1);
    });
  });

  describe("getBranchIndex", () => {
    it("returns correct index for each branch (0-11)", () => {
      expect(getBranchIndex("子")).toBe(0);
      expect(getBranchIndex("丑")).toBe(1);
      expect(getBranchIndex("寅")).toBe(2);
      expect(getBranchIndex("卯")).toBe(3);
      expect(getBranchIndex("辰")).toBe(4);
      expect(getBranchIndex("巳")).toBe(5);
      expect(getBranchIndex("午")).toBe(6);
      expect(getBranchIndex("未")).toBe(7);
      expect(getBranchIndex("申")).toBe(8);
      expect(getBranchIndex("酉")).toBe(9);
      expect(getBranchIndex("戌")).toBe(10);
      expect(getBranchIndex("亥")).toBe(11);
    });

    it("accepts Korean branch names", () => {
      expect(getBranchIndex("자")).toBe(0);
      expect(getBranchIndex("해")).toBe(11);
    });

    it("returns -1 for invalid branches", () => {
      expect(getBranchIndex("invalid")).toBe(-1);
    });
  });

  describe("getStemByIndex", () => {
    it("returns correct stem for each index", () => {
      expect(getStemByIndex(0).name).toBe("甲");
      expect(getStemByIndex(1).name).toBe("乙");
      expect(getStemByIndex(9).name).toBe("癸");
    });

    it("handles cyclic indices (wraps around)", () => {
      expect(getStemByIndex(10).name).toBe("甲"); // 10 % 10 = 0
      expect(getStemByIndex(11).name).toBe("乙"); // 11 % 10 = 1
      expect(getStemByIndex(20).name).toBe("甲"); // 20 % 10 = 0
    });

    it("handles negative indices", () => {
      expect(getStemByIndex(-1).name).toBe("癸"); // -1 wraps to 9
      expect(getStemByIndex(-10).name).toBe("甲"); // -10 wraps to 0
    });
  });

  describe("getBranchByIndex", () => {
    it("returns correct branch for each index", () => {
      expect(getBranchByIndex(0).name).toBe("子");
      expect(getBranchByIndex(1).name).toBe("丑");
      expect(getBranchByIndex(11).name).toBe("亥");
    });

    it("handles cyclic indices (wraps around)", () => {
      expect(getBranchByIndex(12).name).toBe("子"); // 12 % 12 = 0
      expect(getBranchByIndex(13).name).toBe("丑"); // 13 % 12 = 1
      expect(getBranchByIndex(24).name).toBe("子"); // 24 % 12 = 0
    });

    it("handles negative indices", () => {
      expect(getBranchByIndex(-1).name).toBe("亥"); // -1 wraps to 11
      expect(getBranchByIndex(-12).name).toBe("子"); // -12 wraps to 0
    });
  });
});
