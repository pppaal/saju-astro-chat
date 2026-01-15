import { IChingData, type Hexagram } from "@/lib/iChing/iChingData";

describe("I Ching Data", () => {
  describe("structure", () => {
    it("has exactly 64 hexagrams", () => {
      expect(IChingData).toHaveLength(64);
    });

    it("hexagrams are numbered 1-64", () => {
      const numbers = IChingData.map((h) => h.number);
      for (let i = 1; i <= 64; i++) {
        expect(numbers).toContain(i);
      }
    });

    it("all hexagrams have required properties", () => {
      IChingData.forEach((hex, index) => {
        expect(hex).toHaveProperty("number");
        expect(hex).toHaveProperty("binary");
        expect(hex).toHaveProperty("name");
        expect(hex).toHaveProperty("symbol");
        expect(hex).toHaveProperty("judgment");
        expect(hex).toHaveProperty("image");
        expect(hex).toHaveProperty("lines");
      });
    });
  });

  describe("binary representations", () => {
    it("all binaries are 6 characters", () => {
      IChingData.forEach((hex) => {
        expect(hex.binary).toHaveLength(6);
      });
    });

    it("all binaries contain only 0s and 1s", () => {
      IChingData.forEach((hex) => {
        expect(hex.binary).toMatch(/^[01]{6}$/);
      });
    });

    it("hexagram 1 (Qian) is all yang (111111)", () => {
      const qian = IChingData.find((h) => h.number === 1);
      expect(qian?.binary).toBe("111111");
    });

    it("hexagram 2 (Kun) is all yin (000000)", () => {
      const kun = IChingData.find((h) => h.number === 2);
      expect(kun?.binary).toBe("000000");
    });
  });

  describe("symbols", () => {
    it("all symbols are single Unicode characters", () => {
      IChingData.forEach((hex) => {
        // Each symbol should be a single code point in the hexagram block
        expect([...hex.symbol]).toHaveLength(1);
      });
    });

    it("symbols are in the correct Unicode range", () => {
      IChingData.forEach((hex) => {
        const codePoint = hex.symbol.codePointAt(0);
        // Hexagram Unicode block: U+4DC0 to U+4DFF
        expect(codePoint).toBeGreaterThanOrEqual(0x4dc0);
        expect(codePoint).toBeLessThanOrEqual(0x4dff);
      });
    });

    it("hexagram 1 has correct symbol ䷀", () => {
      const qian = IChingData.find((h) => h.number === 1);
      expect(qian?.symbol).toBe("䷀");
    });

    it("hexagram 64 has correct symbol ䷿", () => {
      const weiji = IChingData.find((h) => h.number === 64);
      expect(weiji?.symbol).toBe("䷿");
    });
  });

  describe("names", () => {
    it("all hexagrams have unique names", () => {
      const names = IChingData.map((h) => h.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(64);
    });

    it("names include English translations in parentheses", () => {
      IChingData.forEach((hex) => {
        expect(hex.name).toMatch(/\(.+\)/);
      });
    });

    it("hexagram 1 is Qian (The Creative)", () => {
      const qian = IChingData.find((h) => h.number === 1);
      expect(qian?.name).toBe("Qian (The Creative)");
    });

    it("hexagram 2 is Kun (The Receptive)", () => {
      const kun = IChingData.find((h) => h.number === 2);
      expect(kun?.name).toBe("Kun (The Receptive)");
    });
  });

  describe("lines", () => {
    it("all hexagrams have exactly 6 lines", () => {
      IChingData.forEach((hex) => {
        expect(hex.lines).toHaveLength(6);
      });
    });

    it("lines are non-empty strings", () => {
      IChingData.forEach((hex) => {
        hex.lines.forEach((line, index) => {
          expect(typeof line).toBe("string");
          expect(line.length).toBeGreaterThan(0);
        });
      });
    });

    it("first line starts with 'First line:'", () => {
      IChingData.forEach((hex) => {
        expect(hex.lines[0]).toMatch(/^First line:/);
      });
    });

    it("sixth line starts with 'Sixth line:'", () => {
      IChingData.forEach((hex) => {
        expect(hex.lines[5]).toMatch(/^Sixth line:/);
      });
    });
  });

  describe("judgment and image", () => {
    it("all judgments are non-empty", () => {
      IChingData.forEach((hex) => {
        expect(hex.judgment.length).toBeGreaterThan(10);
      });
    });

    it("all images are non-empty", () => {
      IChingData.forEach((hex) => {
        expect(hex.image.length).toBeGreaterThan(10);
      });
    });

    it("images typically mention 'superior man'", () => {
      const mentionsSuperiorMan = IChingData.filter((hex) =>
        hex.image.includes("superior man") || hex.image.includes("great man")
      );
      // Most images mention the superior man
      expect(mentionsSuperiorMan.length).toBeGreaterThan(50);
    });
  });

  describe("key hexagrams", () => {
    it("hexagram 11 (Tai/Peace) has correct content", () => {
      const tai = IChingData.find((h) => h.number === 11);
      expect(tai?.name).toContain("Peace");
      expect(tai?.binary).toBe("000111");
    });

    it("hexagram 12 (Pi/Standstill) has correct content", () => {
      const pi = IChingData.find((h) => h.number === 12);
      expect(pi?.name).toContain("Standstill");
      expect(pi?.binary).toBe("111000");
    });

    it("hexagrams 11 and 12 are inverses", () => {
      const tai = IChingData.find((h) => h.number === 11);
      const pi = IChingData.find((h) => h.number === 12);
      // Reverse binary should match
      const reversed = tai?.binary.split("").reverse().join("");
      expect(reversed).toBe(pi?.binary);
    });

    it("hexagram 63 (Jiji/After Completion) is alternating", () => {
      const jiji = IChingData.find((h) => h.number === 63);
      expect(jiji?.binary).toBe("010101");
    });

    it("hexagram 64 (Weiji/Before Completion) is alternating", () => {
      const weiji = IChingData.find((h) => h.number === 64);
      expect(weiji?.binary).toBe("101010");
    });
  });
});
