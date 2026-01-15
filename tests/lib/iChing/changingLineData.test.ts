
import {
  calculateChangingHexagramNumber,
  binaryToHexagramNumber,
  hexagramNames,
} from "@/lib/iChing/changingLineData";

describe("changingLineData", () => {
  describe("binaryToHexagramNumber", () => {
    it("converts all-yang (111111) to hexagram 1 (건)", () => {
      expect(binaryToHexagramNumber("111111")).toBe(1);
    });

    it("converts all-yin (000000) to hexagram 2 (곤)", () => {
      expect(binaryToHexagramNumber("000000")).toBe(2);
    });

    it("converts 010001 to hexagram 3 (둔)", () => {
      expect(binaryToHexagramNumber("010001")).toBe(3);
    });

    it("converts 100010 to hexagram 4 (몽)", () => {
      expect(binaryToHexagramNumber("100010")).toBe(4);
    });

    it("converts 010101 to hexagram 63 (기제)", () => {
      expect(binaryToHexagramNumber("010101")).toBe(63);
    });

    it("converts 101010 to hexagram 64 (미제)", () => {
      expect(binaryToHexagramNumber("101010")).toBe(64);
    });

    it("returns 0 for invalid binary", () => {
      expect(binaryToHexagramNumber("invalid")).toBe(0);
      expect(binaryToHexagramNumber("")).toBe(0);
      expect(binaryToHexagramNumber("1111111")).toBe(0);
    });

    it("converts 000111 to hexagram 11 (태)", () => {
      expect(binaryToHexagramNumber("000111")).toBe(11);
    });

    it("converts 111000 to hexagram 12 (비)", () => {
      expect(binaryToHexagramNumber("111000")).toBe(12);
    });

    it("converts 010010 to hexagram 29 (감)", () => {
      expect(binaryToHexagramNumber("010010")).toBe(29);
    });

    it("converts 101101 to hexagram 30 (리)", () => {
      expect(binaryToHexagramNumber("101101")).toBe(30);
    });
  });

  describe("calculateChangingHexagramNumber", () => {
    it("flips first line (index 0) of 건 to get changing hexagram", () => {
      // 111111 -> flip index 0 -> 011111
      const result = calculateChangingHexagramNumber("111111", 0);
      // 011111 = 43 (쾌)
      expect(result).toBe(43);
    });

    it("flips last line (index 5) of 건 to get changing hexagram", () => {
      // 111111 -> flip index 5 -> 111110
      const result = calculateChangingHexagramNumber("111111", 5);
      // 111110 = 44 (구)
      expect(result).toBe(44);
    });

    it("flips first line of 곤 to get changing hexagram", () => {
      // 000000 -> flip index 0 -> 100000
      const result = calculateChangingHexagramNumber("000000", 0);
      // 100000 = 23 (박)
      expect(result).toBe(23);
    });

    it("flips last line of 곤 to get changing hexagram", () => {
      // 000000 -> flip index 5 -> 000001
      const result = calculateChangingHexagramNumber("000000", 5);
      // 000001 = 24 (복)
      expect(result).toBe(24);
    });

    it("changes yang to yin in middle line", () => {
      // 111111 -> flip index 2 -> 110111
      const result = calculateChangingHexagramNumber("111111", 2);
      // 110111 = 9 (소축)
      expect(result).toBe(9);
    });

    it("changes yin to yang in mixed hexagram", () => {
      // 010101 (기제) -> flip index 3 -> 010001
      const result = calculateChangingHexagramNumber("010101", 3);
      // 010001 = 3 (둔)
      expect(result).toBe(3);
    });
  });

  describe("hexagramNames", () => {
    it("has names for all 64 hexagrams", () => {
      expect(Object.keys(hexagramNames)).toHaveLength(64);
    });

    it("hexagram 1 is 중천건", () => {
      expect(hexagramNames[1]).toBe("중천건(重天乾)");
    });

    it("hexagram 2 is 중지곤", () => {
      expect(hexagramNames[2]).toBe("중지곤(重地坤)");
    });

    it("hexagram 11 is 지천태", () => {
      expect(hexagramNames[11]).toBe("지천태(地天泰)");
    });

    it("hexagram 12 is 천지비", () => {
      expect(hexagramNames[12]).toBe("천지비(天地否)");
    });

    it("hexagram 63 is 수화기제", () => {
      expect(hexagramNames[63]).toBe("수화기제(水火旣濟)");
    });

    it("hexagram 64 is 화수미제", () => {
      expect(hexagramNames[64]).toBe("화수미제(火水未濟)");
    });

    it("names include Korean and Chinese characters", () => {
      // All names should follow pattern: Korean(Chinese)
      Object.values(hexagramNames).forEach((name) => {
        expect(name).toMatch(/^[가-힣]+\([^)]+\)$/);
      });
    });

    it("hexagram 29 is 중수감", () => {
      expect(hexagramNames[29]).toBe("중수감(重水坎)");
    });

    it("hexagram 30 is 중화리", () => {
      expect(hexagramNames[30]).toBe("중화리(重火離)");
    });

    it("all numbers 1-64 have entries", () => {
      for (let i = 1; i <= 64; i++) {
        expect(hexagramNames[i]).toBeDefined();
        expect(hexagramNames[i].length).toBeGreaterThan(0);
      }
    });
  });

  describe("binary-hexagram mapping consistency", () => {
    it("건 binary 111111 maps to hexagram 1", () => {
      expect(binaryToHexagramNumber("111111")).toBe(1);
      expect(hexagramNames[1]).toContain("건");
    });

    it("곤 binary 000000 maps to hexagram 2", () => {
      expect(binaryToHexagramNumber("000000")).toBe(2);
      expect(hexagramNames[2]).toContain("곤");
    });

    it("태 (earth over heaven) maps correctly", () => {
      // 태 = 지천태 = earth over heaven = 000111
      expect(binaryToHexagramNumber("000111")).toBe(11);
      expect(hexagramNames[11]).toContain("태");
    });

    it("비 (heaven over earth) maps correctly", () => {
      // 비 = 천지비 = heaven over earth = 111000
      expect(binaryToHexagramNumber("111000")).toBe(12);
      expect(hexagramNames[12]).toContain("비");
    });
  });

  describe("changing line transitions", () => {
    it("건 first line change gives 쾌", () => {
      const result = calculateChangingHexagramNumber("111111", 0);
      expect(hexagramNames[result]).toContain("쾌");
    });

    it("건 sixth line change gives 구", () => {
      const result = calculateChangingHexagramNumber("111111", 5);
      expect(hexagramNames[result]).toContain("구");
    });

    it("곤 first line change gives 박", () => {
      const result = calculateChangingHexagramNumber("000000", 0);
      expect(hexagramNames[result]).toContain("박");
    });

    it("곤 sixth line change gives 복", () => {
      const result = calculateChangingHexagramNumber("000000", 5);
      expect(hexagramNames[result]).toContain("복");
    });

    it("flipping each line of 건 produces different hexagrams", () => {
      const results = new Set<number>();
      for (let i = 0; i < 6; i++) {
        results.add(calculateChangingHexagramNumber("111111", i));
      }
      // All 6 results should be different
      expect(results.size).toBe(6);
    });

    it("flipping each line of 곤 produces different hexagrams", () => {
      const results = new Set<number>();
      for (let i = 0; i < 6; i++) {
        results.add(calculateChangingHexagramNumber("000000", i));
      }
      // All 6 results should be different
      expect(results.size).toBe(6);
    });
  });
});
