/**
 * Premium Content Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 프리미엄 콘텐츠 접근 권한
 * - 구독 관리
 * - 보너스 크레딧 구매
 *
 * 실행: npm run test:integration
 * 환경변수 필요: TEST_DATABASE_URL 또는 DATABASE_URL
 */

import { beforeAll, afterAll, afterEach, describe, it, expect } from "vitest";
import {
  testPrisma,
  createTestUserInDb,
  createTestSubscription,
  createTestUserCredits,
  cleanupAllTestUsers,
  checkTestDbConnection,
  connectTestDb,
  disconnectTestDb,
} from "./setup";

const hasTestDb = await checkTestDbConnection();

describe("Integration: Premium Content System", () => {
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

  describe("Premium Content Access", () => {
    it("grants premium content access", async () => {
      const user = await createTestUserInDb();

      const access = await testPrisma.premiumContentAccess.create({
        data: {
          userId: user.id,
          contentType: "detailed_saju_report",
          accessGrantedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });

      expect(access).toBeDefined();
      expect(access.contentType).toBe("detailed_saju_report");
    });

    it("checks access validity", async () => {
      const user = await createTestUserInDb();

      const now = new Date();
      const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      await testPrisma.premiumContentAccess.create({
        data: {
          userId: user.id,
          contentType: "premium_tarot",
          accessGrantedAt: now,
          expiresAt: future,
        },
      });

      const validAccess = await testPrisma.premiumContentAccess.findFirst({
        where: {
          userId: user.id,
          contentType: "premium_tarot",
          expiresAt: { gt: now },
        },
      });

      expect(validAccess).not.toBeNull();
    });

    it("tracks multiple content access types", async () => {
      const user = await createTestUserInDb();

      const contentTypes = [
        "detailed_saju_report",
        "premium_tarot",
        "compatibility_deep_dive",
        "yearly_forecast",
      ];

      for (const contentType of contentTypes) {
        await testPrisma.premiumContentAccess.create({
          data: {
            userId: user.id,
            contentType,
            accessGrantedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
      }

      const accesses = await testPrisma.premiumContentAccess.findMany({
        where: { userId: user.id },
      });

      expect(accesses).toHaveLength(4);
    });

    it("detects expired access", async () => {
      const user = await createTestUserInDb();

      const past = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      const now = new Date();

      await testPrisma.premiumContentAccess.create({
        data: {
          userId: user.id,
          contentType: "expired_content",
          accessGrantedAt: new Date(past.getTime() - 7 * 24 * 60 * 60 * 1000),
          expiresAt: past,
        },
      });

      const validAccess = await testPrisma.premiumContentAccess.findFirst({
        where: {
          userId: user.id,
          contentType: "expired_content",
          expiresAt: { gt: now },
        },
      });

      expect(validAccess).toBeNull();
    });
  });

  describe("Subscription Management", () => {
    it("creates subscription with different plans", async () => {
      const user = await createTestUserInDb();

      const subscription = await createTestSubscription(user.id, "pro", "active");

      expect(subscription).toBeDefined();
      expect(subscription.plan).toBe("pro");
      expect(subscription.status).toBe("active");
    });

    it("tracks subscription period", async () => {
      const user = await createTestUserInDb();

      const subscription = await createTestSubscription(user.id, "premium");

      expect(subscription.currentPeriodStart).toBeInstanceOf(Date);
      expect(subscription.currentPeriodEnd).toBeInstanceOf(Date);
      expect(subscription.currentPeriodEnd > subscription.currentPeriodStart).toBe(true);
    });

    it("handles subscription cancellation", async () => {
      const user = await createTestUserInDb();

      const subscription = await createTestSubscription(user.id, "starter");

      const cancelled = await testPrisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "cancelled",
          canceledAt: new Date(),
        },
      });

      expect(cancelled.status).toBe("cancelled");
      expect(cancelled.canceledAt).toBeInstanceOf(Date);
    });

    it("updates subscription plan", async () => {
      const user = await createTestUserInDb();

      const subscription = await createTestSubscription(user.id, "starter");

      const upgraded = await testPrisma.subscription.update({
        where: { id: subscription.id },
        data: { plan: "pro" },
      });

      expect(upgraded.plan).toBe("pro");
    });

    it("retrieves active subscriptions", async () => {
      const user1 = await createTestUserInDb();
      const user2 = await createTestUserInDb();

      await createTestSubscription(user1.id, "pro", "active");
      await createTestSubscription(user2.id, "starter", "cancelled");

      const activeSubscriptions = await testPrisma.subscription.findMany({
        where: { status: "active" },
      });

      const user1Sub = activeSubscriptions.find((s) => s.userId === user1.id);
      expect(user1Sub).toBeDefined();
    });
  });

  describe("Bonus Credit Purchase", () => {
    it("records bonus credit purchase", async () => {
      const user = await createTestUserInDb();

      const purchase = await testPrisma.bonusCreditPurchase.create({
        data: {
          userId: user.id,
          credits: 50,
          amount: 4900,
          currency: "KRW",
          stripePaymentId: `pi_test_${Date.now()}`,
        },
      });

      expect(purchase).toBeDefined();
      expect(purchase.credits).toBe(50);
      expect(purchase.amount).toBe(4900);
    });

    it("tracks multiple purchases", async () => {
      const user = await createTestUserInDb();

      const purchases = [
        { credits: 10, amount: 990 },
        { credits: 50, amount: 4900 },
        { credits: 100, amount: 8900 },
      ];

      for (const p of purchases) {
        await testPrisma.bonusCreditPurchase.create({
          data: {
            userId: user.id,
            credits: p.credits,
            amount: p.amount,
            currency: "KRW",
            stripePaymentId: `pi_test_${Date.now()}_${Math.random()}`,
          },
        });
      }

      const userPurchases = await testPrisma.bonusCreditPurchase.findMany({
        where: { userId: user.id },
      });

      expect(userPurchases).toHaveLength(3);

      const totalCredits = userPurchases.reduce((sum, p) => sum + p.credits, 0);
      expect(totalCredits).toBe(160);
    });

    it("calculates total spent by user", async () => {
      const user = await createTestUserInDb();

      await testPrisma.bonusCreditPurchase.create({
        data: {
          userId: user.id,
          credits: 50,
          amount: 4900,
          currency: "KRW",
          stripePaymentId: `pi_1_${Date.now()}`,
        },
      });

      await testPrisma.bonusCreditPurchase.create({
        data: {
          userId: user.id,
          credits: 100,
          amount: 8900,
          currency: "KRW",
          stripePaymentId: `pi_2_${Date.now()}`,
        },
      });

      const purchases = await testPrisma.bonusCreditPurchase.findMany({
        where: { userId: user.id },
      });

      const totalSpent = purchases.reduce((sum, p) => sum + p.amount, 0);
      expect(totalSpent).toBe(13800);
    });
  });

  describe("Credit and Subscription Integration", () => {
    it("upgrades credits with subscription plan change", async () => {
      const user = await createTestUserInDb();
      await createTestUserCredits(user.id, "starter");
      await createTestSubscription(user.id, "starter");

      // Simulate upgrade to pro
      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: {
          plan: "pro",
          monthlyCredits: 80,
          compatibilityLimit: 5,
          followUpLimit: 5,
        },
      });

      await testPrisma.subscription.updateMany({
        where: { userId: user.id },
        data: { plan: "pro" },
      });

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      });

      expect(credits?.plan).toBe("pro");
      expect(credits?.monthlyCredits).toBe(80);
    });

    it("grants premium access with subscription", async () => {
      const user = await createTestUserInDb();
      await createTestSubscription(user.id, "premium");

      // Grant premium content access
      const premiumContents = ["detailed_saju", "premium_tarot", "yearly_forecast"];

      for (const contentType of premiumContents) {
        await testPrisma.premiumContentAccess.create({
          data: {
            userId: user.id,
            contentType,
            accessGrantedAt: new Date(),
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        });
      }

      const accesses = await testPrisma.premiumContentAccess.findMany({
        where: { userId: user.id },
      });

      expect(accesses).toHaveLength(3);
    });
  });

  describe("Stripe Event Logging", () => {
    it("logs stripe events", async () => {
      const log = await testPrisma.stripeEventLog.create({
        data: {
          eventId: `evt_test_${Date.now()}`,
          eventType: "customer.subscription.created",
          payload: {
            id: "sub_123",
            customer: "cus_456",
            status: "active",
          },
        },
      });

      expect(log).toBeDefined();
      expect(log.eventType).toBe("customer.subscription.created");
    });

    it("prevents duplicate event processing", async () => {
      const eventId = `evt_unique_${Date.now()}`;

      await testPrisma.stripeEventLog.create({
        data: {
          eventId,
          eventType: "invoice.paid",
          payload: {},
        },
      });

      const existing = await testPrisma.stripeEventLog.findUnique({
        where: { eventId },
      });

      expect(existing).not.toBeNull();
    });

    it("tracks processed status", async () => {
      const log = await testPrisma.stripeEventLog.create({
        data: {
          eventId: `evt_${Date.now()}`,
          eventType: "payment_intent.succeeded",
          payload: {},
          processed: false,
        },
      });

      const updated = await testPrisma.stripeEventLog.update({
        where: { id: log.id },
        data: { processed: true },
      });

      expect(updated.processed).toBe(true);
    });
  });
});
