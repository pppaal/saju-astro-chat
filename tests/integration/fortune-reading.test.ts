/**
 * Fortune Reading Integration Tests
 * Tests fortune reading, tarot, and daily fortune features
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  testPrisma,
  createTestUserInDb,
  createTestUserCredits,
  cleanupAllTestUsers,
  checkTestDbConnection,
  connectTestDb,
  disconnectTestDb,
} from "./setup";

const hasTestDb = await checkTestDbConnection();

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

describe("Fortune Reading Integration", () => {
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

  describe("Daily Fortune", () => {
    it("should create daily fortune for user", async () => {
      const user = await createTestUserInDb({
        birthDate: "1990-05-15",
      });

      const today = new Date();
      const todayStr = formatDate(today);
      const dailyFortune = await testPrisma.dailyFortune.create({
        data: {
          userId: user.id,
          date: todayStr,
          loveScore: 85,
          careerScore: 80,
          wealthScore: 75,
          healthScore: 90,
          overallScore: 83,
          luckyColor: "blue",
          luckyNumber: 7,
        },
      });

      expect(dailyFortune).toBeDefined();
      expect(dailyFortune.overallScore).toBe(83);
      expect(dailyFortune.loveScore).toBe(85);
      expect(dailyFortune.luckyColor).toBe("blue");
      expect(dailyFortune.luckyNumber).toBe(7);
    });

    it("should retrieve today's fortune for user", async () => {
      const user = await createTestUserInDb();
      const today = new Date();
      const todayStr = formatDate(today);

      await testPrisma.dailyFortune.create({
        data: {
          userId: user.id,
          date: todayStr,
          loveScore: 70,
          careerScore: 72,
          wealthScore: 74,
          healthScore: 76,
          overallScore: 75,
          luckyColor: "red",
          luckyNumber: 3,
        },
      });

      const fortune = await testPrisma.dailyFortune.findFirst({
        where: {
          userId: user.id,
          date: todayStr,
        },
      });

      expect(fortune).toBeDefined();
      expect(fortune?.overallScore).toBe(75);
    });

    it("should track fortune history", async () => {
      const user = await createTestUserInDb();
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const todayStr = formatDate(today);
      const yesterdayStr = formatDate(yesterday);

      await testPrisma.dailyFortune.createMany({
        data: [
          {
            userId: user.id,
            date: yesterdayStr,
            loveScore: 68,
            careerScore: 70,
            wealthScore: 72,
            healthScore: 74,
            overallScore: 70,
            luckyColor: "green",
            luckyNumber: 5,
          },
          {
            userId: user.id,
            date: todayStr,
            loveScore: 84,
            careerScore: 86,
            wealthScore: 82,
            healthScore: 88,
            overallScore: 85,
            luckyColor: "blue",
            luckyNumber: 7,
          },
        ],
      });

      const history = await testPrisma.dailyFortune.findMany({
        where: { userId: user.id },
        orderBy: { date: "desc" },
      });

      expect(history.length).toBe(2);
      expect(history[0].overallScore).toBe(85); // Today
      expect(history[1].overallScore).toBe(70); // Yesterday
    });
  });

  describe("Tarot Reading", () => {
    it("should create tarot reading with cards", async () => {
      const user = await createTestUserInDb();
      await createTestUserCredits(user.id, "pro");

      const tarotReading = await testPrisma.tarotReading.create({
        data: {
          userId: user.id,
          question: "What does my future hold?",
          theme: "general",
          spreadId: "three-card",
          spreadTitle: "Three Card Spread",
          cards: [
            { name: "The Fool", position: "past" },
            { name: "The Magician", position: "present" },
            { name: "The Empress", position: "future" },
          ],
          overallMessage: "A journey of self-discovery awaits",
        },
      });

      expect(tarotReading).toBeDefined();
      expect(tarotReading.question).toBe("What does my future hold?");
      expect(tarotReading.spreadId).toBe("three-card");

      const cards = tarotReading.cards as Array<{ name: string }>;
      expect(cards.length).toBe(3);
      expect(cards[0].name).toBe("The Fool");
    });

    it("should save tarot reading to user history", async () => {
      const user = await createTestUserInDb();
      await createTestUserCredits(user.id, "starter");

      await testPrisma.tarotReading.create({
        data: {
          userId: user.id,
          question: "Should I change careers?",
          theme: "career",
          spreadId: "single-card",
          spreadTitle: "Single Card",
          cards: [{ name: "The Tower", position: "outcome" }],
          overallMessage: "Major changes are coming",
        },
      });

      const readings = await testPrisma.tarotReading.findMany({
        where: { userId: user.id },
      });

      expect(readings.length).toBe(1);
      expect(readings[0].question).toBe("Should I change careers?");
    });

    it("should retrieve tarot reading by ID", async () => {
      const user = await createTestUserInDb();

      const created = await testPrisma.tarotReading.create({
        data: {
          userId: user.id,
          question: "Test question",
          theme: "general",
          spreadId: "celtic-cross",
          spreadTitle: "Celtic Cross",
          cards: [],
          overallMessage: "Test interpretation",
        },
      });

      const retrieved = await testPrisma.tarotReading.findUnique({
        where: { id: created.id },
      });

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.question).toBe("Test question");
    });

    it("should support different spread types", async () => {
      const user = await createTestUserInDb();

      const spreads = ["single-card", "three-card", "celtic-cross", "relationship"];

      for (const spread of spreads) {
        await testPrisma.tarotReading.create({
          data: {
            userId: user.id,
            question: `Question for ${spread}`,
            theme: "general",
            spreadId: spread,
            spreadTitle: `${spread} spread`,
            cards: [],
            overallMessage: "Test",
          },
        });
      }

      const readings = await testPrisma.tarotReading.findMany({
        where: { userId: user.id },
      });

      expect(readings.length).toBe(spreads.length);
      const retrievedSpreads = readings.map((r) => r.spreadId);
      expect(retrievedSpreads.sort()).toEqual(spreads.sort());
    });
  });

  describe("Fortune Reading", () => {
    it("should create generic fortune reading", async () => {
      const user = await createTestUserInDb();
      const today = new Date();

      const fortune = await testPrisma.fortune.create({
        data: {
          userId: user.id,
          kind: "weekly",
          date: today,
          content: JSON.stringify({
            overview: "A week of growth and opportunity",
            lucky_days: ["Monday", "Wednesday"],
            challenges: ["Thursday"],
          }),
        },
      });

      expect(fortune).toBeDefined();
      expect(fortune.kind).toBe("weekly");

      const content = JSON.parse(fortune.content as string);
      expect(content.overview).toBeDefined();
      expect(content.lucky_days.length).toBe(2);
    });

    it("should support different fortune types", async () => {
      const user = await createTestUserInDb();
      const today = new Date();

      const types = ["daily", "weekly", "monthly", "yearly"];

      for (const type of types) {
        await testPrisma.fortune.create({
          data: {
            userId: user.id,
            kind: type,
            date: today,
            content: JSON.stringify({ message: `${type} fortune` }),
          },
        });
      }

      const fortunes = await testPrisma.fortune.findMany({
        where: { userId: user.id },
      });

      expect(fortunes.length).toBe(types.length);
    });

    it("should query fortunes by type and date", async () => {
      const user = await createTestUserInDb();
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      await testPrisma.fortune.create({
        data: {
          userId: user.id,
          kind: "daily",
          date: today,
          content: JSON.stringify({ message: "Today's fortune" }),
        },
      });

      const dailyFortunes = await testPrisma.fortune.findMany({
        where: {
          userId: user.id,
          kind: "daily",
          date: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      });

      expect(dailyFortunes.length).toBe(1);
      expect(dailyFortunes[0].kind).toBe("daily");
    });
  });

  describe("Reading History Management", () => {
    it("should delete old readings based on retention period", async () => {
      const user = await createTestUserInDb();
      await createTestUserCredits(user.id, "free"); // 7 days retention

      const now = new Date();
      const oldDate = new Date(now);
      oldDate.setDate(oldDate.getDate() - 30); // 30 days ago

      await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: "saju",
          content: JSON.stringify({ test: "old" }),
          createdAt: oldDate,
        },
      });

      await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: "saju",
          content: JSON.stringify({ test: "recent" }),
          createdAt: now,
        },
      });

      // Simulate cleanup (would be done by cron job)
      const retentionDate = new Date(now);
      retentionDate.setDate(retentionDate.getDate() - 7);

      const oldReadings = await testPrisma.reading.findMany({
        where: {
          userId: user.id,
          createdAt: {
            lt: retentionDate,
          },
        },
      });

      expect(oldReadings.length).toBe(1);
      expect(JSON.parse(oldReadings[0].content as string).test).toBe("old");
    });

    it("should keep readings within retention period", async () => {
      const user = await createTestUserInDb();
      await createTestUserCredits(user.id, "pro"); // 90 days retention

      const now = new Date();
      const recentDate = new Date(now);
      recentDate.setDate(recentDate.getDate() - 30); // 30 days ago

      await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: "compatibility",
          content: JSON.stringify({ score: 85 }),
          createdAt: recentDate,
        },
      });

      const retentionDate = new Date(now);
      retentionDate.setDate(retentionDate.getDate() - 90);

      const validReadings = await testPrisma.reading.findMany({
        where: {
          userId: user.id,
          createdAt: {
            gte: retentionDate,
          },
        },
      });

      expect(validReadings.length).toBe(1);
    });
  });

  describe("Fortune Sharing", () => {
    it("should mark reading as shared", async () => {
      const user = await createTestUserInDb();

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: "tarot",
          content: JSON.stringify({ cards: ["The Star"] }),
        },
      });

      // Update to mark as shared (would be done through API)
      const updated = await testPrisma.reading.update({
        where: { id: reading.id },
        data: { content: JSON.stringify({ cards: ["The Star"], shared: true }) },
      });

      const result = JSON.parse(updated.content as string);
      expect(result.shared).toBe(true);
    });
  });
});
