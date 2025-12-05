import { describe, it, expect } from "vitest";
import { IChingData } from "@/lib/iChing/iChingData";

describe("IChingData integrity", () => {
  it("should contain 64 hexagrams", () => {
    expect(IChingData.length).toBe(64);
  });

  it("should have unique numbers and binaries", () => {
    const numbers = new Set<number>();
    const binaries = new Set<string>();
    for (const hex of IChingData) {
      expect(numbers.has(hex.number)).toBe(false);
      numbers.add(hex.number);
      expect(binaries.has(hex.binary)).toBe(false);
      binaries.add(hex.binary);
    }
  });

  it("numbers should span 1..64 with no gaps", () => {
    const nums = [...IChingData].map((h) => h.number).sort((a, b) => a - b);
    expect(nums[0]).toBe(1);
    expect(nums[63]).toBe(64);
    for (let i = 0; i < nums.length; i++) {
      expect(nums[i]).toBe(i + 1);
    }
  });

  it("each hexagram should have 6-line binary and 6 lines of text", () => {
    for (const hex of IChingData) {
      expect(hex.binary).toMatch(/^[01]{6}$/);
      expect(hex.lines.length).toBe(6);
    }
  });

  it("symbols should follow Unicode hexagram block sequence", () => {
    for (const hex of IChingData) {
      const expected = String.fromCharCode(0x4dc0 + (hex.number - 1));
      expect(hex.symbol).toBe(expected);
    }
  });
});
