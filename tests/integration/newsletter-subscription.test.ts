/**
 * Newsletter Subscription Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 뉴스레터 구독 관리
 * - 구독 설정
 * - 발송 기록
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

describe("Integration: Newsletter Subscription", () => {
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

  describe("Subscription Management", () => {
    it("creates newsletter subscription", async () => {
      const user = await createTestUserInDb();

      const subscription = await testPrisma.newsletterSubscription.create({
        data: {
          userId: user.id,
          email: "test@example.com",
          isActive: true,
          frequency: "weekly",
        },
      });

      expect(subscription.isActive).toBe(true);
      expect(subscription.frequency).toBe("weekly");
    });

    it("creates subscription with preferences", async () => {
      const user = await createTestUserInDb();

      const subscription = await testPrisma.newsletterSubscription.create({
        data: {
          userId: user.id,
          email: "prefs@example.com",
          isActive: true,
          frequency: "daily",
          preferences: {
            dailyFortune: true,
            weeklyHoroscope: true,
            monthlyOverview: false,
            specialEvents: true,
          },
        },
      });

      const prefs = subscription.preferences as { dailyFortune: boolean };
      expect(prefs.dailyFortune).toBe(true);
    });

    it("creates subscription with specific categories", async () => {
      const user = await createTestUserInDb();

      const subscription = await testPrisma.newsletterSubscription.create({
        data: {
          userId: user.id,
          email: "categories@example.com",
          isActive: true,
          frequency: "weekly",
          categories: ["fortune", "tarot", "compatibility"],
        },
      });

      const categories = subscription.categories as string[];
      expect(categories).toContain("fortune");
    });

    it("creates subscription with language preference", async () => {
      const user = await createTestUserInDb();

      const subscription = await testPrisma.newsletterSubscription.create({
        data: {
          userId: user.id,
          email: "lang@example.com",
          isActive: true,
          frequency: "weekly",
          language: "en",
        },
      });

      expect(subscription.language).toBe("en");
    });
  });

  describe("Subscription Updates", () => {
    it("updates frequency", async () => {
      const user = await createTestUserInDb();

      const subscription = await testPrisma.newsletterSubscription.create({
        data: {
          userId: user.id,
          email: "freq@example.com",
          isActive: true,
          frequency: "daily",
        },
      });

      const updated = await testPrisma.newsletterSubscription.update({
        where: { id: subscription.id },
        data: { frequency: "weekly" },
      });

      expect(updated.frequency).toBe("weekly");
    });

    it("updates preferences", async () => {
      const user = await createTestUserInDb();

      const subscription = await testPrisma.newsletterSubscription.create({
        data: {
          userId: user.id,
          email: "update_prefs@example.com",
          isActive: true,
          frequency: "weekly",
          preferences: { dailyFortune: true },
        },
      });

      const updated = await testPrisma.newsletterSubscription.update({
        where: { id: subscription.id },
        data: {
          preferences: {
            dailyFortune: false,
            weeklyHoroscope: true,
          },
        },
      });

      const prefs = updated.preferences as { dailyFortune: boolean };
      expect(prefs.dailyFortune).toBe(false);
    });

    it("unsubscribes", async () => {
      const user = await createTestUserInDb();

      const subscription = await testPrisma.newsletterSubscription.create({
        data: {
          userId: user.id,
          email: "unsub@example.com",
          isActive: true,
          frequency: "weekly",
        },
      });

      const updated = await testPrisma.newsletterSubscription.update({
        where: { id: subscription.id },
        data: {
          isActive: false,
          unsubscribedAt: new Date(),
          unsubscribeReason: "Too many emails",
        },
      });

      expect(updated.isActive).toBe(false);
    });

    it("resubscribes", async () => {
      const user = await createTestUserInDb();

      const subscription = await testPrisma.newsletterSubscription.create({
        data: {
          userId: user.id,
          email: "resub@example.com",
          isActive: false,
          frequency: "weekly",
          unsubscribedAt: new Date(),
        },
      });

      const updated = await testPrisma.newsletterSubscription.update({
        where: { id: subscription.id },
        data: {
          isActive: true,
          unsubscribedAt: null,
          resubscribedAt: new Date(),
        },
      });

      expect(updated.isActive).toBe(true);
    });
  });

  describe("Subscription Retrieval", () => {
    it("retrieves active subscriptions", async () => {
      const statuses = [true, false, true, false, true];

      for (let i = 0; i < statuses.length; i++) {
        const user = await createTestUserInDb();
        await testPrisma.newsletterSubscription.create({
          data: {
            userId: user.id,
            email: `active_${i}@example.com`,
            isActive: statuses[i],
            frequency: "weekly",
          },
        });
      }

      const active = await testPrisma.newsletterSubscription.findMany({
        where: { isActive: true },
      });

      expect(active).toHaveLength(3);
    });

    it("retrieves subscriptions by frequency", async () => {
      const frequencies = ["daily", "weekly", "daily", "monthly", "daily"];

      for (let i = 0; i < frequencies.length; i++) {
        const user = await createTestUserInDb();
        await testPrisma.newsletterSubscription.create({
          data: {
            userId: user.id,
            email: `freq_${i}@example.com`,
            isActive: true,
            frequency: frequencies[i],
          },
        });
      }

      const daily = await testPrisma.newsletterSubscription.findMany({
        where: { frequency: "daily", isActive: true },
      });

      expect(daily).toHaveLength(3);
    });

    it("retrieves subscriptions by language", async () => {
      const languages = ["ko", "en", "ko", "ja", "ko"];

      for (let i = 0; i < languages.length; i++) {
        const user = await createTestUserInDb();
        await testPrisma.newsletterSubscription.create({
          data: {
            userId: user.id,
            email: `lang_${i}@example.com`,
            isActive: true,
            frequency: "weekly",
            language: languages[i],
          },
        });
      }

      const korean = await testPrisma.newsletterSubscription.findMany({
        where: { language: "ko", isActive: true },
      });

      expect(korean).toHaveLength(3);
    });
  });

  describe("Newsletter Delivery", () => {
    it("records newsletter sent", async () => {
      const user = await createTestUserInDb();

      const subscription = await testPrisma.newsletterSubscription.create({
        data: {
          userId: user.id,
          email: "delivery@example.com",
          isActive: true,
          frequency: "weekly",
        },
      });

      const delivery = await testPrisma.newsletterDelivery.create({
        data: {
          subscriptionId: subscription.id,
          newsletterId: "newsletter_2024_01",
          status: "sent",
          sentAt: new Date(),
        },
      });

      expect(delivery.status).toBe("sent");
    });

    it("records delivery failure", async () => {
      const user = await createTestUserInDb();

      const subscription = await testPrisma.newsletterSubscription.create({
        data: {
          userId: user.id,
          email: "failed@example.com",
          isActive: true,
          frequency: "weekly",
        },
      });

      const delivery = await testPrisma.newsletterDelivery.create({
        data: {
          subscriptionId: subscription.id,
          newsletterId: "newsletter_2024_02",
          status: "failed",
          errorMessage: "Invalid email address",
          failedAt: new Date(),
        },
      });

      expect(delivery.status).toBe("failed");
    });

    it("records email opened", async () => {
      const user = await createTestUserInDb();

      const subscription = await testPrisma.newsletterSubscription.create({
        data: {
          userId: user.id,
          email: "opened@example.com",
          isActive: true,
          frequency: "weekly",
        },
      });

      const delivery = await testPrisma.newsletterDelivery.create({
        data: {
          subscriptionId: subscription.id,
          newsletterId: "newsletter_2024_03",
          status: "sent",
          sentAt: new Date(),
        },
      });

      const updated = await testPrisma.newsletterDelivery.update({
        where: { id: delivery.id },
        data: {
          openedAt: new Date(),
          openCount: 1,
        },
      });

      expect(updated.openCount).toBe(1);
    });

    it("records link clicked", async () => {
      const user = await createTestUserInDb();

      const subscription = await testPrisma.newsletterSubscription.create({
        data: {
          userId: user.id,
          email: "clicked@example.com",
          isActive: true,
          frequency: "weekly",
        },
      });

      const delivery = await testPrisma.newsletterDelivery.create({
        data: {
          subscriptionId: subscription.id,
          newsletterId: "newsletter_2024_04",
          status: "sent",
          sentAt: new Date(),
          openedAt: new Date(),
        },
      });

      const updated = await testPrisma.newsletterDelivery.update({
        where: { id: delivery.id },
        data: {
          clickedAt: new Date(),
          clickCount: 3,
        },
      });

      expect(updated.clickCount).toBe(3);
    });
  });

  describe("Subscription Statistics", () => {
    it("counts subscriptions by frequency", async () => {
      const frequencies = ["daily", "weekly", "daily", "monthly", "weekly", "daily"];

      for (let i = 0; i < frequencies.length; i++) {
        const user = await createTestUserInDb();
        await testPrisma.newsletterSubscription.create({
          data: {
            userId: user.id,
            email: `stat_freq_${i}@example.com`,
            isActive: true,
            frequency: frequencies[i],
          },
        });
      }

      const counts = await testPrisma.newsletterSubscription.groupBy({
        by: ["frequency"],
        where: { isActive: true },
        _count: { id: true },
      });

      const dailyCount = counts.find((c) => c.frequency === "daily")?._count.id;
      expect(dailyCount).toBe(3);
    });

    it("calculates open rate", async () => {
      const user = await createTestUserInDb();

      const subscription = await testPrisma.newsletterSubscription.create({
        data: {
          userId: user.id,
          email: "openrate@example.com",
          isActive: true,
          frequency: "weekly",
        },
      });

      // Sent newsletters
      for (let i = 0; i < 10; i++) {
        await testPrisma.newsletterDelivery.create({
          data: {
            subscriptionId: subscription.id,
            newsletterId: `newsletter_open_${i}`,
            status: "sent",
            sentAt: new Date(),
            openedAt: i < 6 ? new Date() : null,
          },
        });
      }

      const total = await testPrisma.newsletterDelivery.count({
        where: { subscriptionId: subscription.id, status: "sent" },
      });

      const opened = await testPrisma.newsletterDelivery.count({
        where: { subscriptionId: subscription.id, openedAt: { not: null } },
      });

      const openRate = (opened / total) * 100;
      expect(openRate).toBe(60);
    });

    it("calculates click rate", async () => {
      const user = await createTestUserInDb();

      const subscription = await testPrisma.newsletterSubscription.create({
        data: {
          userId: user.id,
          email: "clickrate@example.com",
          isActive: true,
          frequency: "weekly",
        },
      });

      // Opened newsletters
      for (let i = 0; i < 10; i++) {
        await testPrisma.newsletterDelivery.create({
          data: {
            subscriptionId: subscription.id,
            newsletterId: `newsletter_click_${i}`,
            status: "sent",
            sentAt: new Date(),
            openedAt: new Date(),
            clickedAt: i < 4 ? new Date() : null,
          },
        });
      }

      const opened = await testPrisma.newsletterDelivery.count({
        where: { subscriptionId: subscription.id, openedAt: { not: null } },
      });

      const clicked = await testPrisma.newsletterDelivery.count({
        where: { subscriptionId: subscription.id, clickedAt: { not: null } },
      });

      const clickRate = (clicked / opened) * 100;
      expect(clickRate).toBe(40);
    });
  });

  describe("Bounce Handling", () => {
    it("records soft bounce", async () => {
      const user = await createTestUserInDb();

      const subscription = await testPrisma.newsletterSubscription.create({
        data: {
          userId: user.id,
          email: "softbounce@example.com",
          isActive: true,
          frequency: "weekly",
          bounceCount: 0,
        },
      });

      const updated = await testPrisma.newsletterSubscription.update({
        where: { id: subscription.id },
        data: {
          bounceCount: { increment: 1 },
          lastBounceAt: new Date(),
          lastBounceType: "soft",
        },
      });

      expect(updated.bounceCount).toBe(1);
    });

    it("deactivates after multiple bounces", async () => {
      const user = await createTestUserInDb();

      const subscription = await testPrisma.newsletterSubscription.create({
        data: {
          userId: user.id,
          email: "hardbounce@example.com",
          isActive: true,
          frequency: "weekly",
          bounceCount: 2,
        },
      });

      // Third bounce - deactivate
      const updated = await testPrisma.newsletterSubscription.update({
        where: { id: subscription.id },
        data: {
          bounceCount: 3,
          isActive: false,
          deactivatedAt: new Date(),
          deactivationReason: "Too many bounces",
        },
      });

      expect(updated.isActive).toBe(false);
    });
  });

  describe("Subscription Deletion", () => {
    it("deletes subscription", async () => {
      const user = await createTestUserInDb();

      const subscription = await testPrisma.newsletterSubscription.create({
        data: {
          userId: user.id,
          email: "delete@example.com",
          isActive: true,
          frequency: "weekly",
        },
      });

      await testPrisma.newsletterSubscription.delete({
        where: { id: subscription.id },
      });

      const found = await testPrisma.newsletterSubscription.findUnique({
        where: { id: subscription.id },
      });

      expect(found).toBeNull();
    });
  });
});
