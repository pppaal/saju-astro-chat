/**
 * Destiny Matrix Report Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 데스티니 매트릭스 리포트 저장
 * - 리포트 분석 데이터 관리
 * - 리포트 히스토리 추적
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

describe("Integration: Destiny Matrix Report", () => {
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

  describe("Report Creation", () => {
    it("creates basic destiny matrix report", async () => {
      const user = await createTestUserInDb();

      const report = await testPrisma.destinyMatrixReport.create({
        data: {
          userId: user.id,
          birthDate: new Date("1990-05-15"),
          matrixData: {
            centerNumber: 5,
            personalityNumber: 3,
            destinyNumber: 8,
          },
          interpretation: "안정과 균형을 추구하는 성격입니다.",
        },
      });

      expect(report).toBeDefined();
      const matrix = report.matrixData as { centerNumber: number };
      expect(matrix.centerNumber).toBe(5);
    });

    it("creates report with full matrix calculation", async () => {
      const user = await createTestUserInDb();

      const report = await testPrisma.destinyMatrixReport.create({
        data: {
          userId: user.id,
          birthDate: new Date("1985-08-20"),
          matrixData: {
            matrix: [
              [1, 5, 6],
              [4, 9, 2],
              [3, 7, 8],
            ],
            diagonals: {
              main: [1, 9, 8],
              anti: [6, 9, 3],
            },
            energyPoints: {
              soul: 5,
              ego: 3,
              purpose: 8,
              karma: 4,
            },
          },
          interpretation: "상세 해석 내용",
        },
      });

      const matrix = report.matrixData as { energyPoints: { soul: number } };
      expect(matrix.energyPoints.soul).toBe(5);
    });

    it("creates report with life path analysis", async () => {
      const user = await createTestUserInDb();

      const report = await testPrisma.destinyMatrixReport.create({
        data: {
          userId: user.id,
          birthDate: new Date("1992-12-25"),
          matrixData: {
            lifePath: {
              number: 7,
              meaning: "탐구자, 진리 추구자",
              strengths: ["분석력", "직관력", "지혜"],
              challenges: ["고립", "의심"],
            },
            lifePhases: [
              { age: "0-28", focus: "배움", energy: 3 },
              { age: "29-56", focus: "실현", energy: 7 },
              { age: "57+", focus: "나눔", energy: 9 },
            ],
          },
          interpretation: "인생 경로 분석",
        },
      });

      const matrix = report.matrixData as { lifePath: { number: number } };
      expect(matrix.lifePath.number).toBe(7);
    });

    it("creates report with relationship compatibility", async () => {
      const user = await createTestUserInDb();

      const report = await testPrisma.destinyMatrixReport.create({
        data: {
          userId: user.id,
          birthDate: new Date("1988-03-10"),
          matrixData: {
            personalMatrix: { core: 6 },
            relationshipEnergies: {
              romantic: 8,
              friendship: 7,
              family: 9,
              professional: 6,
            },
            compatibleNumbers: [2, 4, 8],
            challengingNumbers: [1, 5],
          },
          interpretation: "관계 에너지 분석",
        },
      });

      const matrix = report.matrixData as { relationshipEnergies: { romantic: number } };
      expect(matrix.relationshipEnergies.romantic).toBe(8);
    });
  });

  describe("Report Retrieval", () => {
    it("retrieves report by id", async () => {
      const user = await createTestUserInDb();

      const report = await testPrisma.destinyMatrixReport.create({
        data: {
          userId: user.id,
          birthDate: new Date("1990-01-01"),
          matrixData: { test: true },
          interpretation: "Test report",
        },
      });

      const found = await testPrisma.destinyMatrixReport.findUnique({
        where: { id: report.id },
      });

      expect(found).not.toBeNull();
      expect(found?.interpretation).toBe("Test report");
    });

    it("retrieves all reports for user", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 5; i++) {
        await testPrisma.destinyMatrixReport.create({
          data: {
            userId: user.id,
            birthDate: new Date(`199${i}-01-01`),
            matrixData: { index: i },
            interpretation: `Report ${i}`,
          },
        });
      }

      const reports = await testPrisma.destinyMatrixReport.findMany({
        where: { userId: user.id },
      });

      expect(reports).toHaveLength(5);
    });

    it("retrieves latest report", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 3; i++) {
        await testPrisma.destinyMatrixReport.create({
          data: {
            userId: user.id,
            birthDate: new Date("1990-01-01"),
            matrixData: { order: i },
            interpretation: `Report ${i}`,
          },
        });
      }

      const latest = await testPrisma.destinyMatrixReport.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });

      const matrix = latest?.matrixData as { order: number };
      expect(matrix.order).toBe(2);
    });

    it("retrieves reports by birth date", async () => {
      const user = await createTestUserInDb();
      const targetDate = new Date("1990-05-15");

      await testPrisma.destinyMatrixReport.create({
        data: {
          userId: user.id,
          birthDate: targetDate,
          matrixData: { target: true },
          interpretation: "Target report",
        },
      });

      await testPrisma.destinyMatrixReport.create({
        data: {
          userId: user.id,
          birthDate: new Date("1985-08-20"),
          matrixData: { target: false },
          interpretation: "Other report",
        },
      });

      const reports = await testPrisma.destinyMatrixReport.findMany({
        where: {
          userId: user.id,
          birthDate: targetDate,
        },
      });

      expect(reports).toHaveLength(1);
    });
  });

  describe("Report Updates", () => {
    it("updates report interpretation", async () => {
      const user = await createTestUserInDb();

      const report = await testPrisma.destinyMatrixReport.create({
        data: {
          userId: user.id,
          birthDate: new Date("1990-01-01"),
          matrixData: {},
          interpretation: "Original interpretation",
        },
      });

      const updated = await testPrisma.destinyMatrixReport.update({
        where: { id: report.id },
        data: { interpretation: "Updated interpretation with more details" },
      });

      expect(updated.interpretation).toContain("Updated");
    });

    it("adds AI analysis to report", async () => {
      const user = await createTestUserInDb();

      const report = await testPrisma.destinyMatrixReport.create({
        data: {
          userId: user.id,
          birthDate: new Date("1990-01-01"),
          matrixData: { calculated: true },
          interpretation: "Basic interpretation",
        },
      });

      const existingMatrix = report.matrixData as Record<string, unknown>;

      const updated = await testPrisma.destinyMatrixReport.update({
        where: { id: report.id },
        data: {
          matrixData: {
            ...existingMatrix,
            aiAnalysis: {
              summary: "AI 분석 결과",
              recommendations: ["추천 1", "추천 2"],
              confidence: 0.92,
            },
          },
        },
      });

      const matrix = updated.matrixData as { aiAnalysis: { confidence: number } };
      expect(matrix.aiAnalysis.confidence).toBe(0.92);
    });

    it("marks report as premium", async () => {
      const user = await createTestUserInDb();

      const report = await testPrisma.destinyMatrixReport.create({
        data: {
          userId: user.id,
          birthDate: new Date("1990-01-01"),
          matrixData: { premium: false },
          interpretation: "Basic",
        },
      });

      const existingMatrix = report.matrixData as Record<string, unknown>;

      const updated = await testPrisma.destinyMatrixReport.update({
        where: { id: report.id },
        data: {
          matrixData: {
            ...existingMatrix,
            premium: true,
            premiumFeatures: ["detailed_analysis", "yearly_forecast", "relationship_map"],
          },
        },
      });

      const matrix = updated.matrixData as { premium: boolean };
      expect(matrix.premium).toBe(true);
    });
  });

  describe("Report Deletion", () => {
    it("deletes single report", async () => {
      const user = await createTestUserInDb();

      const report = await testPrisma.destinyMatrixReport.create({
        data: {
          userId: user.id,
          birthDate: new Date("1990-01-01"),
          matrixData: {},
          interpretation: "To be deleted",
        },
      });

      await testPrisma.destinyMatrixReport.delete({
        where: { id: report.id },
      });

      const found = await testPrisma.destinyMatrixReport.findUnique({
        where: { id: report.id },
      });

      expect(found).toBeNull();
    });

    it("deletes all reports for user", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 5; i++) {
        await testPrisma.destinyMatrixReport.create({
          data: {
            userId: user.id,
            birthDate: new Date("1990-01-01"),
            matrixData: {},
            interpretation: `Report ${i}`,
          },
        });
      }

      await testPrisma.destinyMatrixReport.deleteMany({
        where: { userId: user.id },
      });

      const remaining = await testPrisma.destinyMatrixReport.findMany({
        where: { userId: user.id },
      });

      expect(remaining).toHaveLength(0);
    });
  });

  describe("Report Statistics", () => {
    it("counts reports per user", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 8; i++) {
        await testPrisma.destinyMatrixReport.create({
          data: {
            userId: user.id,
            birthDate: new Date("1990-01-01"),
            matrixData: {},
            interpretation: `Report ${i}`,
          },
        });
      }

      const count = await testPrisma.destinyMatrixReport.count({
        where: { userId: user.id },
      });

      expect(count).toBe(8);
    });

    it("finds most common destiny numbers", async () => {
      const user = await createTestUserInDb();

      const destinyNumbers = [5, 5, 3, 7, 5, 3, 8];

      for (const num of destinyNumbers) {
        await testPrisma.destinyMatrixReport.create({
          data: {
            userId: user.id,
            birthDate: new Date("1990-01-01"),
            matrixData: { destinyNumber: num },
            interpretation: `Destiny ${num}`,
          },
        });
      }

      const reports = await testPrisma.destinyMatrixReport.findMany({
        where: { userId: user.id },
      });

      const numberCounts: Record<number, number> = {};
      for (const report of reports) {
        const matrix = report.matrixData as { destinyNumber: number };
        const num = matrix.destinyNumber;
        numberCounts[num] = (numberCounts[num] || 0) + 1;
      }

      expect(numberCounts[5]).toBe(3);
    });
  });

  describe("Report Comparison", () => {
    it("compares two reports", async () => {
      const user = await createTestUserInDb();

      const report1 = await testPrisma.destinyMatrixReport.create({
        data: {
          userId: user.id,
          birthDate: new Date("1990-01-01"),
          matrixData: { centerNumber: 5, destinyNumber: 8 },
          interpretation: "Report 1",
        },
      });

      const report2 = await testPrisma.destinyMatrixReport.create({
        data: {
          userId: user.id,
          birthDate: new Date("1992-06-15"),
          matrixData: { centerNumber: 7, destinyNumber: 3 },
          interpretation: "Report 2",
        },
      });

      const reports = await testPrisma.destinyMatrixReport.findMany({
        where: { id: { in: [report1.id, report2.id] } },
      });

      const matrices = reports.map((r) => r.matrixData as { centerNumber: number });
      expect(matrices[0].centerNumber).not.toBe(matrices[1].centerNumber);
    });

    it("finds matching destiny numbers across users", async () => {
      const users: string[] = [];
      const targetDestiny = 7;

      for (let i = 0; i < 5; i++) {
        const user = await createTestUserInDb();
        users.push(user.id);

        await testPrisma.destinyMatrixReport.create({
          data: {
            userId: user.id,
            birthDate: new Date("1990-01-01"),
            matrixData: { destinyNumber: i < 3 ? targetDestiny : 5 },
            interpretation: `Report for user ${i}`,
          },
        });
      }

      const reports = await testPrisma.destinyMatrixReport.findMany({
        where: { userId: { in: users } },
      });

      const matchingReports = reports.filter((r) => {
        const matrix = r.matrixData as { destinyNumber: number };
        return matrix.destinyNumber === targetDestiny;
      });

      expect(matchingReports).toHaveLength(3);
    });
  });

  describe("Report with User Data", () => {
    it("retrieves report with user info", async () => {
      const user = await createTestUserInDb();

      await testPrisma.destinyMatrixReport.create({
        data: {
          userId: user.id,
          birthDate: new Date("1990-01-01"),
          matrixData: {},
          interpretation: "Report with user",
        },
      });

      const report = await testPrisma.destinyMatrixReport.findFirst({
        where: { userId: user.id },
        include: { user: true },
      });

      expect(report?.user).toBeDefined();
      expect(report?.user.id).toBe(user.id);
    });
  });
});
