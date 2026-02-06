/**
 * ICP Result Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 이상형 분석 결과 저장
 * - ICP 데이터 관리
 * - 이상형 통계 분석
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

describe("Integration: ICP Result", () => {
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

  describe("ICP Result Creation", () => {
    it("creates basic ICP result", async () => {
      const user = await createTestUserInDb();

      const result = await testPrisma.iCPResult.create({
        data: {
          userId: user.id,
          idealType: "지적이고 유머 감각 있는 사람",
          traits: ["지성", "유머", "배려심"],
          content: JSON.stringify({
            physicalPreferences: { height: "170-180cm" },
            personalityPreferences: ["차분함", "성실함"],
          }),
        },
      });

      expect(result.idealType).toContain("지적이고");
      expect(result.traits).toContain("지성");
    });

    it("creates ICP with detailed preferences", async () => {
      const user = await createTestUserInDb();

      const result = await testPrisma.iCPResult.create({
        data: {
          userId: user.id,
          idealType: "따뜻하고 가정적인 사람",
          traits: ["따뜻함", "가정적", "책임감"],
          content: JSON.stringify({
            personality: {
              mustHave: ["정직함", "성실함"],
              niceToHave: ["유머감각", "예술적 감각"],
              dealBreakers: ["거짓말", "무책임"],
            },
            lifestyle: {
              workLifeBalance: "중요함",
              hobbies: ["여행", "요리", "독서"],
            },
            values: {
              family: "매우 중요",
              career: "중요",
              adventure: "보통",
            },
          }),
        },
      });

      const content = JSON.parse(result.content as string);
      expect(content.personality.mustHave).toContain("정직함");
    });

    it("creates ICP with compatibility insights", async () => {
      const user = await createTestUserInDb();

      const result = await testPrisma.iCPResult.create({
        data: {
          userId: user.id,
          idealType: "창의적이고 독립적인 사람",
          traits: ["창의성", "독립심", "열정"],
          content: JSON.stringify({
            compatibleSigns: ["양자리", "사자자리", "사수자리"],
            compatibleMBTI: ["ENFP", "ENTP", "INFJ"],
            sajuCompatibility: {
              element: "fire",
              bestMatch: ["wood", "fire"],
            },
          }),
        },
      });

      const content = JSON.parse(result.content as string);
      expect(content.compatibleMBTI).toContain("ENFP");
    });

    it("creates ICP with relationship style", async () => {
      const user = await createTestUserInDb();

      const result = await testPrisma.iCPResult.create({
        data: {
          userId: user.id,
          idealType: "안정적이고 신뢰할 수 있는 사람",
          traits: ["안정감", "신뢰", "소통"],
          content: JSON.stringify({
            relationshipStyle: {
              attachmentType: "secure",
              communicationStyle: "open",
              conflictResolution: "collaborative",
            },
            loveLanguage: {
              giving: "quality_time",
              receiving: "words_of_affirmation",
            },
          }),
        },
      });

      const content = JSON.parse(result.content as string);
      expect(content.relationshipStyle.attachmentType).toBe("secure");
    });
  });

  describe("ICP Result Retrieval", () => {
    it("retrieves all ICP results for user", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 3; i++) {
        await testPrisma.iCPResult.create({
          data: {
            userId: user.id,
            idealType: `Type ${i}`,
            traits: [`trait${i}`],
            content: "{}",
          },
        });
      }

      const results = await testPrisma.iCPResult.findMany({
        where: { userId: user.id },
      });

      expect(results).toHaveLength(3);
    });

    it("retrieves latest ICP result", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 3; i++) {
        await testPrisma.iCPResult.create({
          data: {
            userId: user.id,
            idealType: `Type ${i}`,
            traits: [],
            content: JSON.stringify({ order: i }),
          },
        });
      }

      const latest = await testPrisma.iCPResult.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });

      const content = JSON.parse(latest!.content as string);
      expect(content.order).toBe(2);
    });

    it("retrieves ICP by traits", async () => {
      const user = await createTestUserInDb();

      await testPrisma.iCPResult.create({
        data: {
          userId: user.id,
          idealType: "Type A",
          traits: ["지성", "유머"],
          content: "{}",
        },
      });

      await testPrisma.iCPResult.create({
        data: {
          userId: user.id,
          idealType: "Type B",
          traits: ["따뜻함", "배려심"],
          content: "{}",
        },
      });

      const results = await testPrisma.iCPResult.findMany({
        where: { userId: user.id },
      });

      const withHumor = results.filter((r) => r.traits.includes("유머"));
      expect(withHumor).toHaveLength(1);
    });
  });

  describe("ICP Result Updates", () => {
    it("updates ideal type description", async () => {
      const user = await createTestUserInDb();

      const result = await testPrisma.iCPResult.create({
        data: {
          userId: user.id,
          idealType: "원래 이상형",
          traits: ["trait1"],
          content: "{}",
        },
      });

      const updated = await testPrisma.iCPResult.update({
        where: { id: result.id },
        data: { idealType: "수정된 이상형 설명" },
      });

      expect(updated.idealType).toBe("수정된 이상형 설명");
    });

    it("updates traits array", async () => {
      const user = await createTestUserInDb();

      const result = await testPrisma.iCPResult.create({
        data: {
          userId: user.id,
          idealType: "Test",
          traits: ["trait1", "trait2"],
          content: "{}",
        },
      });

      const updated = await testPrisma.iCPResult.update({
        where: { id: result.id },
        data: { traits: ["trait1", "trait2", "trait3", "trait4"] },
      });

      expect(updated.traits).toHaveLength(4);
    });

    it("updates content with new preferences", async () => {
      const user = await createTestUserInDb();

      const result = await testPrisma.iCPResult.create({
        data: {
          userId: user.id,
          idealType: "Test",
          traits: [],
          content: JSON.stringify({ version: 1 }),
        },
      });

      const updated = await testPrisma.iCPResult.update({
        where: { id: result.id },
        data: {
          content: JSON.stringify({
            version: 2,
            newPreferences: { career: "important" },
          }),
        },
      });

      const content = JSON.parse(updated.content as string);
      expect(content.version).toBe(2);
    });
  });

  describe("ICP Result Deletion", () => {
    it("deletes single result", async () => {
      const user = await createTestUserInDb();

      const result = await testPrisma.iCPResult.create({
        data: {
          userId: user.id,
          idealType: "Delete me",
          traits: [],
          content: "{}",
        },
      });

      await testPrisma.iCPResult.delete({
        where: { id: result.id },
      });

      const found = await testPrisma.iCPResult.findUnique({
        where: { id: result.id },
      });

      expect(found).toBeNull();
    });

    it("deletes all results for user", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 4; i++) {
        await testPrisma.iCPResult.create({
          data: {
            userId: user.id,
            idealType: `Type ${i}`,
            traits: [],
            content: "{}",
          },
        });
      }

      await testPrisma.iCPResult.deleteMany({
        where: { userId: user.id },
      });

      const remaining = await testPrisma.iCPResult.findMany({
        where: { userId: user.id },
      });

      expect(remaining).toHaveLength(0);
    });
  });

  describe("ICP Statistics", () => {
    it("analyzes common traits across users", async () => {
      const users: string[] = [];
      const allTraits = [
        ["지성", "유머"],
        ["지성", "따뜻함"],
        ["유머", "배려심"],
        ["지성", "성실함"],
      ];

      for (let i = 0; i < allTraits.length; i++) {
        const user = await createTestUserInDb();
        users.push(user.id);

        await testPrisma.iCPResult.create({
          data: {
            userId: user.id,
            idealType: `Type ${i}`,
            traits: allTraits[i],
            content: "{}",
          },
        });
      }

      const results = await testPrisma.iCPResult.findMany({
        where: { userId: { in: users } },
      });

      const traitCounts: Record<string, number> = {};
      for (const result of results) {
        for (const trait of result.traits) {
          traitCounts[trait] = (traitCounts[trait] || 0) + 1;
        }
      }

      expect(traitCounts["지성"]).toBe(3);
    });

    it("counts total ICP analyses", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 5; i++) {
        await testPrisma.iCPResult.create({
          data: {
            userId: user.id,
            idealType: `Type ${i}`,
            traits: [],
            content: "{}",
          },
        });
      }

      const count = await testPrisma.iCPResult.count({
        where: { userId: user.id },
      });

      expect(count).toBe(5);
    });
  });
});
