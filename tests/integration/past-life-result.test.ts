/**
 * Past Life Result Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 전생 분석 결과 저장
 * - 전생 히스토리 관리
 * - 전생 분석 통계
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

describe("Integration: Past Life Result", () => {
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

  describe("Past Life Result Creation", () => {
    it("creates basic past life result", async () => {
      const user = await createTestUserInDb();

      const result = await testPrisma.pastLifeResult.create({
        data: {
          userId: user.id,
          era: "조선시대",
          occupation: "선비",
          personality: "학문을 사랑하고 정의로운 성격",
          content: JSON.stringify({
            period: "1600-1700",
            location: "한양",
            lifeEvents: ["과거 급제", "지방 관직"],
          }),
        },
      });

      expect(result.era).toBe("조선시대");
      expect(result.occupation).toBe("선비");
    });

    it("creates past life result with karma", async () => {
      const user = await createTestUserInDb();

      const result = await testPrisma.pastLifeResult.create({
        data: {
          userId: user.id,
          era: "고려시대",
          occupation: "무사",
          personality: "용맹하고 충성스러운",
          content: JSON.stringify({
            karma: {
              positive: ["충성심", "용기"],
              negative: ["분노조절"],
              lesson: "평화로운 해결책 찾기",
            },
            currentLifeImpact: "리더십과 결단력",
          }),
        },
      });

      const content = JSON.parse(result.content as string);
      expect(content.karma.positive).toContain("충성심");
    });

    it("creates past life result with relationships", async () => {
      const user = await createTestUserInDb();

      const result = await testPrisma.pastLifeResult.create({
        data: {
          userId: user.id,
          era: "삼국시대",
          occupation: "장인",
          personality: "섬세하고 창의적인",
          content: JSON.stringify({
            relationships: {
              soulmates: ["현재의 배우자와 형제 관계였음"],
              karmaConnections: ["친구 중 한 명이 전생의 스승"],
            },
          }),
        },
      });

      const content = JSON.parse(result.content as string);
      expect(content.relationships.soulmates).toHaveLength(1);
    });

    it("creates multiple past life results for user", async () => {
      const user = await createTestUserInDb();

      const pastLives = [
        { era: "조선시대", occupation: "선비" },
        { era: "고려시대", occupation: "상인" },
        { era: "삼국시대", occupation: "농부" },
      ];

      for (const life of pastLives) {
        await testPrisma.pastLifeResult.create({
          data: {
            userId: user.id,
            era: life.era,
            occupation: life.occupation,
            personality: "성격 설명",
            content: "{}",
          },
        });
      }

      const results = await testPrisma.pastLifeResult.findMany({
        where: { userId: user.id },
      });

      expect(results).toHaveLength(3);
    });
  });

  describe("Past Life Result Retrieval", () => {
    it("retrieves all past life results for user", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 4; i++) {
        await testPrisma.pastLifeResult.create({
          data: {
            userId: user.id,
            era: `Era ${i}`,
            occupation: `Occupation ${i}`,
            personality: "Test",
            content: "{}",
          },
        });
      }

      const results = await testPrisma.pastLifeResult.findMany({
        where: { userId: user.id },
      });

      expect(results).toHaveLength(4);
    });

    it("retrieves past life by era", async () => {
      const user = await createTestUserInDb();

      const eras = ["조선시대", "고려시대", "조선시대", "삼국시대"];

      for (const era of eras) {
        await testPrisma.pastLifeResult.create({
          data: {
            userId: user.id,
            era,
            occupation: "Test",
            personality: "Test",
            content: "{}",
          },
        });
      }

      const joseonResults = await testPrisma.pastLifeResult.findMany({
        where: { userId: user.id, era: "조선시대" },
      });

      expect(joseonResults).toHaveLength(2);
    });

    it("retrieves latest past life result", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 3; i++) {
        await testPrisma.pastLifeResult.create({
          data: {
            userId: user.id,
            era: `Era ${i}`,
            occupation: `Occupation ${i}`,
            personality: "Test",
            content: JSON.stringify({ order: i }),
          },
        });
      }

      const latest = await testPrisma.pastLifeResult.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });

      const content = JSON.parse(latest!.content as string);
      expect(content.order).toBe(2);
    });
  });

  describe("Past Life Result Updates", () => {
    it("updates past life interpretation", async () => {
      const user = await createTestUserInDb();

      const result = await testPrisma.pastLifeResult.create({
        data: {
          userId: user.id,
          era: "조선시대",
          occupation: "선비",
          personality: "원래 성격",
          content: "{}",
        },
      });

      const updated = await testPrisma.pastLifeResult.update({
        where: { id: result.id },
        data: { personality: "더 상세한 성격 분석" },
      });

      expect(updated.personality).toBe("더 상세한 성격 분석");
    });

    it("adds detailed content to result", async () => {
      const user = await createTestUserInDb();

      const result = await testPrisma.pastLifeResult.create({
        data: {
          userId: user.id,
          era: "고려시대",
          occupation: "무사",
          personality: "Test",
          content: JSON.stringify({ basic: true }),
        },
      });

      const updated = await testPrisma.pastLifeResult.update({
        where: { id: result.id },
        data: {
          content: JSON.stringify({
            basic: true,
            detailed: {
              battles: ["황산벌 전투"],
              achievements: ["장군 직위"],
              lessons: ["인내와 전략"],
            },
          }),
        },
      });

      const content = JSON.parse(updated.content as string);
      expect(content.detailed.battles).toHaveLength(1);
    });
  });

  describe("Past Life Result Deletion", () => {
    it("deletes single result", async () => {
      const user = await createTestUserInDb();

      const result = await testPrisma.pastLifeResult.create({
        data: {
          userId: user.id,
          era: "Test",
          occupation: "Test",
          personality: "Test",
          content: "{}",
        },
      });

      await testPrisma.pastLifeResult.delete({
        where: { id: result.id },
      });

      const found = await testPrisma.pastLifeResult.findUnique({
        where: { id: result.id },
      });

      expect(found).toBeNull();
    });

    it("deletes all results for user", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 5; i++) {
        await testPrisma.pastLifeResult.create({
          data: {
            userId: user.id,
            era: `Era ${i}`,
            occupation: `Occupation ${i}`,
            personality: "Test",
            content: "{}",
          },
        });
      }

      await testPrisma.pastLifeResult.deleteMany({
        where: { userId: user.id },
      });

      const remaining = await testPrisma.pastLifeResult.findMany({
        where: { userId: user.id },
      });

      expect(remaining).toHaveLength(0);
    });
  });

  describe("Past Life Statistics", () => {
    it("counts results by era", async () => {
      const user = await createTestUserInDb();
      const eras = ["조선시대", "조선시대", "고려시대", "조선시대", "삼국시대"];

      for (const era of eras) {
        await testPrisma.pastLifeResult.create({
          data: {
            userId: user.id,
            era,
            occupation: "Test",
            personality: "Test",
            content: "{}",
          },
        });
      }

      const counts = await testPrisma.pastLifeResult.groupBy({
        by: ["era"],
        where: { userId: user.id },
        _count: { id: true },
      });

      const joseonCount = counts.find((c) => c.era === "조선시대")?._count.id;
      expect(joseonCount).toBe(3);
    });

    it("finds most common occupation", async () => {
      const user = await createTestUserInDb();
      const occupations = ["선비", "무사", "선비", "상인", "선비"];

      for (const occupation of occupations) {
        await testPrisma.pastLifeResult.create({
          data: {
            userId: user.id,
            era: "Test",
            occupation,
            personality: "Test",
            content: "{}",
          },
        });
      }

      const counts = await testPrisma.pastLifeResult.groupBy({
        by: ["occupation"],
        where: { userId: user.id },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      });

      expect(counts[0].occupation).toBe("선비");
      expect(counts[0]._count.id).toBe(3);
    });
  });
});
