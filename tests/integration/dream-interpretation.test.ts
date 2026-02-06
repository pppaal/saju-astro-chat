/**
 * Dream Interpretation Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 꿈 해석 저장 및 조회
 * - 꿈 히스토리 관리
 * - 키워드 분석 저장
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

describe("Integration: Dream Interpretation System", () => {
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

  describe("Dream Reading Creation", () => {
    it("creates a basic dream interpretation", async () => {
      const user = await createTestUserInDb();

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: "dream",
          content: JSON.stringify({
            dreamText: "I was flying over mountains and saw a rainbow",
            interpretation: "Flying dreams often represent freedom and ambition...",
            symbols: ["flying", "mountains", "rainbow"],
            mood: "positive",
          }),
        },
      });

      expect(reading).toBeDefined();
      expect(reading.userId).toBe(user.id);
      expect(reading.type).toBe("dream");

      const content = JSON.parse(reading.content as string);
      expect(content.symbols).toContain("flying");
    });

    it("stores dream with multiple symbols", async () => {
      const user = await createTestUserInDb();

      const symbols = ["water", "fish", "boat", "storm", "lighthouse"];

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: "dream",
          content: JSON.stringify({
            dreamText: "I was on a boat in a storm, saw fish and a lighthouse",
            symbols,
            interpretation: "Water dreams relate to emotions...",
          }),
        },
      });

      const content = JSON.parse(reading.content as string);
      expect(content.symbols).toHaveLength(5);
      expect(content.symbols).toContain("lighthouse");
    });

    it("handles emotional analysis in dreams", async () => {
      const user = await createTestUserInDb();

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: "dream",
          content: JSON.stringify({
            dreamText: "I was running but couldn't move",
            interpretation: "This dream suggests feeling stuck...",
            emotionalAnalysis: {
              primaryEmotion: "anxiety",
              secondaryEmotions: ["frustration", "helplessness"],
              intensity: 7,
            },
          }),
        },
      });

      const content = JSON.parse(reading.content as string);
      expect(content.emotionalAnalysis.primaryEmotion).toBe("anxiety");
      expect(content.emotionalAnalysis.intensity).toBe(7);
    });
  });

  describe("Dream History Retrieval", () => {
    it("retrieves user dream history", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 5; i++) {
        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type: "dream",
            content: JSON.stringify({ dreamText: `Dream ${i + 1}` }),
          },
        });
      }

      const dreams = await testPrisma.reading.findMany({
        where: { userId: user.id, type: "dream" },
        orderBy: { createdAt: "desc" },
      });

      expect(dreams).toHaveLength(5);
    });

    it("separates dream readings from other types", async () => {
      const user = await createTestUserInDb();

      // Create mixed reading types
      await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: "dream",
          content: JSON.stringify({ dreamText: "Dream 1" }),
        },
      });

      await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: "saju",
          content: JSON.stringify({ sajuData: "Saju 1" }),
        },
      });

      await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: "dream",
          content: JSON.stringify({ dreamText: "Dream 2" }),
        },
      });

      const dreams = await testPrisma.reading.findMany({
        where: { userId: user.id, type: "dream" },
      });

      const saju = await testPrisma.reading.findMany({
        where: { userId: user.id, type: "saju" },
      });

      expect(dreams).toHaveLength(2);
      expect(saju).toHaveLength(1);
    });

    it("paginates dream history", async () => {
      const user = await createTestUserInDb();

      // Create 15 dreams
      for (let i = 0; i < 15; i++) {
        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type: "dream",
            content: JSON.stringify({ dreamText: `Dream ${i + 1}` }),
          },
        });
      }

      const page1 = await testPrisma.reading.findMany({
        where: { userId: user.id, type: "dream" },
        orderBy: { createdAt: "desc" },
        take: 5,
        skip: 0,
      });

      const page2 = await testPrisma.reading.findMany({
        where: { userId: user.id, type: "dream" },
        orderBy: { createdAt: "desc" },
        take: 5,
        skip: 5,
      });

      expect(page1).toHaveLength(5);
      expect(page2).toHaveLength(5);
      expect(page1[0].id).not.toBe(page2[0].id);
    });
  });

  describe("Dream with Credits", () => {
    it("consumes credit when creating dream interpretation", async () => {
      const user = await createTestUserInDb();
      await createTestUserCredits(user.id, "starter");

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

        const reading = await tx.reading.create({
          data: {
            userId: user.id,
            type: "dream",
            content: JSON.stringify({ dreamText: "Flying dream" }),
          },
        });

        await tx.userCredits.update({
          where: { userId: user.id },
          data: { usedCredits: { increment: 1 } },
        });

        return { success: true, reading };
      });

      expect(result.success).toBe(true);

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      });
      expect(credits?.usedCredits).toBe(1);
    });

    it("prevents dream creation when credits exhausted", async () => {
      const user = await createTestUserInDb();
      await createTestUserCredits(user.id, "free");

      // Exhaust all credits
      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: { usedCredits: 7 },
      });

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

        return { success: true };
      });

      expect(result.success).toBe(false);
    });
  });

  describe("Dream Symbol Analysis", () => {
    it("stores recurring symbol patterns", async () => {
      const user = await createTestUserInDb();

      // Create multiple dreams with overlapping symbols
      const dreamSymbols = [
        ["water", "fish", "ocean"],
        ["water", "rain", "flood"],
        ["water", "river", "bridge"],
      ];

      for (const symbols of dreamSymbols) {
        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type: "dream",
            content: JSON.stringify({
              dreamText: "Water dream",
              symbols,
            }),
          },
        });
      }

      // Retrieve all dreams to analyze common symbols
      const dreams = await testPrisma.reading.findMany({
        where: { userId: user.id, type: "dream" },
      });

      const allSymbols = dreams.flatMap((d) => {
        const content = JSON.parse(d.content as string);
        return content.symbols || [];
      });

      const symbolCounts = allSymbols.reduce(
        (acc: Record<string, number>, sym: string) => {
          acc[sym] = (acc[sym] || 0) + 1;
          return acc;
        },
        {}
      );

      // Water appears in all 3 dreams
      expect(symbolCounts["water"]).toBe(3);
    });

    it("tracks dream frequency over time", async () => {
      const user = await createTestUserInDb();

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Create dreams from last week
      for (let i = 0; i < 3; i++) {
        const date = new Date(oneWeekAgo.getTime() + i * 24 * 60 * 60 * 1000);
        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type: "dream",
            content: JSON.stringify({ dreamText: `Old dream ${i}` }),
            createdAt: date,
          },
        });
      }

      // Create recent dreams
      await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: "dream",
          content: JSON.stringify({ dreamText: "Recent dream" }),
          createdAt: now,
        },
      });

      const lastWeekDreams = await testPrisma.reading.findMany({
        where: {
          userId: user.id,
          type: "dream",
          createdAt: { gte: oneWeekAgo },
        },
      });

      expect(lastWeekDreams.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("Dream Update and Delete", () => {
    it("updates dream interpretation", async () => {
      const user = await createTestUserInDb();

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: "dream",
          content: JSON.stringify({
            dreamText: "Flying dream",
            interpretation: "Initial interpretation",
          }),
        },
      });

      const updated = await testPrisma.reading.update({
        where: { id: reading.id },
        data: {
          content: JSON.stringify({
            dreamText: "Flying dream",
            interpretation: "Updated interpretation with more detail",
          }),
        },
      });

      const content = JSON.parse(updated.content as string);
      expect(content.interpretation).toContain("Updated");
    });

    it("deletes dream reading", async () => {
      const user = await createTestUserInDb();

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: "dream",
          content: JSON.stringify({ dreamText: "To delete" }),
        },
      });

      await testPrisma.reading.delete({
        where: { id: reading.id },
      });

      const found = await testPrisma.reading.findUnique({
        where: { id: reading.id },
      });

      expect(found).toBeNull();
    });

    it("cascades delete when user is deleted", async () => {
      const userData = {
        id: `test_dream_${Date.now()}`,
        email: `dream_${Date.now()}@test.example.com`,
        name: "Dream Test User",
      };

      const user = await testPrisma.user.create({ data: userData });

      await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: "dream",
          content: JSON.stringify({ dreamText: "Dream 1" }),
        },
      });

      await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: "dream",
          content: JSON.stringify({ dreamText: "Dream 2" }),
        },
      });

      // Delete user
      await testPrisma.user.delete({ where: { id: user.id } });

      // Verify dreams are deleted
      const dreams = await testPrisma.reading.findMany({
        where: { userId: user.id, type: "dream" },
      });

      expect(dreams).toHaveLength(0);
    });
  });

  describe("Dream Statistics", () => {
    it("counts total dream interpretations", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 10; i++) {
        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type: "dream",
            content: JSON.stringify({ dreamText: `Dream ${i}` }),
          },
        });
      }

      const count = await testPrisma.reading.count({
        where: { userId: user.id, type: "dream" },
      });

      expect(count).toBe(10);
    });

    it("calculates average symbol count", async () => {
      const user = await createTestUserInDb();

      const symbolCounts = [3, 5, 2, 4, 6];

      for (const count of symbolCounts) {
        const symbols = Array.from({ length: count }, (_, i) => `symbol${i}`);
        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type: "dream",
            content: JSON.stringify({ dreamText: "Dream", symbols }),
          },
        });
      }

      const dreams = await testPrisma.reading.findMany({
        where: { userId: user.id, type: "dream" },
      });

      const totalSymbols = dreams.reduce((sum, d) => {
        const content = JSON.parse(d.content as string);
        return sum + (content.symbols?.length || 0);
      }, 0);

      const average = totalSymbols / dreams.length;
      expect(average).toBe(4); // (3+5+2+4+6)/5 = 20/5 = 4
    });
  });
});
