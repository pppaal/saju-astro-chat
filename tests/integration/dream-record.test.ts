/**
 * Dream Record Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 꿈 해몽 결과 저장
 * - 꿈 기록 히스토리
 * - 꿈 분석 통계
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

describe("Integration: Dream Record", () => {
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

  describe("Dream Recording", () => {
    it("records dream with interpretation", async () => {
      const user = await createTestUserInDb();

      const dream = await testPrisma.dreamRecord.create({
        data: {
          userId: user.id,
          dreamContent: "하늘을 나는 꿈을 꿨습니다",
          interpretation: "자유와 해방을 갈망하는 마음을 나타냅니다",
          category: "flying",
          sentiment: "positive",
        },
      });

      expect(dream.category).toBe("flying");
      expect(dream.sentiment).toBe("positive");
    });

    it("records dream with symbols", async () => {
      const user = await createTestUserInDb();

      const dream = await testPrisma.dreamRecord.create({
        data: {
          userId: user.id,
          dreamContent: "물속에서 헤엄치는 꿈",
          interpretation: "감정의 깊이를 탐험하고 있습니다",
          category: "water",
          sentiment: "neutral",
          symbols: ["water", "swimming", "depth"],
          symbolMeanings: {
            water: "감정, 무의식",
            swimming: "감정 탐험",
            depth: "깊은 자아",
          },
        },
      });

      expect(dream.symbols).toContain("water");
    });

    it("records dream with lucky numbers", async () => {
      const user = await createTestUserInDb();

      const dream = await testPrisma.dreamRecord.create({
        data: {
          userId: user.id,
          dreamContent: "복권에 당첨되는 꿈",
          interpretation: "재물 운이 상승하는 시기입니다",
          category: "money",
          sentiment: "positive",
          luckyNumbers: [7, 14, 23, 36, 42],
          fortuneRating: 9,
        },
      });

      expect(dream.luckyNumbers).toHaveLength(5);
      expect(dream.fortuneRating).toBe(9);
    });

    it("records nightmare", async () => {
      const user = await createTestUserInDb();

      const dream = await testPrisma.dreamRecord.create({
        data: {
          userId: user.id,
          dreamContent: "쫓기는 악몽을 꿨습니다",
          interpretation: "현실에서 피하고 싶은 문제가 있음을 나타냅니다",
          category: "chase",
          sentiment: "negative",
          isNightmare: true,
          anxietyLevel: 8,
        },
      });

      expect(dream.isNightmare).toBe(true);
      expect(dream.anxietyLevel).toBe(8);
    });

    it("records recurring dream", async () => {
      const user = await createTestUserInDb();

      const dream = await testPrisma.dreamRecord.create({
        data: {
          userId: user.id,
          dreamContent: "시험을 치르는 꿈이 반복됩니다",
          interpretation: "성과에 대한 불안감이 있습니다",
          category: "exam",
          sentiment: "negative",
          isRecurring: true,
          recurringCount: 5,
        },
      });

      expect(dream.isRecurring).toBe(true);
      expect(dream.recurringCount).toBe(5);
    });
  });

  describe("Dream Retrieval", () => {
    it("retrieves dreams by user", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 5; i++) {
        await testPrisma.dreamRecord.create({
          data: {
            userId: user.id,
            dreamContent: `Dream ${i}`,
            interpretation: `Interpretation ${i}`,
            category: "general",
            sentiment: "neutral",
          },
        });
      }

      const dreams = await testPrisma.dreamRecord.findMany({
        where: { userId: user.id },
      });

      expect(dreams).toHaveLength(5);
    });

    it("retrieves dreams by category", async () => {
      const user = await createTestUserInDb();

      const categories = ["flying", "water", "flying", "chase", "flying"];

      for (let i = 0; i < categories.length; i++) {
        await testPrisma.dreamRecord.create({
          data: {
            userId: user.id,
            dreamContent: `Dream ${i}`,
            interpretation: `Interpretation ${i}`,
            category: categories[i],
            sentiment: "neutral",
          },
        });
      }

      const flyingDreams = await testPrisma.dreamRecord.findMany({
        where: { userId: user.id, category: "flying" },
      });

      expect(flyingDreams).toHaveLength(3);
    });

    it("retrieves dreams by sentiment", async () => {
      const user = await createTestUserInDb();

      const sentiments = ["positive", "negative", "positive", "neutral", "positive"];

      for (let i = 0; i < sentiments.length; i++) {
        await testPrisma.dreamRecord.create({
          data: {
            userId: user.id,
            dreamContent: `Dream ${i}`,
            interpretation: `Interpretation ${i}`,
            category: "general",
            sentiment: sentiments[i],
          },
        });
      }

      const positiveDreams = await testPrisma.dreamRecord.findMany({
        where: { userId: user.id, sentiment: "positive" },
      });

      expect(positiveDreams).toHaveLength(3);
    });

    it("retrieves recent dreams first", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 5; i++) {
        await testPrisma.dreamRecord.create({
          data: {
            userId: user.id,
            dreamContent: `Dream ${i}`,
            interpretation: `Interpretation ${i}`,
            category: "general",
            sentiment: "neutral",
            fortuneRating: i + 1,
          },
        });
      }

      const dreams = await testPrisma.dreamRecord.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 3,
      });

      expect(dreams[0].fortuneRating).toBe(5);
    });

    it("retrieves dreams by date range", async () => {
      const user = await createTestUserInDb();
      const now = new Date();

      for (let i = 0; i < 7; i++) {
        const dreamDate = new Date(now);
        dreamDate.setDate(dreamDate.getDate() - i);

        await testPrisma.dreamRecord.create({
          data: {
            userId: user.id,
            dreamContent: `Dream from ${i} days ago`,
            interpretation: `Interpretation ${i}`,
            category: "general",
            sentiment: "neutral",
            dreamDate,
          },
        });
      }

      const threeDaysAgo = new Date(now);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const recentDreams = await testPrisma.dreamRecord.findMany({
        where: {
          userId: user.id,
          dreamDate: { gte: threeDaysAgo },
        },
      });

      expect(recentDreams).toHaveLength(4);
    });
  });

  describe("Dream Statistics", () => {
    it("counts dreams by category", async () => {
      const user = await createTestUserInDb();

      const categories = ["flying", "water", "flying", "chase", "water", "flying"];

      for (let i = 0; i < categories.length; i++) {
        await testPrisma.dreamRecord.create({
          data: {
            userId: user.id,
            dreamContent: `Dream ${i}`,
            interpretation: `Interpretation ${i}`,
            category: categories[i],
            sentiment: "neutral",
          },
        });
      }

      const counts = await testPrisma.dreamRecord.groupBy({
        by: ["category"],
        where: { userId: user.id },
        _count: { id: true },
      });

      const flyingCount = counts.find((c) => c.category === "flying")?._count.id;
      expect(flyingCount).toBe(3);
    });

    it("counts dreams by sentiment", async () => {
      const user = await createTestUserInDb();

      const sentiments = ["positive", "positive", "negative", "positive", "neutral"];

      for (let i = 0; i < sentiments.length; i++) {
        await testPrisma.dreamRecord.create({
          data: {
            userId: user.id,
            dreamContent: `Dream ${i}`,
            interpretation: `Interpretation ${i}`,
            category: "general",
            sentiment: sentiments[i],
          },
        });
      }

      const counts = await testPrisma.dreamRecord.groupBy({
        by: ["sentiment"],
        where: { userId: user.id },
        _count: { id: true },
      });

      const positiveCount = counts.find((c) => c.sentiment === "positive")?._count.id;
      expect(positiveCount).toBe(3);
    });

    it("calculates average fortune rating", async () => {
      const user = await createTestUserInDb();

      const ratings = [7, 8, 6, 9, 5]; // avg = 7

      for (let i = 0; i < ratings.length; i++) {
        await testPrisma.dreamRecord.create({
          data: {
            userId: user.id,
            dreamContent: `Dream ${i}`,
            interpretation: `Interpretation ${i}`,
            category: "general",
            sentiment: "neutral",
            fortuneRating: ratings[i],
          },
        });
      }

      const dreams = await testPrisma.dreamRecord.findMany({
        where: { userId: user.id, fortuneRating: { not: null } },
      });

      const avgRating = dreams.reduce((sum, d) => sum + (d.fortuneRating || 0), 0) / dreams.length;
      expect(avgRating).toBe(7);
    });

    it("counts nightmares", async () => {
      const user = await createTestUserInDb();

      const nightmares = [false, true, false, true, true, false];

      for (let i = 0; i < nightmares.length; i++) {
        await testPrisma.dreamRecord.create({
          data: {
            userId: user.id,
            dreamContent: `Dream ${i}`,
            interpretation: `Interpretation ${i}`,
            category: "general",
            sentiment: nightmares[i] ? "negative" : "neutral",
            isNightmare: nightmares[i],
          },
        });
      }

      const nightmareCount = await testPrisma.dreamRecord.count({
        where: { userId: user.id, isNightmare: true },
      });

      expect(nightmareCount).toBe(3);
    });
  });

  describe("Dream Search", () => {
    it("searches dreams by content", async () => {
      const user = await createTestUserInDb();

      const contents = [
        "하늘을 나는 꿈",
        "바다에서 수영하는 꿈",
        "산을 오르는 꿈",
        "하늘에서 별을 따는 꿈",
        "숲속을 걷는 꿈",
      ];

      for (const content of contents) {
        await testPrisma.dreamRecord.create({
          data: {
            userId: user.id,
            dreamContent: content,
            interpretation: "해석",
            category: "general",
            sentiment: "neutral",
          },
        });
      }

      const skyDreams = await testPrisma.dreamRecord.findMany({
        where: {
          userId: user.id,
          dreamContent: { contains: "하늘" },
        },
      });

      expect(skyDreams).toHaveLength(2);
    });

    it("searches dreams by symbol", async () => {
      const user = await createTestUserInDb();

      const symbolSets = [
        ["water", "fish"],
        ["sky", "bird"],
        ["water", "boat"],
        ["mountain", "tree"],
        ["water", "rain"],
      ];

      for (let i = 0; i < symbolSets.length; i++) {
        await testPrisma.dreamRecord.create({
          data: {
            userId: user.id,
            dreamContent: `Dream ${i}`,
            interpretation: `Interpretation ${i}`,
            category: "general",
            sentiment: "neutral",
            symbols: symbolSets[i],
          },
        });
      }

      const dreams = await testPrisma.dreamRecord.findMany({
        where: { userId: user.id },
      });

      const waterDreams = dreams.filter((d) =>
        Array.isArray(d.symbols) && d.symbols.includes("water")
      );

      expect(waterDreams).toHaveLength(3);
    });
  });

  describe("Dream Updates", () => {
    it("updates interpretation", async () => {
      const user = await createTestUserInDb();

      const dream = await testPrisma.dreamRecord.create({
        data: {
          userId: user.id,
          dreamContent: "꿈 내용",
          interpretation: "원래 해석",
          category: "general",
          sentiment: "neutral",
        },
      });

      const updated = await testPrisma.dreamRecord.update({
        where: { id: dream.id },
        data: { interpretation: "수정된 해석" },
      });

      expect(updated.interpretation).toBe("수정된 해석");
    });

    it("adds user notes", async () => {
      const user = await createTestUserInDb();

      const dream = await testPrisma.dreamRecord.create({
        data: {
          userId: user.id,
          dreamContent: "꿈 내용",
          interpretation: "해석",
          category: "general",
          sentiment: "neutral",
        },
      });

      const updated = await testPrisma.dreamRecord.update({
        where: { id: dream.id },
        data: { userNotes: "이 꿈이 현실에서 일어났다!" },
      });

      expect(updated.userNotes).toContain("현실");
    });

    it("marks as favorite", async () => {
      const user = await createTestUserInDb();

      const dream = await testPrisma.dreamRecord.create({
        data: {
          userId: user.id,
          dreamContent: "특별한 꿈",
          interpretation: "해석",
          category: "general",
          sentiment: "positive",
          isFavorite: false,
        },
      });

      const updated = await testPrisma.dreamRecord.update({
        where: { id: dream.id },
        data: { isFavorite: true },
      });

      expect(updated.isFavorite).toBe(true);
    });
  });

  describe("Dream Deletion", () => {
    it("deletes dream", async () => {
      const user = await createTestUserInDb();

      const dream = await testPrisma.dreamRecord.create({
        data: {
          userId: user.id,
          dreamContent: "삭제할 꿈",
          interpretation: "해석",
          category: "general",
          sentiment: "neutral",
        },
      });

      await testPrisma.dreamRecord.delete({
        where: { id: dream.id },
      });

      const found = await testPrisma.dreamRecord.findUnique({
        where: { id: dream.id },
      });

      expect(found).toBeNull();
    });

    it("deletes old dreams", async () => {
      const user = await createTestUserInDb();
      const now = new Date();

      // Old dreams
      for (let i = 0; i < 3; i++) {
        await testPrisma.dreamRecord.create({
          data: {
            userId: user.id,
            dreamContent: `Old dream ${i}`,
            interpretation: "해석",
            category: "general",
            sentiment: "neutral",
            createdAt: new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000),
          },
        });
      }

      // Recent dreams
      for (let i = 0; i < 2; i++) {
        await testPrisma.dreamRecord.create({
          data: {
            userId: user.id,
            dreamContent: `Recent dream ${i}`,
            interpretation: "해석",
            category: "general",
            sentiment: "neutral",
          },
        });
      }

      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

      await testPrisma.dreamRecord.deleteMany({
        where: {
          userId: user.id,
          createdAt: { lt: oneYearAgo },
        },
      });

      const remaining = await testPrisma.dreamRecord.findMany({
        where: { userId: user.id },
      });

      expect(remaining).toHaveLength(2);
    });
  });
});
