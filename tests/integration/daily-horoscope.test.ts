/**
 * Daily Horoscope Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 일일 운세 저장
 * - 별자리별 운세 관리
 * - 운세 히스토리 추적
 *
 * 실행: npm run test:integration
 * 환경변수 필요: TEST_DATABASE_URL 또는 DATABASE_URL
 */

import { beforeAll, afterAll, afterEach, describe, it, expect } from "vitest";
import {
  testPrisma,
  createTestUserInDb,
  cleanupAllTestUsers,
  checkTestDbConnection,
  connectTestDb,
  disconnectTestDb,
} from "./setup";

const hasTestDb = await checkTestDbConnection();

describe("Integration: Daily Horoscope", () => {
  if (!hasTestDb) {
    it("skips when test database is unavailable", () => {
      expect(true).toBe(true);
    });
    return;
  }

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await cleanupAllTestUsers();
    await disconnectTestDb();
  });

  afterEach(async () => {
    await cleanupAllTestUsers();
  });

  describe("Horoscope Creation", () => {
    it("creates daily horoscope for user", async () => {
      const user = await createTestUserInDb();

      const horoscope = await testPrisma.dailyFortune.create({
        data: {
          userId: user.id,
          date: new Date(),
          zodiacSign: "aries",
          overallScore: 85,
          content: JSON.stringify({
            love: { score: 80, message: "사랑 운이 좋습니다" },
            career: { score: 90, message: "직장 운이 매우 좋습니다" },
            health: { score: 85, message: "건강 상태 양호" },
            money: { score: 80, message: "재물 운 상승" },
          }),
        },
      });

      expect(horoscope.zodiacSign).toBe("aries");
      expect(horoscope.overallScore).toBe(85);
    });

    it("creates horoscope with lucky items", async () => {
      const user = await createTestUserInDb();

      const horoscope = await testPrisma.dailyFortune.create({
        data: {
          userId: user.id,
          date: new Date(),
          zodiacSign: "taurus",
          overallScore: 78,
          content: JSON.stringify({
            luckyItems: {
              color: "파란색",
              number: 7,
              direction: "동쪽",
              time: "오후 3시",
              food: "해산물",
            },
          }),
        },
      });

      const content = JSON.parse(horoscope.content as string);
      expect(content.luckyItems.color).toBe("파란색");
    });

    it("creates horoscope for all zodiac signs", async () => {
      const user = await createTestUserInDb();

      const signs = [
        "aries", "taurus", "gemini", "cancer",
        "leo", "virgo", "libra", "scorpio",
        "sagittarius", "capricorn", "aquarius", "pisces"
      ];

      for (let i = 0; i < signs.length; i++) {
        await testPrisma.dailyFortune.create({
          data: {
            userId: user.id,
            date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
            zodiacSign: signs[i],
            overallScore: 70 + i * 2,
            content: JSON.stringify({ sign: signs[i] }),
          },
        });
      }

      const horoscopes = await testPrisma.dailyFortune.findMany({
        where: { userId: user.id },
      });

      expect(horoscopes).toHaveLength(12);
    });
  });

  describe("Horoscope Retrieval", () => {
    it("retrieves today horoscope", async () => {
      const user = await createTestUserInDb();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await testPrisma.dailyFortune.create({
        data: {
          userId: user.id,
          date: today,
          zodiacSign: "leo",
          overallScore: 88,
          content: JSON.stringify({ today: true }),
        },
      });

      const todayHoroscope = await testPrisma.dailyFortune.findFirst({
        where: {
          userId: user.id,
          date: today,
        },
      });

      expect(todayHoroscope).not.toBeNull();
      expect(todayHoroscope?.zodiacSign).toBe("leo");
    });

    it("retrieves horoscopes for date range", async () => {
      const user = await createTestUserInDb();
      const now = new Date();

      for (let i = 0; i < 7; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        await testPrisma.dailyFortune.create({
          data: {
            userId: user.id,
            date,
            zodiacSign: "virgo",
            overallScore: 75 + i,
            content: JSON.stringify({ dayOffset: i }),
          },
        });
      }

      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);

      const weeklyHoroscopes = await testPrisma.dailyFortune.findMany({
        where: {
          userId: user.id,
          date: { gte: weekStart },
        },
        orderBy: { date: "desc" },
      });

      expect(weeklyHoroscopes).toHaveLength(7);
    });

    it("retrieves horoscope by zodiac sign", async () => {
      const user = await createTestUserInDb();

      const signs = ["aries", "aries", "taurus", "aries", "gemini"];

      for (let i = 0; i < signs.length; i++) {
        await testPrisma.dailyFortune.create({
          data: {
            userId: user.id,
            date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
            zodiacSign: signs[i],
            overallScore: 80,
            content: "{}",
          },
        });
      }

      const ariesHoroscopes = await testPrisma.dailyFortune.findMany({
        where: { userId: user.id, zodiacSign: "aries" },
      });

      expect(ariesHoroscopes).toHaveLength(3);
    });
  });

  describe("Score Analysis", () => {
    it("calculates average score over period", async () => {
      const user = await createTestUserInDb();

      const scores = [80, 85, 75, 90, 70]; // avg = 80

      for (let i = 0; i < scores.length; i++) {
        await testPrisma.dailyFortune.create({
          data: {
            userId: user.id,
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
            zodiacSign: "libra",
            overallScore: scores[i],
            content: "{}",
          },
        });
      }

      const horoscopes = await testPrisma.dailyFortune.findMany({
        where: { userId: user.id },
      });

      const avgScore = horoscopes.reduce((sum, h) => sum + h.overallScore, 0) / horoscopes.length;
      expect(avgScore).toBe(80);
    });

    it("finds best and worst days", async () => {
      const user = await createTestUserInDb();

      const scores = [65, 90, 75, 55, 85];

      for (let i = 0; i < scores.length; i++) {
        await testPrisma.dailyFortune.create({
          data: {
            userId: user.id,
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
            zodiacSign: "scorpio",
            overallScore: scores[i],
            content: JSON.stringify({ day: i }),
          },
        });
      }

      const bestDay = await testPrisma.dailyFortune.findFirst({
        where: { userId: user.id },
        orderBy: { overallScore: "desc" },
      });

      const worstDay = await testPrisma.dailyFortune.findFirst({
        where: { userId: user.id },
        orderBy: { overallScore: "asc" },
      });

      expect(bestDay?.overallScore).toBe(90);
      expect(worstDay?.overallScore).toBe(55);
    });

    it("tracks score trends", async () => {
      const user = await createTestUserInDb();

      // Improving trend
      const scores = [70, 75, 80, 85, 90];

      for (let i = 0; i < scores.length; i++) {
        await testPrisma.dailyFortune.create({
          data: {
            userId: user.id,
            date: new Date(Date.now() - (4 - i) * 24 * 60 * 60 * 1000),
            zodiacSign: "sagittarius",
            overallScore: scores[i],
            content: "{}",
          },
        });
      }

      const horoscopes = await testPrisma.dailyFortune.findMany({
        where: { userId: user.id },
        orderBy: { date: "asc" },
      });

      const scoreList = horoscopes.map(h => h.overallScore);
      const isImproving = scoreList.every((score, i) => i === 0 || score >= scoreList[i - 1]);

      expect(isImproving).toBe(true);
    });
  });

  describe("Category Scores", () => {
    it("stores category-specific scores", async () => {
      const user = await createTestUserInDb();

      const horoscope = await testPrisma.dailyFortune.create({
        data: {
          userId: user.id,
          date: new Date(),
          zodiacSign: "capricorn",
          overallScore: 82,
          content: JSON.stringify({
            categories: {
              love: 85,
              career: 90,
              health: 75,
              money: 78,
              family: 88,
            },
          }),
        },
      });

      const content = JSON.parse(horoscope.content as string);
      expect(content.categories.career).toBe(90);
    });

    it("finds best category for user", async () => {
      const user = await createTestUserInDb();

      const categorySets = [
        { love: 85, career: 70, health: 80 },
        { love: 90, career: 75, health: 85 },
        { love: 80, career: 80, health: 75 },
      ];

      for (let i = 0; i < categorySets.length; i++) {
        await testPrisma.dailyFortune.create({
          data: {
            userId: user.id,
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
            zodiacSign: "aquarius",
            overallScore: 80,
            content: JSON.stringify({ categories: categorySets[i] }),
          },
        });
      }

      const horoscopes = await testPrisma.dailyFortune.findMany({
        where: { userId: user.id },
      });

      const categoryTotals: Record<string, number> = { love: 0, career: 0, health: 0 };

      for (const h of horoscopes) {
        const content = JSON.parse(h.content as string);
        for (const [cat, score] of Object.entries(content.categories)) {
          categoryTotals[cat] += score as number;
        }
      }

      const bestCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0][0];
      expect(bestCategory).toBe("love");
    });
  });

  describe("Horoscope Updates", () => {
    it("updates horoscope content", async () => {
      const user = await createTestUserInDb();

      const horoscope = await testPrisma.dailyFortune.create({
        data: {
          userId: user.id,
          date: new Date(),
          zodiacSign: "pisces",
          overallScore: 75,
          content: JSON.stringify({ version: 1 }),
        },
      });

      const updated = await testPrisma.dailyFortune.update({
        where: { id: horoscope.id },
        data: {
          overallScore: 80,
          content: JSON.stringify({ version: 2, updated: true }),
        },
      });

      expect(updated.overallScore).toBe(80);
    });
  });

  describe("Horoscope Deletion", () => {
    it("deletes old horoscopes", async () => {
      const user = await createTestUserInDb();
      const now = new Date();

      // Old horoscopes
      for (let i = 0; i < 3; i++) {
        await testPrisma.dailyFortune.create({
          data: {
            userId: user.id,
            date: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000),
            zodiacSign: "aries",
            overallScore: 75,
            content: "{}",
          },
        });
      }

      // Recent horoscopes
      for (let i = 0; i < 2; i++) {
        await testPrisma.dailyFortune.create({
          data: {
            userId: user.id,
            date: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
            zodiacSign: "aries",
            overallScore: 80,
            content: "{}",
          },
        });
      }

      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      await testPrisma.dailyFortune.deleteMany({
        where: {
          userId: user.id,
          date: { lt: ninetyDaysAgo },
        },
      });

      const remaining = await testPrisma.dailyFortune.findMany({
        where: { userId: user.id },
      });

      expect(remaining).toHaveLength(2);
    });
  });
});
