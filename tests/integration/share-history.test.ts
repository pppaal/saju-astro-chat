/**
 * Share History Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 콘텐츠 공유 기록
 * - 공유 분석
 * - 바이럴 추적
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

describe("Integration: Share History", () => {
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

  describe("Share Recording", () => {
    it("records content share", async () => {
      const user = await createTestUserInDb();

      const share = await testPrisma.shareHistory.create({
        data: {
          userId: user.id,
          contentType: "saju_result",
          contentId: "result-123",
          platform: "kakao",
          sharedAt: new Date(),
        },
      });

      expect(share.contentType).toBe("saju_result");
      expect(share.platform).toBe("kakao");
    });

    it("records share with URL", async () => {
      const user = await createTestUserInDb();

      const share = await testPrisma.shareHistory.create({
        data: {
          userId: user.id,
          contentType: "tarot_reading",
          contentId: "reading-456",
          platform: "link",
          shareUrl: "https://app.example.com/share/abc123",
          sharedAt: new Date(),
        },
      });

      expect(share.shareUrl).toContain("share");
    });

    it("records share with message", async () => {
      const user = await createTestUserInDb();

      const share = await testPrisma.shareHistory.create({
        data: {
          userId: user.id,
          contentType: "compatibility_result",
          contentId: "compat-789",
          platform: "message",
          shareMessage: "우리 궁합 봐봐! 💕",
          sharedAt: new Date(),
        },
      });

      expect(share.shareMessage).toContain("궁합");
    });

    it("records share to multiple platforms", async () => {
      const user = await createTestUserInDb();
      const platforms = ["kakao", "instagram", "facebook", "twitter", "link"];

      for (const platform of platforms) {
        await testPrisma.shareHistory.create({
          data: {
            userId: user.id,
            contentType: "daily_fortune",
            contentId: "fortune-123",
            platform,
            sharedAt: new Date(),
          },
        });
      }

      const shares = await testPrisma.shareHistory.findMany({
        where: { userId: user.id },
      });

      expect(shares).toHaveLength(5);
    });

    it("records share with recipient", async () => {
      const user = await createTestUserInDb();
      const recipient = await createTestUserInDb();

      const share = await testPrisma.shareHistory.create({
        data: {
          userId: user.id,
          contentType: "compatibility_result",
          contentId: "compat-direct",
          platform: "in_app",
          recipientId: recipient.id,
          sharedAt: new Date(),
        },
      });

      expect(share.recipientId).toBe(recipient.id);
    });
  });

  describe("Share Tracking", () => {
    it("tracks share views", async () => {
      const user = await createTestUserInDb();

      const share = await testPrisma.shareHistory.create({
        data: {
          userId: user.id,
          contentType: "saju_result",
          contentId: "result-views",
          platform: "link",
          shareUrl: "https://app.example.com/share/xyz",
          sharedAt: new Date(),
          viewCount: 0,
        },
      });

      const updated = await testPrisma.shareHistory.update({
        where: { id: share.id },
        data: { viewCount: { increment: 1 } },
      });

      expect(updated.viewCount).toBe(1);
    });

    it("tracks share clicks", async () => {
      const user = await createTestUserInDb();

      const share = await testPrisma.shareHistory.create({
        data: {
          userId: user.id,
          contentType: "tarot_result",
          contentId: "result-clicks",
          platform: "kakao",
          sharedAt: new Date(),
          clickCount: 0,
        },
      });

      // Simulate multiple clicks
      for (let i = 0; i < 5; i++) {
        await testPrisma.shareHistory.update({
          where: { id: share.id },
          data: { clickCount: { increment: 1 } },
        });
      }

      const result = await testPrisma.shareHistory.findUnique({
        where: { id: share.id },
      });

      expect(result?.clickCount).toBe(5);
    });

    it("records conversion from share", async () => {
      const user = await createTestUserInDb();
      const newUser = await createTestUserInDb();

      const share = await testPrisma.shareHistory.create({
        data: {
          userId: user.id,
          contentType: "app_invite",
          contentId: "invite-123",
          platform: "kakao",
          sharedAt: new Date(),
        },
      });

      const updated = await testPrisma.shareHistory.update({
        where: { id: share.id },
        data: {
          hasConversion: true,
          conversionUserId: newUser.id,
          conversionAt: new Date(),
        },
      });

      expect(updated.hasConversion).toBe(true);
    });
  });

  describe("Share Statistics", () => {
    it("counts shares by platform", async () => {
      const platforms = ["kakao", "instagram", "kakao", "facebook", "kakao", "link"];

      for (let i = 0; i < platforms.length; i++) {
        const user = await createTestUserInDb();
        await testPrisma.shareHistory.create({
          data: {
            userId: user.id,
            contentType: "saju_result",
            contentId: `result-${i}`,
            platform: platforms[i],
            sharedAt: new Date(),
          },
        });
      }

      const counts = await testPrisma.shareHistory.groupBy({
        by: ["platform"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      });

      expect(counts[0].platform).toBe("kakao");
      expect(counts[0]._count.id).toBe(3);
    });

    it("counts shares by content type", async () => {
      const contentTypes = ["saju_result", "tarot_reading", "saju_result", "saju_result", "compatibility"];

      for (let i = 0; i < contentTypes.length; i++) {
        const user = await createTestUserInDb();
        await testPrisma.shareHistory.create({
          data: {
            userId: user.id,
            contentType: contentTypes[i],
            contentId: `content-${i}`,
            platform: "kakao",
            sharedAt: new Date(),
          },
        });
      }

      const counts = await testPrisma.shareHistory.groupBy({
        by: ["contentType"],
        _count: { id: true },
      });

      const sajuCount = counts.find((c) => c.contentType === "saju_result")?._count.id;
      expect(sajuCount).toBe(3);
    });

    it("calculates total views", async () => {
      const user = await createTestUserInDb();

      const viewCounts = [10, 25, 5, 15, 30];

      for (let i = 0; i < viewCounts.length; i++) {
        await testPrisma.shareHistory.create({
          data: {
            userId: user.id,
            contentType: "saju_result",
            contentId: `result-${i}`,
            platform: "link",
            sharedAt: new Date(),
            viewCount: viewCounts[i],
          },
        });
      }

      const shares = await testPrisma.shareHistory.findMany({
        where: { userId: user.id },
      });

      const totalViews = shares.reduce((sum, s) => sum + (s.viewCount ?? 0), 0);
      expect(totalViews).toBe(85);
    });

    it("calculates conversion rate", async () => {
      const converted = [true, false, true, false, false, true, false, true, false, false];

      for (let i = 0; i < converted.length; i++) {
        const user = await createTestUserInDb();
        await testPrisma.shareHistory.create({
          data: {
            userId: user.id,
            contentType: "app_invite",
            contentId: `invite-${i}`,
            platform: "kakao",
            sharedAt: new Date(),
            hasConversion: converted[i],
          },
        });
      }

      const total = await testPrisma.shareHistory.count({
        where: { contentType: "app_invite" },
      });

      const conversions = await testPrisma.shareHistory.count({
        where: { contentType: "app_invite", hasConversion: true },
      });

      const conversionRate = (conversions / total) * 100;
      expect(conversionRate).toBe(40);
    });

    it("finds top sharers", async () => {
      const users = [];
      const shareCounts = [2, 5, 3, 8, 1];

      for (let i = 0; i < shareCounts.length; i++) {
        const user = await createTestUserInDb();
        users.push(user);

        for (let j = 0; j < shareCounts[i]; j++) {
          await testPrisma.shareHistory.create({
            data: {
              userId: user.id,
              contentType: "saju_result",
              contentId: `result-${i}-${j}`,
              platform: "kakao",
              sharedAt: new Date(),
            },
          });
        }
      }

      const topSharers = await testPrisma.shareHistory.groupBy({
        by: ["userId"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 3,
      });

      expect(topSharers[0]._count.id).toBe(8);
    });
  });

  describe("Share Queries", () => {
    it("retrieves user share history", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 5; i++) {
        await testPrisma.shareHistory.create({
          data: {
            userId: user.id,
            contentType: "saju_result",
            contentId: `result-${i}`,
            platform: i % 2 === 0 ? "kakao" : "instagram",
            sharedAt: new Date(),
          },
        });
      }

      const history = await testPrisma.shareHistory.findMany({
        where: { userId: user.id },
        orderBy: { sharedAt: "desc" },
      });

      expect(history).toHaveLength(5);
    });

    it("retrieves shares by date range", async () => {
      const user = await createTestUserInDb();
      const now = new Date();

      for (let i = 0; i < 10; i++) {
        const sharedAt = new Date(now);
        sharedAt.setDate(sharedAt.getDate() - i);

        await testPrisma.shareHistory.create({
          data: {
            userId: user.id,
            contentType: "daily_fortune",
            contentId: `fortune-${i}`,
            platform: "kakao",
            sharedAt,
          },
        });
      }

      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentShares = await testPrisma.shareHistory.findMany({
        where: {
          userId: user.id,
          sharedAt: { gte: sevenDaysAgo },
        },
      });

      expect(recentShares).toHaveLength(8);
    });

    it("retrieves shares with conversions", async () => {
      const user = await createTestUserInDb();

      const hasConversion = [true, false, true, false, false];

      for (let i = 0; i < hasConversion.length; i++) {
        await testPrisma.shareHistory.create({
          data: {
            userId: user.id,
            contentType: "app_invite",
            contentId: `invite-${i}`,
            platform: "kakao",
            sharedAt: new Date(),
            hasConversion: hasConversion[i],
          },
        });
      }

      const converted = await testPrisma.shareHistory.findMany({
        where: { userId: user.id, hasConversion: true },
      });

      expect(converted).toHaveLength(2);
    });

    it("retrieves most shared content", async () => {
      const contentIds = ["content-A", "content-B", "content-A", "content-C", "content-A", "content-B"];

      for (let i = 0; i < contentIds.length; i++) {
        const user = await createTestUserInDb();
        await testPrisma.shareHistory.create({
          data: {
            userId: user.id,
            contentType: "saju_result",
            contentId: contentIds[i],
            platform: "kakao",
            sharedAt: new Date(),
          },
        });
      }

      const mostShared = await testPrisma.shareHistory.groupBy({
        by: ["contentId"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 1,
      });

      expect(mostShared[0].contentId).toBe("content-A");
      expect(mostShared[0]._count.id).toBe(3);
    });
  });

  describe("Share Analytics", () => {
    it("calculates daily share count", async () => {
      const user = await createTestUserInDb();
      const now = new Date();

      // Share 5 times today
      for (let i = 0; i < 5; i++) {
        await testPrisma.shareHistory.create({
          data: {
            userId: user.id,
            contentType: "saju_result",
            contentId: `result-today-${i}`,
            platform: "kakao",
            sharedAt: now,
          },
        });
      }

      // Share 3 times yesterday
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      for (let i = 0; i < 3; i++) {
        await testPrisma.shareHistory.create({
          data: {
            userId: user.id,
            contentType: "saju_result",
            contentId: `result-yesterday-${i}`,
            platform: "kakao",
            sharedAt: yesterday,
          },
        });
      }

      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayCount = await testPrisma.shareHistory.count({
        where: {
          sharedAt: { gte: today, lt: tomorrow },
        },
      });

      expect(todayCount).toBe(5);
    });

    it("tracks viral spread", async () => {
      const originalUser = await createTestUserInDb();

      // Original share
      const originalShare = await testPrisma.shareHistory.create({
        data: {
          userId: originalUser.id,
          contentType: "viral_content",
          contentId: "viral-123",
          platform: "kakao",
          sharedAt: new Date(),
        },
      });

      // Secondary shares from users who saw the original
      for (let i = 0; i < 3; i++) {
        const newUser = await createTestUserInDb();
        await testPrisma.shareHistory.create({
          data: {
            userId: newUser.id,
            contentType: "viral_content",
            contentId: "viral-123",
            platform: "kakao",
            sharedAt: new Date(),
            sourceShareId: originalShare.id,
          },
        });
      }

      const secondaryShares = await testPrisma.shareHistory.count({
        where: { sourceShareId: originalShare.id },
      });

      expect(secondaryShares).toBe(3);
    });
  });

  describe("Share Deletion", () => {
    it("deletes share history", async () => {
      const user = await createTestUserInDb();

      const share = await testPrisma.shareHistory.create({
        data: {
          userId: user.id,
          contentType: "saju_result",
          contentId: "result-delete",
          platform: "kakao",
          sharedAt: new Date(),
        },
      });

      await testPrisma.shareHistory.delete({
        where: { id: share.id },
      });

      const found = await testPrisma.shareHistory.findUnique({
        where: { id: share.id },
      });

      expect(found).toBeNull();
    });
  });
});
