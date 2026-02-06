/**
 * Compatibility Results Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 궁합 결과 저장 및 조회
 * - 궁합 점수 분석
 * - 궁합 히스토리 관리
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

describe("Integration: Compatibility Results", () => {
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

  describe("Compatibility Result Creation", () => {
    it("creates basic compatibility result", async () => {
      const user = await createTestUserInDb();

      const result = await testPrisma.compatibilityResult.create({
        data: {
          userId: user.id,
          person1Name: "김철수",
          person1BirthDate: new Date("1990-05-15"),
          person2Name: "이영희",
          person2BirthDate: new Date("1992-08-20"),
          overallScore: 85,
          content: JSON.stringify({
            love: 88,
            career: 75,
            communication: 90,
          }),
        },
      });

      expect(result.overallScore).toBe(85);
      expect(result.person1Name).toBe("김철수");
    });

    it("creates detailed compatibility result", async () => {
      const user = await createTestUserInDb();

      const result = await testPrisma.compatibilityResult.create({
        data: {
          userId: user.id,
          person1Name: "Person A",
          person1BirthDate: new Date("1988-03-10"),
          person1BirthTime: "14:30",
          person2Name: "Person B",
          person2BirthDate: new Date("1990-07-25"),
          person2BirthTime: "09:15",
          overallScore: 78,
          content: JSON.stringify({
            categories: {
              love: { score: 82, analysis: "좋은 궁합" },
              career: { score: 70, analysis: "보통" },
              family: { score: 85, analysis: "가족 궁합 좋음" },
              health: { score: 75, analysis: "건강 궁합 양호" },
            },
            advice: "서로의 차이를 인정하세요",
            luckyDates: ["2024-06-15", "2024-08-20"],
          }),
        },
      });

      const content = JSON.parse(result.content as string);
      expect(content.categories.love.score).toBe(82);
    });

    it("creates saju-based compatibility result", async () => {
      const user = await createTestUserInDb();

      const result = await testPrisma.compatibilityResult.create({
        data: {
          userId: user.id,
          person1Name: "사주분석자",
          person1BirthDate: new Date("1985-01-15"),
          person2Name: "상대방",
          person2BirthDate: new Date("1987-11-20"),
          overallScore: 72,
          content: JSON.stringify({
            method: "saju",
            fourPillars: {
              person1: { day: "甲子", element: "wood" },
              person2: { day: "丙寅", element: "fire" },
            },
            elementCompatibility: "wood feeds fire - good",
            interpretation: "상생 관계입니다",
          }),
        },
      });

      const content = JSON.parse(result.content as string);
      expect(content.method).toBe("saju");
    });
  });

  describe("Compatibility Result Retrieval", () => {
    it("retrieves all compatibility results for user", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 5; i++) {
        await testPrisma.compatibilityResult.create({
          data: {
            userId: user.id,
            person1Name: "Me",
            person1BirthDate: new Date("1990-01-01"),
            person2Name: `Partner ${i}`,
            person2BirthDate: new Date("1990-01-01"),
            overallScore: 70 + i * 5,
            content: "{}",
          },
        });
      }

      const results = await testPrisma.compatibilityResult.findMany({
        where: { userId: user.id },
      });

      expect(results).toHaveLength(5);
    });

    it("retrieves compatibility results by person name", async () => {
      const user = await createTestUserInDb();

      const partners = ["철수", "영희", "민수", "철수"];

      for (let i = 0; i < partners.length; i++) {
        await testPrisma.compatibilityResult.create({
          data: {
            userId: user.id,
            person1Name: "나",
            person1BirthDate: new Date("1990-01-01"),
            person2Name: partners[i],
            person2BirthDate: new Date("1990-01-01"),
            overallScore: 80,
            content: "{}",
          },
        });
      }

      const chulsuResults = await testPrisma.compatibilityResult.findMany({
        where: {
          userId: user.id,
          person2Name: "철수",
        },
      });

      expect(chulsuResults).toHaveLength(2);
    });

    it("retrieves results sorted by score", async () => {
      const user = await createTestUserInDb();

      const scores = [75, 90, 60, 85, 70];

      for (let i = 0; i < scores.length; i++) {
        await testPrisma.compatibilityResult.create({
          data: {
            userId: user.id,
            person1Name: "Me",
            person1BirthDate: new Date("1990-01-01"),
            person2Name: `Person ${i}`,
            person2BirthDate: new Date("1990-01-01"),
            overallScore: scores[i],
            content: "{}",
          },
        });
      }

      const results = await testPrisma.compatibilityResult.findMany({
        where: { userId: user.id },
        orderBy: { overallScore: "desc" },
      });

      expect(results[0].overallScore).toBe(90);
      expect(results[results.length - 1].overallScore).toBe(60);
    });
  });

  describe("Compatibility Score Analysis", () => {
    it("calculates average compatibility score", async () => {
      const user = await createTestUserInDb();

      const scores = [80, 85, 75, 90, 70]; // avg = 80

      for (let i = 0; i < scores.length; i++) {
        await testPrisma.compatibilityResult.create({
          data: {
            userId: user.id,
            person1Name: "Me",
            person1BirthDate: new Date("1990-01-01"),
            person2Name: `Person ${i}`,
            person2BirthDate: new Date("1990-01-01"),
            overallScore: scores[i],
            content: "{}",
          },
        });
      }

      const results = await testPrisma.compatibilityResult.findMany({
        where: { userId: user.id },
      });

      const avgScore = results.reduce((sum, r) => sum + r.overallScore, 0) / results.length;
      expect(avgScore).toBe(80);
    });

    it("finds high compatibility matches", async () => {
      const user = await createTestUserInDb();

      const scores = [50, 60, 85, 90, 75, 95];

      for (let i = 0; i < scores.length; i++) {
        await testPrisma.compatibilityResult.create({
          data: {
            userId: user.id,
            person1Name: "Me",
            person1BirthDate: new Date("1990-01-01"),
            person2Name: `Person ${i}`,
            person2BirthDate: new Date("1990-01-01"),
            overallScore: scores[i],
            content: "{}",
          },
        });
      }

      const highMatches = await testPrisma.compatibilityResult.findMany({
        where: {
          userId: user.id,
          overallScore: { gte: 80 },
        },
      });

      expect(highMatches).toHaveLength(3);
    });

    it("groups results by score range", async () => {
      const user = await createTestUserInDb();

      const scores = [45, 55, 65, 75, 85, 95, 72, 88];

      for (let i = 0; i < scores.length; i++) {
        await testPrisma.compatibilityResult.create({
          data: {
            userId: user.id,
            person1Name: "Me",
            person1BirthDate: new Date("1990-01-01"),
            person2Name: `Person ${i}`,
            person2BirthDate: new Date("1990-01-01"),
            overallScore: scores[i],
            content: "{}",
          },
        });
      }

      const results = await testPrisma.compatibilityResult.findMany({
        where: { userId: user.id },
      });

      const ranges = {
        low: results.filter((r) => r.overallScore < 60).length,
        medium: results.filter((r) => r.overallScore >= 60 && r.overallScore < 80).length,
        high: results.filter((r) => r.overallScore >= 80).length,
      };

      expect(ranges.low).toBe(2);
      expect(ranges.medium).toBe(2);
      expect(ranges.high).toBe(4);
    });
  });

  describe("Compatibility Result Updates", () => {
    it("updates compatibility notes", async () => {
      const user = await createTestUserInDb();

      const result = await testPrisma.compatibilityResult.create({
        data: {
          userId: user.id,
          person1Name: "Me",
          person1BirthDate: new Date("1990-01-01"),
          person2Name: "Partner",
          person2BirthDate: new Date("1992-01-01"),
          overallScore: 80,
          content: JSON.stringify({ analysis: "initial" }),
        },
      });

      const originalContent = JSON.parse(result.content as string);

      const updated = await testPrisma.compatibilityResult.update({
        where: { id: result.id },
        data: {
          content: JSON.stringify({
            ...originalContent,
            userNotes: "정말 잘 맞는 것 같아요",
          }),
        },
      });

      const newContent = JSON.parse(updated.content as string);
      expect(newContent.userNotes).toBe("정말 잘 맞는 것 같아요");
    });
  });

  describe("Compatibility Result Deletion", () => {
    it("deletes single result", async () => {
      const user = await createTestUserInDb();

      const result = await testPrisma.compatibilityResult.create({
        data: {
          userId: user.id,
          person1Name: "Me",
          person1BirthDate: new Date("1990-01-01"),
          person2Name: "Delete Me",
          person2BirthDate: new Date("1990-01-01"),
          overallScore: 70,
          content: "{}",
        },
      });

      await testPrisma.compatibilityResult.delete({
        where: { id: result.id },
      });

      const found = await testPrisma.compatibilityResult.findUnique({
        where: { id: result.id },
      });

      expect(found).toBeNull();
    });

    it("deletes all results for user", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 5; i++) {
        await testPrisma.compatibilityResult.create({
          data: {
            userId: user.id,
            person1Name: "Me",
            person1BirthDate: new Date("1990-01-01"),
            person2Name: `Delete ${i}`,
            person2BirthDate: new Date("1990-01-01"),
            overallScore: 70,
            content: "{}",
          },
        });
      }

      await testPrisma.compatibilityResult.deleteMany({
        where: { userId: user.id },
      });

      const remaining = await testPrisma.compatibilityResult.findMany({
        where: { userId: user.id },
      });

      expect(remaining).toHaveLength(0);
    });
  });

  describe("Compatibility Statistics", () => {
    it("counts total compatibility checks", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 10; i++) {
        await testPrisma.compatibilityResult.create({
          data: {
            userId: user.id,
            person1Name: "Me",
            person1BirthDate: new Date("1990-01-01"),
            person2Name: `Person ${i}`,
            person2BirthDate: new Date("1990-01-01"),
            overallScore: 70 + i,
            content: "{}",
          },
        });
      }

      const count = await testPrisma.compatibilityResult.count({
        where: { userId: user.id },
      });

      expect(count).toBe(10);
    });

    it("finds best match", async () => {
      const user = await createTestUserInDb();

      const partners = [
        { name: "A", score: 75 },
        { name: "B", score: 92 },
        { name: "C", score: 88 },
      ];

      for (const partner of partners) {
        await testPrisma.compatibilityResult.create({
          data: {
            userId: user.id,
            person1Name: "Me",
            person1BirthDate: new Date("1990-01-01"),
            person2Name: partner.name,
            person2BirthDate: new Date("1990-01-01"),
            overallScore: partner.score,
            content: "{}",
          },
        });
      }

      const bestMatch = await testPrisma.compatibilityResult.findFirst({
        where: { userId: user.id },
        orderBy: { overallScore: "desc" },
      });

      expect(bestMatch?.person2Name).toBe("B");
      expect(bestMatch?.overallScore).toBe(92);
    });
  });
});
