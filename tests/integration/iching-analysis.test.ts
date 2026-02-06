/**
 * I Ching Analysis Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 주역 리딩 저장 및 조회
 * - 괘 데이터 관리
 * - 변효 및 해석 저장
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

describe("Integration: I Ching Analysis", () => {
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

  describe("I Ching Reading Storage", () => {
    it("stores basic I Ching reading", async () => {
      const user = await createTestUserInDb();

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: "iching",
          content: JSON.stringify({
            question: "현재 직장을 옮겨야 할까요?",
            hexagram: {
              number: 1,
              name: "건(乾)",
              meaning: "하늘, 창조",
              lines: [9, 9, 9, 9, 9, 9],
            },
            interpretation: "강건함과 창조의 기운이 가득합니다...",
          }),
        },
      });

      expect(reading).toBeDefined();
      expect(reading.type).toBe("iching");

      const content = JSON.parse(reading.content as string);
      expect(content.hexagram.number).toBe(1);
    });

    it("stores reading with changing lines", async () => {
      const user = await createTestUserInDb();

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: "iching",
          content: JSON.stringify({
            question: "이 사업을 시작해도 될까요?",
            primaryHexagram: {
              number: 11,
              name: "태(泰)",
              lines: [9, 9, 9, 6, 6, 6],
            },
            changingLines: [1, 4],
            resultingHexagram: {
              number: 34,
              name: "대장(大壯)",
            },
            interpretation: "변화가 긍정적인 결과를 가져올 것입니다...",
          }),
        },
      });

      const content = JSON.parse(reading.content as string);
      expect(content.changingLines).toEqual([1, 4]);
      expect(content.resultingHexagram.number).toBe(34);
    });

    it("stores detailed line interpretations", async () => {
      const user = await createTestUserInDb();

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: "iching",
          content: JSON.stringify({
            hexagram: { number: 2, name: "곤(坤)" },
            lineInterpretations: [
              { position: 1, text: "첫째 효: 서리를 밟으면...", type: "yin" },
              { position: 2, text: "둘째 효: 곧고 방정하며...", type: "yin" },
              { position: 3, text: "셋째 효: 아름다움을 품고...", type: "yin" },
              { position: 4, text: "넷째 효: 주머니를 동여매니...", type: "yin" },
              { position: 5, text: "다섯째 효: 누런 치마...", type: "yin" },
              { position: 6, text: "여섯째 효: 용이 들에서 싸우니...", type: "yin" },
            ],
          }),
        },
      });

      const content = JSON.parse(reading.content as string);
      expect(content.lineInterpretations).toHaveLength(6);
    });
  });

  describe("I Ching Reading Retrieval", () => {
    it("retrieves I Ching readings for user", async () => {
      const user = await createTestUserInDb();

      for (let i = 1; i <= 5; i++) {
        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type: "iching",
            content: JSON.stringify({
              hexagram: { number: i },
              question: `Question ${i}`,
            }),
          },
        });
      }

      const readings = await testPrisma.reading.findMany({
        where: { userId: user.id, type: "iching" },
        orderBy: { createdAt: "desc" },
      });

      expect(readings).toHaveLength(5);
    });

    it("filters I Ching readings by date", async () => {
      const user = await createTestUserInDb();

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: "iching",
          content: JSON.stringify({ recent: true }),
          createdAt: now,
        },
      });

      await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: "iching",
          content: JSON.stringify({ recent: false }),
          createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
        },
      });

      const recentReadings = await testPrisma.reading.findMany({
        where: {
          userId: user.id,
          type: "iching",
          createdAt: { gte: weekAgo },
        },
      });

      expect(recentReadings).toHaveLength(1);
    });
  });

  describe("Hexagram Statistics", () => {
    it("tracks most frequently received hexagrams", async () => {
      const user = await createTestUserInDb();

      const hexagramNumbers = [1, 1, 1, 2, 2, 11, 12, 1];

      for (const num of hexagramNumbers) {
        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type: "iching",
            content: JSON.stringify({ hexagram: { number: num } }),
          },
        });
      }

      const readings = await testPrisma.reading.findMany({
        where: { userId: user.id, type: "iching" },
      });

      const hexagramCounts: Record<number, number> = {};
      for (const reading of readings) {
        const content = JSON.parse(reading.content as string);
        const num = content.hexagram.number;
        hexagramCounts[num] = (hexagramCounts[num] || 0) + 1;
      }

      expect(hexagramCounts[1]).toBe(4);
      expect(hexagramCounts[2]).toBe(2);
    });

    it("analyzes reading themes over time", async () => {
      const user = await createTestUserInDb();

      const questions = [
        { q: "Career change?", theme: "career" },
        { q: "Love life?", theme: "love" },
        { q: "Job promotion?", theme: "career" },
        { q: "Health concern?", theme: "health" },
      ];

      for (const item of questions) {
        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type: "iching",
            content: JSON.stringify({
              question: item.q,
              theme: item.theme,
              hexagram: { number: 1 },
            }),
          },
        });
      }

      const readings = await testPrisma.reading.findMany({
        where: { userId: user.id, type: "iching" },
      });

      const themes = readings.map((r) => {
        const content = JSON.parse(r.content as string);
        return content.theme;
      });

      const careerCount = themes.filter((t) => t === "career").length;
      expect(careerCount).toBe(2);
    });
  });

  describe("I Ching with Credits", () => {
    it("consumes credit for I Ching reading", async () => {
      const user = await createTestUserInDb();
      await createTestUserCredits(user.id, "starter");

      await testPrisma.$transaction(async (tx) => {
        await tx.reading.create({
          data: {
            userId: user.id,
            type: "iching",
            content: JSON.stringify({ hexagram: { number: 1 } }),
          },
        });

        await tx.userCredits.update({
          where: { userId: user.id },
          data: { usedCredits: { increment: 1 } },
        });
      });

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      });

      expect(credits?.usedCredits).toBe(1);
    });
  });

  describe("Consultation History Integration", () => {
    it("stores I Ching consultation in history", async () => {
      const user = await createTestUserInDb();

      const history = await testPrisma.consultationHistory.create({
        data: {
          userId: user.id,
          theme: "iching",
          summary: "주역 점괘: 건괘",
          content: JSON.stringify({
            hexagram: { number: 1, name: "건" },
            question: "진로 상담",
            advice: "적극적으로 나아가세요",
          }),
        },
      });

      expect(history.theme).toBe("iching");

      const content = JSON.parse(history.content as string);
      expect(content.hexagram.name).toBe("건");
    });

    it("retrieves I Ching consultation history", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 3; i++) {
        await testPrisma.consultationHistory.create({
          data: {
            userId: user.id,
            theme: "iching",
            summary: `I Ching consultation ${i + 1}`,
            content: JSON.stringify({ order: i + 1 }),
          },
        });
      }

      const history = await testPrisma.consultationHistory.findMany({
        where: { userId: user.id, theme: "iching" },
        orderBy: { createdAt: "desc" },
      });

      expect(history).toHaveLength(3);
    });
  });

  describe("Reading Updates", () => {
    it("updates reading with additional interpretation", async () => {
      const user = await createTestUserInDb();

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: "iching",
          content: JSON.stringify({
            hexagram: { number: 1 },
            interpretation: "Initial interpretation",
          }),
        },
      });

      const originalContent = JSON.parse(reading.content as string);

      const updated = await testPrisma.reading.update({
        where: { id: reading.id },
        data: {
          content: JSON.stringify({
            ...originalContent,
            interpretation: "Updated interpretation with more detail",
            additionalNotes: "Follow-up advice",
          }),
        },
      });

      const newContent = JSON.parse(updated.content as string);
      expect(newContent.additionalNotes).toBe("Follow-up advice");
    });
  });
});
