/**
 * Email Logs Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 이메일 발송 기록
 * - 이메일 상태 추적
 * - 이메일 통계 분석
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

describe("Integration: Email Logs", () => {
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

  describe("Email Log Creation", () => {
    it("logs sent email", async () => {
      const log = await testPrisma.emailLog.create({
        data: {
          to: "user@example.com",
          subject: "환영합니다!",
          type: "welcome",
          status: "sent",
          sentAt: new Date(),
        },
      });

      expect(log.status).toBe("sent");
      expect(log.type).toBe("welcome");
    });

    it("logs verification email", async () => {
      const log = await testPrisma.emailLog.create({
        data: {
          to: "verify@example.com",
          subject: "이메일 인증",
          type: "verification",
          status: "sent",
          sentAt: new Date(),
          metadata: {
            token: "verify_token_123",
            expiresIn: "24h",
          },
        },
      });

      const meta = log.metadata as { token: string };
      expect(meta.token).toBe("verify_token_123");
    });

    it("logs password reset email", async () => {
      const log = await testPrisma.emailLog.create({
        data: {
          to: "reset@example.com",
          subject: "비밀번호 재설정",
          type: "password_reset",
          status: "sent",
          sentAt: new Date(),
        },
      });

      expect(log.type).toBe("password_reset");
    });

    it("logs marketing email", async () => {
      const log = await testPrisma.emailLog.create({
        data: {
          to: "marketing@example.com",
          subject: "새로운 기능 안내",
          type: "marketing",
          status: "sent",
          sentAt: new Date(),
          campaignId: "campaign_summer_2024",
        },
      });

      expect(log.campaignId).toBe("campaign_summer_2024");
    });

    it("logs daily fortune email", async () => {
      const log = await testPrisma.emailLog.create({
        data: {
          to: "fortune@example.com",
          subject: "오늘의 운세",
          type: "daily_fortune",
          status: "sent",
          sentAt: new Date(),
          metadata: {
            date: "2024-06-15",
            overallScore: 85,
          },
        },
      });

      expect(log.type).toBe("daily_fortune");
    });
  });

  describe("Email Status Tracking", () => {
    it("tracks pending emails", async () => {
      const log = await testPrisma.emailLog.create({
        data: {
          to: "pending@example.com",
          subject: "Pending Email",
          type: "notification",
          status: "pending",
        },
      });

      expect(log.status).toBe("pending");
      expect(log.sentAt).toBeNull();
    });

    it("tracks failed emails", async () => {
      const log = await testPrisma.emailLog.create({
        data: {
          to: "invalid@",
          subject: "Failed Email",
          type: "notification",
          status: "failed",
          error: "Invalid email address",
        },
      });

      expect(log.status).toBe("failed");
      expect(log.error).toBe("Invalid email address");
    });

    it("tracks bounced emails", async () => {
      const log = await testPrisma.emailLog.create({
        data: {
          to: "bounced@nonexistent.com",
          subject: "Bounced Email",
          type: "notification",
          status: "bounced",
          error: "Mailbox not found",
        },
      });

      expect(log.status).toBe("bounced");
    });

    it("updates email status", async () => {
      const log = await testPrisma.emailLog.create({
        data: {
          to: "update@example.com",
          subject: "Status Update Test",
          type: "notification",
          status: "pending",
        },
      });

      const updated = await testPrisma.emailLog.update({
        where: { id: log.id },
        data: {
          status: "sent",
          sentAt: new Date(),
        },
      });

      expect(updated.status).toBe("sent");
      expect(updated.sentAt).not.toBeNull();
    });
  });

  describe("Email Log Retrieval", () => {
    it("retrieves emails by recipient", async () => {
      const email = "recipient@example.com";

      for (let i = 0; i < 5; i++) {
        await testPrisma.emailLog.create({
          data: {
            to: email,
            subject: `Email ${i}`,
            type: "notification",
            status: "sent",
            sentAt: new Date(),
          },
        });
      }

      const logs = await testPrisma.emailLog.findMany({
        where: { to: email },
      });

      expect(logs).toHaveLength(5);
    });

    it("retrieves emails by type", async () => {
      const types = ["welcome", "welcome", "verification", "marketing", "welcome"];

      for (let i = 0; i < types.length; i++) {
        await testPrisma.emailLog.create({
          data: {
            to: `user${i}@example.com`,
            subject: `Email ${i}`,
            type: types[i],
            status: "sent",
            sentAt: new Date(),
          },
        });
      }

      const welcomeEmails = await testPrisma.emailLog.findMany({
        where: { type: "welcome" },
      });

      expect(welcomeEmails).toHaveLength(3);
    });

    it("retrieves emails by status", async () => {
      const statuses = ["sent", "sent", "failed", "pending", "sent"];

      for (let i = 0; i < statuses.length; i++) {
        await testPrisma.emailLog.create({
          data: {
            to: `status${i}@example.com`,
            subject: `Email ${i}`,
            type: "notification",
            status: statuses[i],
            sentAt: statuses[i] === "sent" ? new Date() : null,
          },
        });
      }

      const sentEmails = await testPrisma.emailLog.findMany({
        where: { status: "sent" },
      });

      expect(sentEmails).toHaveLength(3);
    });

    it("retrieves emails by date range", async () => {
      const now = new Date();

      for (let i = 0; i < 5; i++) {
        await testPrisma.emailLog.create({
          data: {
            to: `date${i}@example.com`,
            subject: `Email ${i}`,
            type: "notification",
            status: "sent",
            sentAt: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
          },
        });
      }

      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      const recentEmails = await testPrisma.emailLog.findMany({
        where: {
          sentAt: { gte: threeDaysAgo },
        },
      });

      expect(recentEmails.length).toBeGreaterThanOrEqual(3);
    });

    it("retrieves emails by campaign", async () => {
      const campaignId = "summer_campaign_2024";

      for (let i = 0; i < 4; i++) {
        await testPrisma.emailLog.create({
          data: {
            to: `campaign${i}@example.com`,
            subject: "Campaign Email",
            type: "marketing",
            status: "sent",
            sentAt: new Date(),
            campaignId: i < 3 ? campaignId : "other_campaign",
          },
        });
      }

      const campaignEmails = await testPrisma.emailLog.findMany({
        where: { campaignId },
      });

      expect(campaignEmails).toHaveLength(3);
    });
  });

  describe("Email Statistics", () => {
    it("counts emails by status", async () => {
      const statuses = ["sent", "sent", "sent", "failed", "pending"];

      for (let i = 0; i < statuses.length; i++) {
        await testPrisma.emailLog.create({
          data: {
            to: `stats${i}@example.com`,
            subject: `Email ${i}`,
            type: "notification",
            status: statuses[i],
          },
        });
      }

      const counts = await testPrisma.emailLog.groupBy({
        by: ["status"],
        _count: { id: true },
      });

      const sentCount = counts.find((c) => c.status === "sent")?._count.id;
      expect(sentCount).toBe(3);
    });

    it("counts emails by type", async () => {
      const types = ["welcome", "verification", "welcome", "marketing", "welcome"];

      for (let i = 0; i < types.length; i++) {
        await testPrisma.emailLog.create({
          data: {
            to: `type${i}@example.com`,
            subject: `Email ${i}`,
            type: types[i],
            status: "sent",
          },
        });
      }

      const counts = await testPrisma.emailLog.groupBy({
        by: ["type"],
        _count: { id: true },
      });

      const welcomeCount = counts.find((c) => c.type === "welcome")?._count.id;
      expect(welcomeCount).toBe(3);
    });

    it("calculates success rate", async () => {
      const statuses = ["sent", "sent", "sent", "sent", "failed"];

      for (let i = 0; i < statuses.length; i++) {
        await testPrisma.emailLog.create({
          data: {
            to: `rate${i}@example.com`,
            subject: `Email ${i}`,
            type: "notification",
            status: statuses[i],
          },
        });
      }

      const total = await testPrisma.emailLog.count({
        where: { type: "notification" },
      });

      const sent = await testPrisma.emailLog.count({
        where: { type: "notification", status: "sent" },
      });

      const successRate = (sent / total) * 100;
      expect(successRate).toBe(80);
    });
  });

  describe("Email Log Cleanup", () => {
    it("deletes old email logs", async () => {
      const now = new Date();

      // Old logs
      for (let i = 0; i < 3; i++) {
        await testPrisma.emailLog.create({
          data: {
            to: `old${i}@example.com`,
            subject: "Old Email",
            type: "notification",
            status: "sent",
            sentAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000),
          },
        });
      }

      // Recent logs
      for (let i = 0; i < 2; i++) {
        await testPrisma.emailLog.create({
          data: {
            to: `recent${i}@example.com`,
            subject: "Recent Email",
            type: "notification",
            status: "sent",
            sentAt: now,
          },
        });
      }

      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      await testPrisma.emailLog.deleteMany({
        where: {
          sentAt: { lt: ninetyDaysAgo },
        },
      });

      const remaining = await testPrisma.emailLog.findMany({
        where: { subject: { in: ["Old Email", "Recent Email"] } },
      });

      expect(remaining).toHaveLength(2);
    });
  });

  describe("Email Retry Logic", () => {
    it("tracks retry attempts", async () => {
      const log = await testPrisma.emailLog.create({
        data: {
          to: "retry@example.com",
          subject: "Retry Test",
          type: "notification",
          status: "failed",
          error: "Temporary failure",
          metadata: {
            retryCount: 1,
            lastRetryAt: new Date().toISOString(),
          },
        },
      });

      const meta = log.metadata as { retryCount: number };
      expect(meta.retryCount).toBe(1);
    });

    it("updates status after successful retry", async () => {
      const log = await testPrisma.emailLog.create({
        data: {
          to: "retry_success@example.com",
          subject: "Retry Success",
          type: "notification",
          status: "failed",
          metadata: { retryCount: 2 },
        },
      });

      const updated = await testPrisma.emailLog.update({
        where: { id: log.id },
        data: {
          status: "sent",
          sentAt: new Date(),
          error: null,
          metadata: { retryCount: 3, success: true },
        },
      });

      expect(updated.status).toBe("sent");
    });
  });
});
