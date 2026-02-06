/**
 * User Activity Log Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 사용자 활동 기록
 * - 활동 유형별 추적
 * - 분석 데이터
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

describe("Integration: User Activity Log", () => {
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

  describe("Activity Recording", () => {
    it("records login activity", async () => {
      const user = await createTestUserInDb();

      const log = await testPrisma.userActivityLog.create({
        data: {
          userId: user.id,
          activityType: "login",
          description: "User logged in",
          metadata: {
            method: "email",
            device: "mobile",
            browser: "Chrome",
          },
        },
      });

      expect(log.activityType).toBe("login");
    });

    it("records page view activity", async () => {
      const user = await createTestUserInDb();

      const log = await testPrisma.userActivityLog.create({
        data: {
          userId: user.id,
          activityType: "page_view",
          description: "Viewed saju reading page",
          page: "/saju/reading",
          metadata: {
            referrer: "/dashboard",
            duration: 45,
          },
        },
      });

      expect(log.page).toBe("/saju/reading");
    });

    it("records feature usage", async () => {
      const user = await createTestUserInDb();

      const log = await testPrisma.userActivityLog.create({
        data: {
          userId: user.id,
          activityType: "feature_use",
          description: "Used tarot reading feature",
          feature: "tarot_celtic_cross",
          metadata: {
            question: "Career guidance",
            completedAt: new Date().toISOString(),
          },
        },
      });

      expect(log.feature).toBe("tarot_celtic_cross");
    });

    it("records purchase activity", async () => {
      const user = await createTestUserInDb();

      const log = await testPrisma.userActivityLog.create({
        data: {
          userId: user.id,
          activityType: "purchase",
          description: "Purchased premium saju reading",
          metadata: {
            productId: "saju_premium",
            amount: 9900,
            currency: "KRW",
            paymentMethod: "card",
          },
        },
      });

      expect(log.activityType).toBe("purchase");
    });

    it("records multiple activities", async () => {
      const user = await createTestUserInDb();

      const activities = [
        { type: "login", desc: "Login" },
        { type: "page_view", desc: "View dashboard" },
        { type: "feature_use", desc: "Use saju" },
        { type: "page_view", desc: "View history" },
        { type: "logout", desc: "Logout" },
      ];

      for (const act of activities) {
        await testPrisma.userActivityLog.create({
          data: {
            userId: user.id,
            activityType: act.type,
            description: act.desc,
          },
        });
      }

      const logs = await testPrisma.userActivityLog.findMany({
        where: { userId: user.id },
      });

      expect(logs).toHaveLength(5);
    });
  });

  describe("Activity Retrieval", () => {
    it("retrieves activities by user", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 5; i++) {
        await testPrisma.userActivityLog.create({
          data: {
            userId: user.id,
            activityType: "page_view",
            description: `Activity ${i}`,
          },
        });
      }

      const logs = await testPrisma.userActivityLog.findMany({
        where: { userId: user.id },
      });

      expect(logs).toHaveLength(5);
    });

    it("retrieves activities by type", async () => {
      const user = await createTestUserInDb();

      const types = ["login", "page_view", "page_view", "feature_use", "page_view"];

      for (let i = 0; i < types.length; i++) {
        await testPrisma.userActivityLog.create({
          data: {
            userId: user.id,
            activityType: types[i],
            description: `Activity ${i}`,
          },
        });
      }

      const pageViews = await testPrisma.userActivityLog.findMany({
        where: { userId: user.id, activityType: "page_view" },
      });

      expect(pageViews).toHaveLength(3);
    });

    it("retrieves activities by date range", async () => {
      const user = await createTestUserInDb();
      const now = new Date();

      for (let i = 0; i < 10; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        await testPrisma.userActivityLog.create({
          data: {
            userId: user.id,
            activityType: "page_view",
            description: `Activity ${i} days ago`,
            createdAt: date,
          },
        });
      }

      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentLogs = await testPrisma.userActivityLog.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: sevenDaysAgo },
        },
      });

      expect(recentLogs).toHaveLength(8);
    });

    it("retrieves recent activities first", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 5; i++) {
        await testPrisma.userActivityLog.create({
          data: {
            userId: user.id,
            activityType: "page_view",
            description: `Activity ${i}`,
          },
        });
      }

      const logs = await testPrisma.userActivityLog.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 3,
      });

      expect(logs[0].description).toBe("Activity 4");
    });
  });

  describe("Activity Statistics", () => {
    it("counts activities by type", async () => {
      const user = await createTestUserInDb();

      const types = ["login", "login", "page_view", "page_view", "page_view", "feature_use"];

      for (let i = 0; i < types.length; i++) {
        await testPrisma.userActivityLog.create({
          data: {
            userId: user.id,
            activityType: types[i],
            description: `Activity`,
          },
        });
      }

      const counts = await testPrisma.userActivityLog.groupBy({
        by: ["activityType"],
        where: { userId: user.id },
        _count: { id: true },
      });

      const pageViewCount = counts.find((c) => c.activityType === "page_view")?._count.id;
      expect(pageViewCount).toBe(3);
    });

    it("counts daily active users", async () => {
      const users: string[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < 5; i++) {
        const user = await createTestUserInDb();
        users.push(user.id);

        // Only 3 users active today
        if (i < 3) {
          await testPrisma.userActivityLog.create({
            data: {
              userId: user.id,
              activityType: "login",
              description: "Login",
              createdAt: new Date(),
            },
          });
        }
      }

      const todayLogs = await testPrisma.userActivityLog.findMany({
        where: {
          userId: { in: users },
          createdAt: { gte: today },
        },
        distinct: ["userId"],
      });

      expect(todayLogs).toHaveLength(3);
    });

    it("finds most used features", async () => {
      const user = await createTestUserInDb();

      const features = ["saju", "tarot", "saju", "dream", "saju", "tarot", "saju"];

      for (const feature of features) {
        await testPrisma.userActivityLog.create({
          data: {
            userId: user.id,
            activityType: "feature_use",
            feature,
            description: `Used ${feature}`,
          },
        });
      }

      const counts = await testPrisma.userActivityLog.groupBy({
        by: ["feature"],
        where: { userId: user.id, activityType: "feature_use" },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 1,
      });

      expect(counts[0].feature).toBe("saju");
    });

    it("calculates session duration", async () => {
      const user = await createTestUserInDb();
      const sessionId = `session_${Date.now()}`;

      // Login at 10:00
      const loginTime = new Date();
      loginTime.setHours(10, 0, 0, 0);

      await testPrisma.userActivityLog.create({
        data: {
          userId: user.id,
          activityType: "login",
          description: "Session start",
          sessionId,
          createdAt: loginTime,
        },
      });

      // Logout at 10:45
      const logoutTime = new Date();
      logoutTime.setHours(10, 45, 0, 0);

      await testPrisma.userActivityLog.create({
        data: {
          userId: user.id,
          activityType: "logout",
          description: "Session end",
          sessionId,
          createdAt: logoutTime,
        },
      });

      const sessionLogs = await testPrisma.userActivityLog.findMany({
        where: { sessionId },
        orderBy: { createdAt: "asc" },
      });

      const start = sessionLogs[0].createdAt;
      const end = sessionLogs[1].createdAt;
      const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);

      expect(durationMinutes).toBe(45);
    });
  });

  describe("Page Analytics", () => {
    it("tracks most visited pages", async () => {
      const user = await createTestUserInDb();

      const pages = ["/saju", "/tarot", "/saju", "/dream", "/saju", "/tarot"];

      for (const page of pages) {
        await testPrisma.userActivityLog.create({
          data: {
            userId: user.id,
            activityType: "page_view",
            page,
            description: `Visited ${page}`,
          },
        });
      }

      const counts = await testPrisma.userActivityLog.groupBy({
        by: ["page"],
        where: { userId: user.id, activityType: "page_view" },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 1,
      });

      expect(counts[0].page).toBe("/saju");
    });

    it("tracks user journey", async () => {
      const user = await createTestUserInDb();
      const sessionId = `session_${Date.now()}`;

      const journey = [
        { page: "/", time: 0 },
        { page: "/saju", time: 10 },
        { page: "/saju/reading", time: 30 },
        { page: "/saju/result", time: 120 },
        { page: "/history", time: 150 },
      ];

      const baseTime = new Date();

      for (const step of journey) {
        const timestamp = new Date(baseTime.getTime() + step.time * 1000);

        await testPrisma.userActivityLog.create({
          data: {
            userId: user.id,
            activityType: "page_view",
            page: step.page,
            sessionId,
            description: `Visited ${step.page}`,
            createdAt: timestamp,
          },
        });
      }

      const logs = await testPrisma.userActivityLog.findMany({
        where: { sessionId },
        orderBy: { createdAt: "asc" },
      });

      const pages = logs.map((l) => l.page);
      expect(pages).toEqual(["/", "/saju", "/saju/reading", "/saju/result", "/history"]);
    });
  });

  describe("Activity Updates", () => {
    it("updates activity metadata", async () => {
      const user = await createTestUserInDb();

      const log = await testPrisma.userActivityLog.create({
        data: {
          userId: user.id,
          activityType: "page_view",
          page: "/saju",
          description: "Visited saju",
          metadata: { enterTime: new Date().toISOString() },
        },
      });

      const updated = await testPrisma.userActivityLog.update({
        where: { id: log.id },
        data: {
          metadata: {
            enterTime: new Date().toISOString(),
            exitTime: new Date().toISOString(),
            duration: 120,
          },
        },
      });

      const meta = updated.metadata as { duration: number };
      expect(meta.duration).toBe(120);
    });
  });

  describe("Activity Deletion", () => {
    it("deletes old activity logs", async () => {
      const user = await createTestUserInDb();
      const now = new Date();

      // Old logs
      for (let i = 0; i < 3; i++) {
        await testPrisma.userActivityLog.create({
          data: {
            userId: user.id,
            activityType: "page_view",
            description: `Old ${i}`,
            createdAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000),
          },
        });
      }

      // Recent logs
      for (let i = 0; i < 2; i++) {
        await testPrisma.userActivityLog.create({
          data: {
            userId: user.id,
            activityType: "page_view",
            description: `Recent ${i}`,
          },
        });
      }

      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      await testPrisma.userActivityLog.deleteMany({
        where: {
          userId: user.id,
          createdAt: { lt: ninetyDaysAgo },
        },
      });

      const remaining = await testPrisma.userActivityLog.findMany({
        where: { userId: user.id },
      });

      expect(remaining).toHaveLength(2);
    });

    it("deletes all logs for user", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 5; i++) {
        await testPrisma.userActivityLog.create({
          data: {
            userId: user.id,
            activityType: "page_view",
            description: `Activity ${i}`,
          },
        });
      }

      await testPrisma.userActivityLog.deleteMany({
        where: { userId: user.id },
      });

      const remaining = await testPrisma.userActivityLog.findMany({
        where: { userId: user.id },
      });

      expect(remaining).toHaveLength(0);
    });
  });
});
