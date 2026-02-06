/**
 * API Usage Log Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - API 호출 기록
 * - 사용량 추적
 * - 요금 계산
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

describe("Integration: API Usage Log", () => {
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

  describe("Usage Recording", () => {
    it("records API call", async () => {
      const user = await createTestUserInDb();

      const log = await testPrisma.apiUsageLog.create({
        data: {
          userId: user.id,
          endpoint: "/api/saju/reading",
          method: "POST",
          statusCode: 200,
          responseTime: 1250,
        },
      });

      expect(log.endpoint).toBe("/api/saju/reading");
      expect(log.statusCode).toBe(200);
    });

    it("records call with request details", async () => {
      const user = await createTestUserInDb();

      const log = await testPrisma.apiUsageLog.create({
        data: {
          userId: user.id,
          endpoint: "/api/compatibility",
          method: "POST",
          statusCode: 200,
          responseTime: 2100,
          requestSize: 512,
          responseSize: 4096,
          metadata: {
            userAgent: "Mobile App/1.0",
            platform: "ios",
          },
        },
      });

      expect(log.requestSize).toBe(512);
      expect(log.responseSize).toBe(4096);
    });

    it("records LLM API usage", async () => {
      const user = await createTestUserInDb();

      const log = await testPrisma.apiUsageLog.create({
        data: {
          userId: user.id,
          endpoint: "/api/chat",
          method: "POST",
          statusCode: 200,
          responseTime: 3500,
          apiProvider: "openai",
          model: "gpt-4",
          inputTokens: 500,
          outputTokens: 1200,
          cost: 0.054,
        },
      });

      expect(log.apiProvider).toBe("openai");
      expect(log.inputTokens).toBe(500);
      expect(log.cost).toBe(0.054);
    });

    it("records failed API call", async () => {
      const user = await createTestUserInDb();

      const log = await testPrisma.apiUsageLog.create({
        data: {
          userId: user.id,
          endpoint: "/api/saju/reading",
          method: "POST",
          statusCode: 500,
          responseTime: 150,
          errorMessage: "Internal server error",
          errorCode: "SERVER_ERROR",
        },
      });

      expect(log.statusCode).toBe(500);
      expect(log.errorCode).toBe("SERVER_ERROR");
    });

    it("records rate limited call", async () => {
      const user = await createTestUserInDb();

      const log = await testPrisma.apiUsageLog.create({
        data: {
          userId: user.id,
          endpoint: "/api/fortune",
          method: "GET",
          statusCode: 429,
          responseTime: 5,
          errorMessage: "Rate limit exceeded",
          errorCode: "RATE_LIMITED",
        },
      });

      expect(log.statusCode).toBe(429);
    });
  });

  describe("Usage Retrieval", () => {
    it("retrieves usage by user", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 5; i++) {
        await testPrisma.apiUsageLog.create({
          data: {
            userId: user.id,
            endpoint: `/api/endpoint_${i}`,
            method: "GET",
            statusCode: 200,
            responseTime: 100,
          },
        });
      }

      const logs = await testPrisma.apiUsageLog.findMany({
        where: { userId: user.id },
      });

      expect(logs).toHaveLength(5);
    });

    it("retrieves usage by endpoint", async () => {
      const user = await createTestUserInDb();

      const endpoints = ["/api/saju", "/api/tarot", "/api/saju", "/api/dream", "/api/saju"];

      for (const endpoint of endpoints) {
        await testPrisma.apiUsageLog.create({
          data: {
            userId: user.id,
            endpoint,
            method: "POST",
            statusCode: 200,
            responseTime: 100,
          },
        });
      }

      const sajuLogs = await testPrisma.apiUsageLog.findMany({
        where: { userId: user.id, endpoint: "/api/saju" },
      });

      expect(sajuLogs).toHaveLength(3);
    });

    it("retrieves usage by date range", async () => {
      const user = await createTestUserInDb();
      const now = new Date();

      for (let i = 0; i < 10; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        await testPrisma.apiUsageLog.create({
          data: {
            userId: user.id,
            endpoint: "/api/test",
            method: "GET",
            statusCode: 200,
            responseTime: 100,
            createdAt: date,
          },
        });
      }

      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentLogs = await testPrisma.apiUsageLog.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: sevenDaysAgo },
        },
      });

      expect(recentLogs).toHaveLength(8);
    });

    it("retrieves only successful calls", async () => {
      const user = await createTestUserInDb();

      const statusCodes = [200, 201, 400, 200, 500, 200];

      for (const statusCode of statusCodes) {
        await testPrisma.apiUsageLog.create({
          data: {
            userId: user.id,
            endpoint: "/api/test",
            method: "POST",
            statusCode,
            responseTime: 100,
          },
        });
      }

      const successfulCalls = await testPrisma.apiUsageLog.findMany({
        where: {
          userId: user.id,
          statusCode: { lt: 400 },
        },
      });

      expect(successfulCalls).toHaveLength(4);
    });
  });

  describe("Usage Statistics", () => {
    it("counts calls by endpoint", async () => {
      const user = await createTestUserInDb();

      const endpoints = ["/api/saju", "/api/tarot", "/api/saju", "/api/saju", "/api/tarot"];

      for (const endpoint of endpoints) {
        await testPrisma.apiUsageLog.create({
          data: {
            userId: user.id,
            endpoint,
            method: "POST",
            statusCode: 200,
            responseTime: 100,
          },
        });
      }

      const counts = await testPrisma.apiUsageLog.groupBy({
        by: ["endpoint"],
        where: { userId: user.id },
        _count: { id: true },
      });

      const sajuCount = counts.find((c) => c.endpoint === "/api/saju")?._count.id;
      expect(sajuCount).toBe(3);
    });

    it("calculates average response time", async () => {
      const user = await createTestUserInDb();

      const responseTimes = [100, 200, 150, 250, 300]; // avg = 200

      for (const responseTime of responseTimes) {
        await testPrisma.apiUsageLog.create({
          data: {
            userId: user.id,
            endpoint: "/api/test",
            method: "GET",
            statusCode: 200,
            responseTime,
          },
        });
      }

      const logs = await testPrisma.apiUsageLog.findMany({
        where: { userId: user.id },
      });

      const avgTime = logs.reduce((sum, l) => sum + l.responseTime, 0) / logs.length;
      expect(avgTime).toBe(200);
    });

    it("calculates total tokens used", async () => {
      const user = await createTestUserInDb();

      const tokenUsages = [
        { input: 100, output: 200 },
        { input: 150, output: 300 },
        { input: 200, output: 400 },
      ];

      for (const usage of tokenUsages) {
        await testPrisma.apiUsageLog.create({
          data: {
            userId: user.id,
            endpoint: "/api/chat",
            method: "POST",
            statusCode: 200,
            responseTime: 1000,
            inputTokens: usage.input,
            outputTokens: usage.output,
          },
        });
      }

      const logs = await testPrisma.apiUsageLog.findMany({
        where: { userId: user.id },
      });

      const totalInput = logs.reduce((sum, l) => sum + (l.inputTokens || 0), 0);
      const totalOutput = logs.reduce((sum, l) => sum + (l.outputTokens || 0), 0);

      expect(totalInput).toBe(450);
      expect(totalOutput).toBe(900);
    });

    it("calculates total cost", async () => {
      const user = await createTestUserInDb();

      const costs = [0.01, 0.02, 0.015, 0.025, 0.03]; // total = 0.1

      for (const cost of costs) {
        await testPrisma.apiUsageLog.create({
          data: {
            userId: user.id,
            endpoint: "/api/chat",
            method: "POST",
            statusCode: 200,
            responseTime: 1000,
            cost,
          },
        });
      }

      const logs = await testPrisma.apiUsageLog.findMany({
        where: { userId: user.id },
      });

      const totalCost = logs.reduce((sum, l) => sum + (l.cost || 0), 0);
      expect(totalCost).toBeCloseTo(0.1, 2);
    });

    it("counts errors by type", async () => {
      const user = await createTestUserInDb();

      const errorCodes = ["RATE_LIMITED", "SERVER_ERROR", "RATE_LIMITED", "AUTH_ERROR", "RATE_LIMITED"];

      for (const errorCode of errorCodes) {
        await testPrisma.apiUsageLog.create({
          data: {
            userId: user.id,
            endpoint: "/api/test",
            method: "POST",
            statusCode: 500,
            responseTime: 50,
            errorCode,
          },
        });
      }

      const counts = await testPrisma.apiUsageLog.groupBy({
        by: ["errorCode"],
        where: { userId: user.id, errorCode: { not: null } },
        _count: { id: true },
      });

      const rateLimitCount = counts.find((c) => c.errorCode === "RATE_LIMITED")?._count.id;
      expect(rateLimitCount).toBe(3);
    });
  });

  describe("Performance Analysis", () => {
    it("finds slowest endpoints", async () => {
      const user = await createTestUserInDb();

      const endpointTimes = [
        { endpoint: "/api/fast", time: 100 },
        { endpoint: "/api/medium", time: 500 },
        { endpoint: "/api/slow", time: 2000 },
        { endpoint: "/api/fast", time: 120 },
        { endpoint: "/api/slow", time: 2500 },
      ];

      for (const item of endpointTimes) {
        await testPrisma.apiUsageLog.create({
          data: {
            userId: user.id,
            endpoint: item.endpoint,
            method: "GET",
            statusCode: 200,
            responseTime: item.time,
          },
        });
      }

      const logs = await testPrisma.apiUsageLog.findMany({
        where: { userId: user.id },
        orderBy: { responseTime: "desc" },
        take: 1,
      });

      expect(logs[0].endpoint).toBe("/api/slow");
    });

    it("calculates error rate", async () => {
      const user = await createTestUserInDb();

      const statusCodes = [200, 200, 500, 200, 400, 200, 200, 500, 200, 200]; // 30% error

      for (const statusCode of statusCodes) {
        await testPrisma.apiUsageLog.create({
          data: {
            userId: user.id,
            endpoint: "/api/test",
            method: "POST",
            statusCode,
            responseTime: 100,
          },
        });
      }

      const total = await testPrisma.apiUsageLog.count({
        where: { userId: user.id },
      });

      const errors = await testPrisma.apiUsageLog.count({
        where: { userId: user.id, statusCode: { gte: 400 } },
      });

      const errorRate = (errors / total) * 100;
      expect(errorRate).toBe(30);
    });
  });

  describe("Usage Billing", () => {
    it("calculates monthly usage", async () => {
      const user = await createTestUserInDb();
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      for (let i = 0; i < 100; i++) {
        await testPrisma.apiUsageLog.create({
          data: {
            userId: user.id,
            endpoint: "/api/chat",
            method: "POST",
            statusCode: 200,
            responseTime: 1000,
            cost: 0.01,
          },
        });
      }

      const monthlyLogs = await testPrisma.apiUsageLog.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: startOfMonth },
        },
      });

      const monthlyCost = monthlyLogs.reduce((sum, l) => sum + (l.cost || 0), 0);
      expect(monthlyCost).toBeCloseTo(1.0, 2);
    });

    it("groups usage by provider", async () => {
      const user = await createTestUserInDb();

      const providers = ["openai", "anthropic", "openai", "openai", "anthropic"];
      const costs = [0.05, 0.03, 0.04, 0.06, 0.02];

      for (let i = 0; i < providers.length; i++) {
        await testPrisma.apiUsageLog.create({
          data: {
            userId: user.id,
            endpoint: "/api/chat",
            method: "POST",
            statusCode: 200,
            responseTime: 1000,
            apiProvider: providers[i],
            cost: costs[i],
          },
        });
      }

      const logs = await testPrisma.apiUsageLog.findMany({
        where: { userId: user.id, apiProvider: "openai" },
      });

      const openaiCost = logs.reduce((sum, l) => sum + (l.cost || 0), 0);
      expect(openaiCost).toBeCloseTo(0.15, 2);
    });
  });

  describe("Usage Cleanup", () => {
    it("deletes old logs", async () => {
      const user = await createTestUserInDb();
      const now = new Date();

      // Old logs
      for (let i = 0; i < 3; i++) {
        await testPrisma.apiUsageLog.create({
          data: {
            userId: user.id,
            endpoint: "/api/old",
            method: "GET",
            statusCode: 200,
            responseTime: 100,
            createdAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000),
          },
        });
      }

      // Recent logs
      for (let i = 0; i < 2; i++) {
        await testPrisma.apiUsageLog.create({
          data: {
            userId: user.id,
            endpoint: "/api/recent",
            method: "GET",
            statusCode: 200,
            responseTime: 100,
          },
        });
      }

      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      await testPrisma.apiUsageLog.deleteMany({
        where: {
          userId: user.id,
          createdAt: { lt: ninetyDaysAgo },
        },
      });

      const remaining = await testPrisma.apiUsageLog.findMany({
        where: { userId: user.id },
      });

      expect(remaining).toHaveLength(2);
    });
  });
});
