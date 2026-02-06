/**
 * User Feedback Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 사용자 피드백 저장
 * - 피드백 분류 및 분석
 * - 피드백 상태 관리
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

describe("Integration: User Feedback", () => {
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

  describe("Feedback Creation", () => {
    it("creates general feedback", async () => {
      const user = await createTestUserInDb();

      const feedback = await testPrisma.userFeedback.create({
        data: {
          userId: user.id,
          type: "general",
          rating: 5,
          message: "서비스가 정말 좋아요!",
          status: "pending",
        },
      });

      expect(feedback.type).toBe("general");
      expect(feedback.rating).toBe(5);
    });

    it("creates bug report", async () => {
      const user = await createTestUserInDb();

      const feedback = await testPrisma.userFeedback.create({
        data: {
          userId: user.id,
          type: "bug",
          rating: null,
          message: "로그인 시 오류가 발생합니다",
          status: "pending",
          metadata: {
            page: "/login",
            browser: "Chrome 120",
            errorMessage: "Authentication failed",
          },
        },
      });

      expect(feedback.type).toBe("bug");
      const meta = feedback.metadata as { page: string };
      expect(meta.page).toBe("/login");
    });

    it("creates feature request", async () => {
      const user = await createTestUserInDb();

      const feedback = await testPrisma.userFeedback.create({
        data: {
          userId: user.id,
          type: "feature_request",
          rating: null,
          message: "월간 운세 요약 기능을 추가해주세요",
          status: "pending",
          metadata: {
            feature: "monthly_summary",
            priority: "medium",
          },
        },
      });

      expect(feedback.type).toBe("feature_request");
    });

    it("creates service rating", async () => {
      const user = await createTestUserInDb();

      const feedback = await testPrisma.userFeedback.create({
        data: {
          userId: user.id,
          type: "rating",
          rating: 4,
          message: "전반적으로 만족하지만 개선할 점이 있어요",
          status: "pending",
          metadata: {
            service: "tarot_reading",
            aspects: {
              accuracy: 5,
              usability: 4,
              speed: 3,
            },
          },
        },
      });

      expect(feedback.rating).toBe(4);
    });

    it("creates complaint", async () => {
      const user = await createTestUserInDb();

      const feedback = await testPrisma.userFeedback.create({
        data: {
          userId: user.id,
          type: "complaint",
          rating: 1,
          message: "결제했는데 서비스를 이용할 수 없어요",
          status: "urgent",
          metadata: {
            orderId: "order_123",
            amount: 9900,
          },
        },
      });

      expect(feedback.status).toBe("urgent");
    });
  });

  describe("Feedback Retrieval", () => {
    it("retrieves all feedback for user", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 5; i++) {
        await testPrisma.userFeedback.create({
          data: {
            userId: user.id,
            type: "general",
            rating: 3 + i % 3,
            message: `Feedback ${i}`,
            status: "pending",
          },
        });
      }

      const feedbacks = await testPrisma.userFeedback.findMany({
        where: { userId: user.id },
      });

      expect(feedbacks).toHaveLength(5);
    });

    it("retrieves feedback by type", async () => {
      const user = await createTestUserInDb();

      const types = ["general", "bug", "bug", "feature_request", "general"];

      for (let i = 0; i < types.length; i++) {
        await testPrisma.userFeedback.create({
          data: {
            userId: user.id,
            type: types[i],
            message: `Feedback ${i}`,
            status: "pending",
          },
        });
      }

      const bugReports = await testPrisma.userFeedback.findMany({
        where: { userId: user.id, type: "bug" },
      });

      expect(bugReports).toHaveLength(2);
    });

    it("retrieves feedback by status", async () => {
      const user = await createTestUserInDb();

      const statuses = ["pending", "pending", "resolved", "in_progress", "pending"];

      for (let i = 0; i < statuses.length; i++) {
        await testPrisma.userFeedback.create({
          data: {
            userId: user.id,
            type: "general",
            message: `Feedback ${i}`,
            status: statuses[i],
          },
        });
      }

      const pendingFeedback = await testPrisma.userFeedback.findMany({
        where: { userId: user.id, status: "pending" },
      });

      expect(pendingFeedback).toHaveLength(3);
    });

    it("retrieves recent feedback first", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 5; i++) {
        await testPrisma.userFeedback.create({
          data: {
            userId: user.id,
            type: "general",
            message: `Feedback ${i}`,
            rating: i + 1,
            status: "pending",
          },
        });
      }

      const feedbacks = await testPrisma.userFeedback.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 3,
      });

      expect(feedbacks[0].rating).toBe(5);
    });
  });

  describe("Feedback Status Updates", () => {
    it("updates status to in_progress", async () => {
      const user = await createTestUserInDb();

      const feedback = await testPrisma.userFeedback.create({
        data: {
          userId: user.id,
          type: "bug",
          message: "Bug report",
          status: "pending",
        },
      });

      const updated = await testPrisma.userFeedback.update({
        where: { id: feedback.id },
        data: {
          status: "in_progress",
          assignedTo: "support_team",
        },
      });

      expect(updated.status).toBe("in_progress");
    });

    it("resolves feedback", async () => {
      const user = await createTestUserInDb();

      const feedback = await testPrisma.userFeedback.create({
        data: {
          userId: user.id,
          type: "bug",
          message: "Bug report",
          status: "in_progress",
        },
      });

      const updated = await testPrisma.userFeedback.update({
        where: { id: feedback.id },
        data: {
          status: "resolved",
          resolvedAt: new Date(),
          resolution: "버그가 수정되었습니다",
        },
      });

      expect(updated.status).toBe("resolved");
      expect(updated.resolution).toContain("수정");
    });

    it("adds admin response", async () => {
      const user = await createTestUserInDb();

      const feedback = await testPrisma.userFeedback.create({
        data: {
          userId: user.id,
          type: "feature_request",
          message: "New feature please",
          status: "pending",
        },
      });

      const updated = await testPrisma.userFeedback.update({
        where: { id: feedback.id },
        data: {
          adminResponse: "감사합니다. 검토 후 반영하겠습니다.",
          respondedAt: new Date(),
        },
      });

      expect(updated.adminResponse).toContain("검토");
    });
  });

  describe("Feedback Statistics", () => {
    it("calculates average rating", async () => {
      const users: string[] = [];
      const ratings = [5, 4, 5, 3, 4, 5, 4]; // avg ≈ 4.29

      for (let i = 0; i < ratings.length; i++) {
        const user = await createTestUserInDb();
        users.push(user.id);

        await testPrisma.userFeedback.create({
          data: {
            userId: user.id,
            type: "rating",
            rating: ratings[i],
            message: "Rating feedback",
            status: "pending",
          },
        });
      }

      const feedbacks = await testPrisma.userFeedback.findMany({
        where: { userId: { in: users }, rating: { not: null } },
      });

      const avgRating =
        feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbacks.length;

      expect(avgRating).toBeCloseTo(4.29, 1);
    });

    it("counts feedback by type", async () => {
      const users: string[] = [];
      const types = ["general", "bug", "bug", "feature_request", "general", "bug"];

      for (let i = 0; i < types.length; i++) {
        const user = await createTestUserInDb();
        users.push(user.id);

        await testPrisma.userFeedback.create({
          data: {
            userId: user.id,
            type: types[i],
            message: `Feedback ${i}`,
            status: "pending",
          },
        });
      }

      const counts = await testPrisma.userFeedback.groupBy({
        by: ["type"],
        where: { userId: { in: users } },
        _count: { id: true },
      });

      const bugCount = counts.find((c) => c.type === "bug")?._count.id;
      expect(bugCount).toBe(3);
    });

    it("counts feedback by status", async () => {
      const users: string[] = [];
      const statuses = ["pending", "pending", "resolved", "resolved", "resolved"];

      for (let i = 0; i < statuses.length; i++) {
        const user = await createTestUserInDb();
        users.push(user.id);

        await testPrisma.userFeedback.create({
          data: {
            userId: user.id,
            type: "general",
            message: `Feedback ${i}`,
            status: statuses[i],
          },
        });
      }

      const counts = await testPrisma.userFeedback.groupBy({
        by: ["status"],
        where: { userId: { in: users } },
        _count: { id: true },
      });

      const resolvedCount = counts.find((c) => c.status === "resolved")?._count.id;
      expect(resolvedCount).toBe(3);
    });

    it("finds low rating feedback for review", async () => {
      const users: string[] = [];
      const ratings = [5, 2, 4, 1, 3, 2, 5];

      for (let i = 0; i < ratings.length; i++) {
        const user = await createTestUserInDb();
        users.push(user.id);

        await testPrisma.userFeedback.create({
          data: {
            userId: user.id,
            type: "rating",
            rating: ratings[i],
            message: `Rating ${ratings[i]}`,
            status: "pending",
          },
        });
      }

      const lowRatings = await testPrisma.userFeedback.findMany({
        where: {
          userId: { in: users },
          rating: { lte: 2 },
        },
      });

      expect(lowRatings).toHaveLength(3);
    });
  });

  describe("Feedback Deletion", () => {
    it("deletes feedback", async () => {
      const user = await createTestUserInDb();

      const feedback = await testPrisma.userFeedback.create({
        data: {
          userId: user.id,
          type: "general",
          message: "Delete me",
          status: "pending",
        },
      });

      await testPrisma.userFeedback.delete({
        where: { id: feedback.id },
      });

      const found = await testPrisma.userFeedback.findUnique({
        where: { id: feedback.id },
      });

      expect(found).toBeNull();
    });

    it("deletes old resolved feedback", async () => {
      const user = await createTestUserInDb();
      const now = new Date();

      // Old resolved feedback
      for (let i = 0; i < 3; i++) {
        await testPrisma.userFeedback.create({
          data: {
            userId: user.id,
            type: "general",
            message: `Old resolved ${i}`,
            status: "resolved",
            resolvedAt: new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000),
          },
        });
      }

      // Recent feedback
      for (let i = 0; i < 2; i++) {
        await testPrisma.userFeedback.create({
          data: {
            userId: user.id,
            type: "general",
            message: `Recent ${i}`,
            status: "pending",
          },
        });
      }

      const oneEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

      await testPrisma.userFeedback.deleteMany({
        where: {
          userId: user.id,
          status: "resolved",
          resolvedAt: { lt: oneEightyDaysAgo },
        },
      });

      const remaining = await testPrisma.userFeedback.findMany({
        where: { userId: user.id },
      });

      expect(remaining).toHaveLength(2);
    });
  });

  describe("Anonymous Feedback", () => {
    it("creates anonymous feedback", async () => {
      const feedback = await testPrisma.userFeedback.create({
        data: {
          userId: null,
          type: "general",
          rating: 4,
          message: "익명 피드백입니다",
          status: "pending",
          metadata: {
            anonymous: true,
            sessionId: "session_abc123",
          },
        },
      });

      expect(feedback.userId).toBeNull();
    });

    it("retrieves anonymous feedback", async () => {
      for (let i = 0; i < 3; i++) {
        await testPrisma.userFeedback.create({
          data: {
            userId: null,
            type: "general",
            message: `Anonymous ${i}`,
            status: "pending",
          },
        });
      }

      const user = await createTestUserInDb();
      await testPrisma.userFeedback.create({
        data: {
          userId: user.id,
          type: "general",
          message: "Not anonymous",
          status: "pending",
        },
      });

      const anonymousFeedback = await testPrisma.userFeedback.findMany({
        where: { userId: null },
      });

      expect(anonymousFeedback).toHaveLength(3);
    });
  });
});
