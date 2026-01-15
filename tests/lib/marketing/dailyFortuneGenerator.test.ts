/**
 * Tests for dailyFortuneGenerator.ts
 * Daily Fortune Generator for Viral Marketing
 */

import { vi } from "vitest";
import type { ZodiacSign, DailyFortune } from "@/lib/marketing/dailyFortuneGenerator";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("dailyFortuneGenerator", () => {
  describe("generateDailyFortuneForSign", () => {
    it("generates fortune for a single zodiac sign", async () => {
      const { generateDailyFortuneForSign } = await import("@/lib/marketing/dailyFortuneGenerator");
      const fortune = await generateDailyFortuneForSign("aries");

      expect(fortune).toBeDefined();
      expect(fortune.sign).toBe("aries");
      expect(fortune.signKo).toBe("양자리");
      expect(fortune.emoji).toBe("♈");
      expect(fortune.date).toBeDefined();
    });

    it("generates fortune with valid score ranges", async () => {
      const { generateDailyFortuneForSign } = await import("@/lib/marketing/dailyFortuneGenerator");
      const fortune = await generateDailyFortuneForSign("taurus");

      expect(fortune.scores.love).toBeGreaterThanOrEqual(0);
      expect(fortune.scores.love).toBeLessThanOrEqual(100);
      expect(fortune.scores.career).toBeGreaterThanOrEqual(0);
      expect(fortune.scores.career).toBeLessThanOrEqual(100);
      expect(fortune.scores.wealth).toBeGreaterThanOrEqual(0);
      expect(fortune.scores.wealth).toBeLessThanOrEqual(100);
      expect(fortune.scores.health).toBeGreaterThanOrEqual(0);
      expect(fortune.scores.health).toBeLessThanOrEqual(100);
      expect(fortune.scores.overall).toBeGreaterThanOrEqual(0);
      expect(fortune.scores.overall).toBeLessThanOrEqual(100);
    });

    it("generates fortune with lucky elements", async () => {
      const { generateDailyFortuneForSign } = await import("@/lib/marketing/dailyFortuneGenerator");
      const fortune = await generateDailyFortuneForSign("gemini");

      expect(fortune.luckyColor).toBeDefined();
      expect(typeof fortune.luckyColor).toBe("string");
      expect(fortune.luckyNumber).toBeDefined();
      expect(fortune.luckyNumber).toBeGreaterThan(0);
      expect(fortune.luckyItem).toBeDefined();
      expect(typeof fortune.luckyItem).toBe("string");
    });

    it("generates fortune with message and advice", async () => {
      const { generateDailyFortuneForSign } = await import("@/lib/marketing/dailyFortuneGenerator");
      const fortune = await generateDailyFortuneForSign("cancer");

      expect(fortune.message).toBeDefined();
      expect(fortune.message.length).toBeGreaterThan(0);
      expect(fortune.advice).toBeDefined();
      expect(fortune.advice.length).toBeGreaterThan(0);
    });

    it("generates fortune with hashtags", async () => {
      const { generateDailyFortuneForSign } = await import("@/lib/marketing/dailyFortuneGenerator");
      const fortune = await generateDailyFortuneForSign("leo");

      expect(fortune.hashtags).toBeDefined();
      expect(Array.isArray(fortune.hashtags)).toBe(true);
      expect(fortune.hashtags.length).toBeGreaterThan(0);
      expect(fortune.hashtags.every(tag => tag.startsWith("#"))).toBe(true);
    });

    it("generates consistent fortune for same date", async () => {
      const { generateDailyFortuneForSign } = await import("@/lib/marketing/dailyFortuneGenerator");
      const date = new Date("2024-01-15");
      const fortune1 = await generateDailyFortuneForSign("virgo", date);
      const fortune2 = await generateDailyFortuneForSign("virgo", date);

      expect(fortune1.scores).toEqual(fortune2.scores);
      expect(fortune1.luckyColor).toBe(fortune2.luckyColor);
      expect(fortune1.luckyNumber).toBe(fortune2.luckyNumber);
      expect(fortune1.luckyItem).toBe(fortune2.luckyItem);
    });

    it("generates different fortune for different dates", async () => {
      const { generateDailyFortuneForSign } = await import("@/lib/marketing/dailyFortuneGenerator");
      const date1 = new Date("2024-01-15");
      const date2 = new Date("2024-01-16");
      const fortune1 = await generateDailyFortuneForSign("libra", date1);
      const fortune2 = await generateDailyFortuneForSign("libra", date2);

      // At least one property should be different
      const isDifferent =
        fortune1.scores.love !== fortune2.scores.love ||
        fortune1.scores.career !== fortune2.scores.career ||
        fortune1.luckyColor !== fortune2.luckyColor ||
        fortune1.luckyNumber !== fortune2.luckyNumber;

      expect(isDifferent).toBe(true);
    });

    it("handles all 12 zodiac signs", async () => {
      const { generateDailyFortuneForSign } = await import("@/lib/marketing/dailyFortuneGenerator");
      const signs: ZodiacSign[] = [
        "aries", "taurus", "gemini", "cancer", "leo", "virgo",
        "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"
      ];

      for (const sign of signs) {
        const fortune = await generateDailyFortuneForSign(sign);
        expect(fortune.sign).toBe(sign);
        expect(fortune.signKo).toBeDefined();
        expect(fortune.emoji).toBeDefined();
      }
    });

    it("uses current date when no date provided", async () => {
      const { generateDailyFortuneForSign } = await import("@/lib/marketing/dailyFortuneGenerator");
      const fortune = await generateDailyFortuneForSign("scorpio");
      const today = new Date().toISOString().split("T")[0];

      expect(fortune.date).toBe(today);
    });

    it("formats date correctly", async () => {
      const { generateDailyFortuneForSign } = await import("@/lib/marketing/dailyFortuneGenerator");
      const date = new Date("2024-03-15");
      const fortune = await generateDailyFortuneForSign("sagittarius", date);

      expect(fortune.date).toBe("2024-03-15");
    });
  });

  describe("generateAllDailyFortunes", () => {
    it("generates fortunes for all 12 zodiac signs", async () => {
      const { generateAllDailyFortunes } = await import("@/lib/marketing/dailyFortuneGenerator");
      const fortunes = await generateAllDailyFortunes();

      expect(fortunes).toBeDefined();
      expect(Array.isArray(fortunes)).toBe(true);
      expect(fortunes.length).toBe(12);
    });

    it("generates unique fortune for each sign", async () => {
      const { generateAllDailyFortunes } = await import("@/lib/marketing/dailyFortuneGenerator");
      const fortunes = await generateAllDailyFortunes();
      const signs = fortunes.map(f => f.sign);

      // All signs should be unique
      expect(new Set(signs).size).toBe(12);
    });

    it("all fortunes have same date", async () => {
      const { generateAllDailyFortunes } = await import("@/lib/marketing/dailyFortuneGenerator");
      const date = new Date("2024-06-20");
      const fortunes = await generateAllDailyFortunes(date);

      const dates = fortunes.map(f => f.date);
      expect(new Set(dates).size).toBe(1);
      expect(dates[0]).toBe("2024-06-20");
    });

    it("generates consistent fortunes for same date", async () => {
      const { generateAllDailyFortunes } = await import("@/lib/marketing/dailyFortuneGenerator");
      const date = new Date("2024-09-10");
      const fortunes1 = await generateAllDailyFortunes(date);
      const fortunes2 = await generateAllDailyFortunes(date);

      expect(fortunes1.length).toBe(fortunes2.length);
      for (let i = 0; i < fortunes1.length; i++) {
        expect(fortunes1[i].scores).toEqual(fortunes2[i].scores);
        expect(fortunes1[i].luckyColor).toBe(fortunes2[i].luckyColor);
      }
    });

    it("uses current date when no date provided", async () => {
      const { generateAllDailyFortunes } = await import("@/lib/marketing/dailyFortuneGenerator");
      const fortunes = await generateAllDailyFortunes();
      const today = new Date().toISOString().split("T")[0];

      expect(fortunes[0].date).toBe(today);
    });

    it("all fortunes have valid structure", async () => {
      const { generateAllDailyFortunes } = await import("@/lib/marketing/dailyFortuneGenerator");
      const fortunes = await generateAllDailyFortunes();

      fortunes.forEach(fortune => {
        expect(fortune.sign).toBeDefined();
        expect(fortune.signKo).toBeDefined();
        expect(fortune.emoji).toBeDefined();
        expect(fortune.scores).toBeDefined();
        expect(fortune.scores.love).toBeGreaterThanOrEqual(0);
        expect(fortune.scores.career).toBeGreaterThanOrEqual(0);
        expect(fortune.scores.wealth).toBeGreaterThanOrEqual(0);
        expect(fortune.scores.health).toBeGreaterThanOrEqual(0);
        expect(fortune.scores.overall).toBeGreaterThanOrEqual(0);
        expect(fortune.luckyColor).toBeDefined();
        expect(fortune.luckyNumber).toBeGreaterThan(0);
        expect(fortune.luckyItem).toBeDefined();
        expect(fortune.message).toBeDefined();
        expect(fortune.advice).toBeDefined();
        expect(Array.isArray(fortune.hashtags)).toBe(true);
      });
    });
  });

  describe("generateShareText", () => {
    it("generates share text with all key elements", async () => {
      const { generateShareText } = await import("@/lib/marketing/dailyFortuneGenerator");
      const fortune: DailyFortune = {
        date: "2024-01-15",
        sign: "aries",
        signKo: "양자리",
        emoji: "♈",
        scores: {
          love: 85,
          career: 75,
          wealth: 90,
          health: 80,
          overall: 82,
        },
        luckyColor: "빨강",
        luckyNumber: 7,
        luckyItem: "향수",
        message: "오늘은 좋은 날입니다.",
        advice: "자신감을 가지세요.",
        hashtags: ["#오늘의운세", "#양자리", "#일일운세"],
      };

      const shareText = generateShareText(fortune);

      expect(shareText).toContain("양자리");
      expect(shareText).toContain("♈");
      expect(shareText).toContain("2024-01-15");
      expect(shareText).toContain("오늘은 좋은 날입니다.");
      expect(shareText).toContain("#오늘의운세");
      expect(shareText).toContain("#양자리");
    });

    it("includes overall score in share text", async () => {
      const { generateShareText } = await import("@/lib/marketing/dailyFortuneGenerator");
      const fortune: DailyFortune = {
        date: "2024-02-20",
        sign: "taurus",
        signKo: "황소자리",
        emoji: "♉",
        scores: {
          love: 70,
          career: 65,
          wealth: 80,
          health: 75,
          overall: 72,
        },
        luckyColor: "초록",
        luckyNumber: 3,
        luckyItem: "식물",
        message: "안정적인 하루",
        advice: "차분하게 행동하세요",
        hashtags: ["#황소자리"],
      };

      const shareText = generateShareText(fortune);

      expect(shareText).toContain("72");
    });

    it("includes lucky elements in share text", async () => {
      const { generateShareText } = await import("@/lib/marketing/dailyFortuneGenerator");
      const fortune: DailyFortune = {
        date: "2024-03-10",
        sign: "gemini",
        signKo: "쌍둥이자리",
        emoji: "♊",
        scores: {
          love: 88,
          career: 92,
          wealth: 85,
          health: 90,
          overall: 89,
        },
        luckyColor: "노랑",
        luckyNumber: 9,
        luckyItem: "펜",
        message: "창의력이 넘치는 날",
        advice: "새로운 아이디어를 실행하세요",
        hashtags: ["#쌍둥이자리", "#오늘의운세"],
      };

      const shareText = generateShareText(fortune);

      expect(shareText).toContain("노랑");
      expect(shareText).toContain("9");
      expect(shareText).toContain("펜");
    });

    it("formats hashtags correctly", async () => {
      const { generateShareText } = await import("@/lib/marketing/dailyFortuneGenerator");
      const fortune: DailyFortune = {
        date: "2024-04-05",
        sign: "cancer",
        signKo: "게자리",
        emoji: "♋",
        scores: {
          love: 95,
          career: 85,
          wealth: 78,
          health: 88,
          overall: 86,
        },
        luckyColor: "은색",
        luckyNumber: 2,
        luckyItem: "조개껍질",
        message: "감성이 풍부한 날",
        advice: "가족과 시간을 보내세요",
        hashtags: ["#게자리", "#오늘의운세", "#일일운세"],
      };

      const shareText = generateShareText(fortune);

      expect(shareText).toContain("#게자리");
      expect(shareText).toContain("#오늘의운세");
      expect(shareText).toContain("#일일운세");
    });

    it("generates non-empty share text", async () => {
      const { generateShareText } = await import("@/lib/marketing/dailyFortuneGenerator");
      const fortune: DailyFortune = {
        date: "2024-05-12",
        sign: "leo",
        signKo: "사자자리",
        emoji: "♌",
        scores: {
          love: 80,
          career: 90,
          wealth: 85,
          health: 82,
          overall: 84,
        },
        luckyColor: "금색",
        luckyNumber: 5,
        luckyItem: "왕관",
        message: "리더십을 발휘할 때",
        advice: "당당하게 행동하세요",
        hashtags: ["#사자자리"],
      };

      const shareText = generateShareText(fortune);

      expect(shareText.length).toBeGreaterThan(0);
      expect(typeof shareText).toBe("string");
    });
  });
});
