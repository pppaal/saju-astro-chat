/**
 * Tarot Reading Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 타로 리딩 생성 및 저장
 * - 타로 카드 데이터 검증
 * - 리딩 히스토리 관리
 *
 * 실행: npm run test:integration
 * 환경변수 필요: TEST_DATABASE_URL 또는 DATABASE_URL
 */

import { beforeAll, afterAll, afterEach, describe, it, expect } from "vitest";
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

describe("Integration: Tarot Reading System", () => {
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

  describe("Tarot Reading Creation", () => {
    it("creates a basic tarot reading", async () => {
      const user = await createTestUserInDb();

      const reading = await testPrisma.tarotReading.create({
        data: {
          userId: user.id,
          question: "What does my future hold?",
          spreadId: "three-card",
          spreadTitle: "Three Card Spread",
          cards: [
            { position: "past", cardId: "the-fool", isReversed: false },
            { position: "present", cardId: "the-magician", isReversed: true },
            { position: "future", cardId: "the-high-priestess", isReversed: false },
          ],
          overallMessage: "A journey of self-discovery awaits...",
        },
      });

      expect(reading).toBeDefined();
      expect(reading.userId).toBe(user.id);
      expect(reading.question).toBe("What does my future hold?");
      expect(reading.spreadId).toBe("three-card");
      expect(reading.createdAt).toBeInstanceOf(Date);
    });

    it("stores complex spread readings", async () => {
      const user = await createTestUserInDb();

      const celticCrossCards = [
        { position: "present", cardId: "the-sun", isReversed: false },
        { position: "challenge", cardId: "the-tower", isReversed: true },
        { position: "foundation", cardId: "the-emperor", isReversed: false },
        { position: "past", cardId: "the-empress", isReversed: false },
        { position: "crown", cardId: "the-star", isReversed: false },
        { position: "future", cardId: "the-moon", isReversed: true },
        { position: "self", cardId: "strength", isReversed: false },
        { position: "environment", cardId: "the-world", isReversed: false },
        { position: "hopes", cardId: "the-lovers", isReversed: false },
        { position: "outcome", cardId: "wheel-of-fortune", isReversed: false },
      ];

      const reading = await testPrisma.tarotReading.create({
        data: {
          userId: user.id,
          question: "What should I know about my career path?",
          spreadId: "celtic-cross",
          spreadTitle: "Celtic Cross",
          cards: celticCrossCards,
          overallMessage: "The Celtic Cross reveals a transformative journey...",
        },
      });

      const parsedCards = reading.cards as { position: string; cardId: string }[];
      expect(parsedCards).toHaveLength(10);
      expect(parsedCards[0].position).toBe("present");
      expect(parsedCards[1].cardId).toBe("the-tower");
    });

    it("handles reversed cards correctly", async () => {
      const user = await createTestUserInDb();

      const reading = await testPrisma.tarotReading.create({
        data: {
          userId: user.id,
          question: "Love reading",
          spreadId: "single",
          spreadTitle: "Single Card",
          cards: [
            { position: "single", cardId: "the-lovers", isReversed: true },
          ],
        },
      });

      const parsedCards = reading.cards as { isReversed: boolean }[];
      expect(parsedCards[0].isReversed).toBe(true);
    });
  });

  describe("Tarot Reading Retrieval", () => {
    it("retrieves user's reading history", async () => {
      const user = await createTestUserInDb();

      // Create multiple readings
      for (let i = 0; i < 5; i++) {
        await testPrisma.tarotReading.create({
          data: {
            userId: user.id,
            question: `Question ${i + 1}`,
            spreadId: "three-card",
            spreadTitle: "Three Card Spread",
            cards: [{ cardId: `card-${i}` }],
          },
        });
      }

      const readings = await testPrisma.tarotReading.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });

      expect(readings).toHaveLength(5);
      expect(readings[0].question).toBe("Question 5");
    });

    it("filters readings by theme", async () => {
      const user = await createTestUserInDb();

      await testPrisma.tarotReading.create({
        data: {
          userId: user.id,
          question: "Q1",
          spreadId: "single",
          spreadTitle: "Single Card",
          theme: "love",
          cards: [],
        },
      });

      await testPrisma.tarotReading.create({
        data: {
          userId: user.id,
          question: "Q2",
          spreadId: "three-card",
          spreadTitle: "Three Card",
          theme: "career",
          cards: [],
        },
      });

      await testPrisma.tarotReading.create({
        data: {
          userId: user.id,
          question: "Q3",
          spreadId: "single",
          spreadTitle: "Single Card",
          theme: "love",
          cards: [],
        },
      });

      const loveReadings = await testPrisma.tarotReading.findMany({
        where: { userId: user.id, theme: "love" },
      });

      expect(loveReadings).toHaveLength(2);
    });

    it("paginates reading history", async () => {
      const user = await createTestUserInDb();

      // Create 15 readings
      for (let i = 0; i < 15; i++) {
        await testPrisma.tarotReading.create({
          data: {
            userId: user.id,
            question: `Question ${i + 1}`,
            spreadId: "single",
            spreadTitle: "Single Card",
            cards: [],
          },
        });
      }

      const page1 = await testPrisma.tarotReading.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        skip: 0,
      });

      const page2 = await testPrisma.tarotReading.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        skip: 5,
      });

      expect(page1).toHaveLength(5);
      expect(page2).toHaveLength(5);
      expect(page1[0].id).not.toBe(page2[0].id);
    });
  });

  describe("Tarot Reading with Credits", () => {
    it("decrements credits when creating reading", async () => {
      const user = await createTestUserInDb();
      await createTestUserCredits(user.id, "starter");

      // Simulate credit consumption
      const creditsBefore = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      });

      // Create reading and consume credit
      await testPrisma.$transaction(async (tx) => {
        await tx.tarotReading.create({
          data: {
            userId: user.id,
            question: "Will I find love?",
            spreadId: "three-card",
            spreadTitle: "Three Card Spread",
            cards: [],
          },
        });

        await tx.userCredits.update({
          where: { userId: user.id },
          data: { usedCredits: { increment: 1 } },
        });
      });

      const creditsAfter = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      });

      expect(creditsAfter!.usedCredits).toBe(creditsBefore!.usedCredits + 1);
    });

    it("prevents reading creation when no credits remain", async () => {
      const user = await createTestUserInDb();
      await createTestUserCredits(user.id, "free");

      // Use all credits
      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: { usedCredits: 7 }, // Max for free plan
      });

      // Attempt to create reading with credit check
      const result = await testPrisma.$transaction(async (tx) => {
        const credits = await tx.userCredits.findUnique({
          where: { userId: user.id },
        });

        const remaining =
          (credits?.monthlyCredits || 0) -
          (credits?.usedCredits || 0) +
          (credits?.bonusCredits || 0);

        if (remaining <= 0) {
          return { success: false, reason: "No credits available" };
        }

        await tx.tarotReading.create({
          data: {
            userId: user.id,
            question: "Question",
            spreadId: "single",
            spreadTitle: "Single Card",
            cards: [],
          },
        });

        return { success: true };
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe("No credits available");
    });
  });

  describe("Reading Update and Delete", () => {
    it("updates reading overall message", async () => {
      const user = await createTestUserInDb();

      const reading = await testPrisma.tarotReading.create({
        data: {
          userId: user.id,
          question: "Question",
          spreadId: "single",
          spreadTitle: "Single Card",
          cards: [{ cardId: "the-fool" }],
          overallMessage: "Initial interpretation",
        },
      });

      const updated = await testPrisma.tarotReading.update({
        where: { id: reading.id },
        data: { overallMessage: "Updated interpretation with more detail" },
      });

      expect(updated.overallMessage).toBe("Updated interpretation with more detail");
    });

    it("deletes a reading", async () => {
      const user = await createTestUserInDb();

      const reading = await testPrisma.tarotReading.create({
        data: {
          userId: user.id,
          question: "To be deleted",
          spreadId: "single",
          spreadTitle: "Single Card",
          cards: [],
        },
      });

      await testPrisma.tarotReading.delete({
        where: { id: reading.id },
      });

      const found = await testPrisma.tarotReading.findUnique({
        where: { id: reading.id },
      });

      expect(found).toBeNull();
    });

    it("cascades delete when user is deleted", async () => {
      const userData = {
        id: `test_tarot_${Date.now()}`,
        email: `tarot_${Date.now()}@test.example.com`,
        name: "Tarot Test User",
      };

      const user = await testPrisma.user.create({ data: userData });

      await testPrisma.tarotReading.create({
        data: {
          userId: user.id,
          question: "Question 1",
          spreadId: "single",
          spreadTitle: "Single Card",
          cards: [],
        },
      });

      await testPrisma.tarotReading.create({
        data: {
          userId: user.id,
          question: "Question 2",
          spreadId: "three-card",
          spreadTitle: "Three Card",
          cards: [],
        },
      });

      // Delete user
      await testPrisma.user.delete({ where: { id: user.id } });

      // Verify readings are also deleted
      const readings = await testPrisma.tarotReading.findMany({
        where: { userId: user.id },
      });

      expect(readings).toHaveLength(0);
    });
  });

  describe("Theme-based Filtering", () => {
    it("associates reading with theme", async () => {
      const user = await createTestUserInDb();

      const reading = await testPrisma.tarotReading.create({
        data: {
          userId: user.id,
          question: "Career advice",
          spreadId: "three-card",
          spreadTitle: "Three Card Spread",
          cards: [],
          theme: "career",
        },
      });

      expect(reading.theme).toBe("career");
    });

    it("filters readings by theme", async () => {
      const user = await createTestUserInDb();

      await testPrisma.tarotReading.create({
        data: {
          userId: user.id,
          question: "Love question",
          spreadId: "single",
          spreadTitle: "Single Card",
          cards: [],
          theme: "love",
        },
      });

      await testPrisma.tarotReading.create({
        data: {
          userId: user.id,
          question: "Career question",
          spreadId: "single",
          spreadTitle: "Single Card",
          cards: [],
          theme: "career",
        },
      });

      const loveReadings = await testPrisma.tarotReading.findMany({
        where: { userId: user.id, theme: "love" },
      });

      expect(loveReadings).toHaveLength(1);
      expect(loveReadings[0].question).toBe("Love question");
    });
  });
});
