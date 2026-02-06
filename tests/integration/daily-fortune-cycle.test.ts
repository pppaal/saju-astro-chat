/**
 * Daily Fortune Cycle Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 일일 운세 생성 및 조회
 * - 운세 점수 관리
 * - 날짜별 운세 트래킹
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

describe("Integration: Daily Fortune Cycle", () => {
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

  describe("Daily Fortune Creation", () => {
    it("creates daily fortune with all scores", async () => {
      const user = await createTestUserInDb();
      const today = new Date().toISOString().split("T")[0];

      const fortune = await testPrisma.dailyFortune.create({
        data: {
          userId: user.id,
          date: today,
          loveScore: 85,
          careerScore: 72,
          wealthScore: 68,
          healthScore: 90,
          overallScore: 79,
          luckyColor: "blue",
          luckyNumber: 7,
        },
      });

      expect(fortune).toBeDefined();
      expect(fortune.loveScore).toBe(85);
      expect(fortune.careerScore).toBe(72);
      expect(fortune.wealthScore).toBe(68);
      expect(fortune.healthScore).toBe(90);
      expect(fortune.overallScore).toBe(79);
    });

    it("stores lucky items", async () => {
      const user = await createTestUserInDb();
      const today = new Date().toISOString().split("T")[0];

      const fortune = await testPrisma.dailyFortune.create({
        data: {
          userId: user.id,
          date: today,
          loveScore: 70,
          careerScore: 75,
          wealthScore: 80,
          healthScore: 65,
          overallScore: 73,
          luckyColor: "green",
          luckyNumber: 3,
          luckyDirection: "동쪽",
        },
      });

      expect(fortune.luckyColor).toBe("green");
      expect(fortune.luckyNumber).toBe(3);
      expect(fortune.luckyDirection).toBe("동쪽");
    });

    it("prevents duplicate fortune for same date", async () => {
      const user = await createTestUserInDb();
      const today = new Date().toISOString().split("T")[0];

      await testPrisma.dailyFortune.create({
        data: {
          userId: user.id,
          date: today,
          loveScore: 80,
          careerScore: 75,
          wealthScore: 70,
          healthScore: 85,
          overallScore: 78,
        },
      });

      // Use upsert for same date
      const upserted = await testPrisma.dailyFortune.upsert({
        where: {
          userId_date: { userId: user.id, date: today },
        },
        create: {
          userId: user.id,
          date: today,
          loveScore: 90,
          careerScore: 85,
          wealthScore: 80,
          healthScore: 95,
          overallScore: 88,
        },
        update: {
          overallScore: 88,
        },
      });

      expect(upserted.overallScore).toBe(88);

      const count = await testPrisma.dailyFortune.count({
        where: { userId: user.id, date: today },
      });
      expect(count).toBe(1);
    });
  });

  describe("Fortune Retrieval", () => {
    it("retrieves fortune for specific date", async () => {
      const user = await createTestUserInDb();
      const targetDate = "2024-06-15";

      await testPrisma.dailyFortune.create({
        data: {
          userId: user.id,
          date: targetDate,
          loveScore: 75,
          careerScore: 80,
          wealthScore: 70,
          healthScore: 85,
          overallScore: 78,
        },
      });

      const fortune = await testPrisma.dailyFortune.findFirst({
        where: { userId: user.id, date: targetDate },
      });

      expect(fortune).not.toBeNull();
      expect(fortune?.date).toBe(targetDate);
    });

    it("retrieves week of fortunes", async () => {
      const user = await createTestUserInDb();

      // Create 7 days of fortune
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];

        await testPrisma.dailyFortune.create({
          data: {
            userId: user.id,
            date: dateStr,
            loveScore: 70 + i,
            careerScore: 75 + i,
            wealthScore: 65 + i,
            healthScore: 80 + i,
            overallScore: 73 + i,
          },
        });
      }

      const fortunes = await testPrisma.dailyFortune.findMany({
        where: { userId: user.id },
        orderBy: { date: "desc" },
      });

      expect(fortunes).toHaveLength(7);
    });

    it("retrieves month of fortunes", async () => {
      const user = await createTestUserInDb();

      // Create 30 days of fortune
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];

        await testPrisma.dailyFortune.create({
          data: {
            userId: user.id,
            date: dateStr,
            loveScore: Math.floor(Math.random() * 30) + 70,
            careerScore: Math.floor(Math.random() * 30) + 70,
            wealthScore: Math.floor(Math.random() * 30) + 70,
            healthScore: Math.floor(Math.random() * 30) + 70,
            overallScore: Math.floor(Math.random() * 30) + 70,
          },
        });
      }

      const fortunes = await testPrisma.dailyFortune.findMany({
        where: { userId: user.id },
      });

      expect(fortunes).toHaveLength(30);
    });
  });

  describe("Fortune Analysis", () => {
    it("calculates average scores over period", async () => {
      const user = await createTestUserInDb();

      const scores = [75, 80, 85, 70, 90];

      for (let i = 0; i < scores.length; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];

        await testPrisma.dailyFortune.create({
          data: {
            userId: user.id,
            date: dateStr,
            loveScore: scores[i],
            careerScore: scores[i],
            wealthScore: scores[i],
            healthScore: scores[i],
            overallScore: scores[i],
          },
        });
      }

      const fortunes = await testPrisma.dailyFortune.findMany({
        where: { userId: user.id },
      });

      const avgScore =
        fortunes.reduce((sum, f) => sum + f.overallScore, 0) / fortunes.length;

      expect(avgScore).toBe(80);
    });

    it("finds best and worst days", async () => {
      const user = await createTestUserInDb();

      const scores = [65, 90, 75, 55, 85];

      for (let i = 0; i < scores.length; i++) {
        await testPrisma.dailyFortune.create({
          data: {
            userId: user.id,
            date: `2024-06-${String(i + 1).padStart(2, "0")}`,
            loveScore: scores[i],
            careerScore: scores[i],
            wealthScore: scores[i],
            healthScore: scores[i],
            overallScore: scores[i],
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

      // Increasing trend
      const trendScores = [60, 65, 70, 75, 80, 85, 90];

      for (let i = 0; i < trendScores.length; i++) {
        await testPrisma.dailyFortune.create({
          data: {
            userId: user.id,
            date: `2024-06-${String(i + 1).padStart(2, "0")}`,
            loveScore: trendScores[i],
            careerScore: trendScores[i],
            wealthScore: trendScores[i],
            healthScore: trendScores[i],
            overallScore: trendScores[i],
          },
        });
      }

      const fortunes = await testPrisma.dailyFortune.findMany({
        where: { userId: user.id },
        orderBy: { date: "asc" },
      });

      const firstScore = fortunes[0].overallScore;
      const lastScore = fortunes[fortunes.length - 1].overallScore;

      expect(lastScore).toBeGreaterThan(firstScore);
    });
  });

  describe("Score Category Analysis", () => {
    it("identifies strong categories", async () => {
      const user = await createTestUserInDb();

      await testPrisma.dailyFortune.create({
        data: {
          userId: user.id,
          date: "2024-06-15",
          loveScore: 95,
          careerScore: 70,
          wealthScore: 65,
          healthScore: 80,
          overallScore: 78,
        },
      });

      const fortune = await testPrisma.dailyFortune.findFirst({
        where: { userId: user.id },
      });

      const scores = {
        love: fortune!.loveScore,
        career: fortune!.careerScore,
        wealth: fortune!.wealthScore,
        health: fortune!.healthScore,
      };

      const strongest = Object.entries(scores).reduce((a, b) =>
        a[1] > b[1] ? a : b
      );

      expect(strongest[0]).toBe("love");
      expect(strongest[1]).toBe(95);
    });

    it("identifies weak categories", async () => {
      const user = await createTestUserInDb();

      await testPrisma.dailyFortune.create({
        data: {
          userId: user.id,
          date: "2024-06-15",
          loveScore: 80,
          careerScore: 85,
          wealthScore: 55,
          healthScore: 75,
          overallScore: 74,
        },
      });

      const fortune = await testPrisma.dailyFortune.findFirst({
        where: { userId: user.id },
      });

      const scores = {
        love: fortune!.loveScore,
        career: fortune!.careerScore,
        wealth: fortune!.wealthScore,
        health: fortune!.healthScore,
      };

      const weakest = Object.entries(scores).reduce((a, b) =>
        a[1] < b[1] ? a : b
      );

      expect(weakest[0]).toBe("wealth");
      expect(weakest[1]).toBe(55);
    });
  });

  describe("Fortune Comparison", () => {
    it("compares today vs yesterday", async () => {
      const user = await createTestUserInDb();

      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      await testPrisma.dailyFortune.create({
        data: {
          userId: user.id,
          date: yesterday,
          loveScore: 70,
          careerScore: 75,
          wealthScore: 65,
          healthScore: 80,
          overallScore: 73,
        },
      });

      await testPrisma.dailyFortune.create({
        data: {
          userId: user.id,
          date: today,
          loveScore: 85,
          careerScore: 80,
          wealthScore: 75,
          healthScore: 85,
          overallScore: 81,
        },
      });

      const yesterdayFortune = await testPrisma.dailyFortune.findFirst({
        where: { userId: user.id, date: yesterday },
      });

      const todayFortune = await testPrisma.dailyFortune.findFirst({
        where: { userId: user.id, date: today },
      });

      const improvement =
        todayFortune!.overallScore - yesterdayFortune!.overallScore;

      expect(improvement).toBe(8);
    });

    it("compares user fortunes for same date", async () => {
      const user1 = await createTestUserInDb();
      const user2 = await createTestUserInDb();
      const today = new Date().toISOString().split("T")[0];

      await testPrisma.dailyFortune.create({
        data: {
          userId: user1.id,
          date: today,
          loveScore: 80,
          careerScore: 75,
          wealthScore: 70,
          healthScore: 85,
          overallScore: 78,
        },
      });

      await testPrisma.dailyFortune.create({
        data: {
          userId: user2.id,
          date: today,
          loveScore: 70,
          careerScore: 85,
          wealthScore: 80,
          healthScore: 75,
          overallScore: 78,
        },
      });

      const fortunes = await testPrisma.dailyFortune.findMany({
        where: { date: today, userId: { in: [user1.id, user2.id] } },
      });

      expect(fortunes).toHaveLength(2);
      expect(fortunes[0].overallScore).toBe(fortunes[1].overallScore);
    });
  });
});
