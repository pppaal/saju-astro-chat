/**
 * Subscription Lifecycle Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 구독 생성 및 갱신
 * - 구독 업그레이드/다운그레이드
 * - 구독 취소 및 만료 처리
 *
 * 실행: npm run test:integration
 * 환경변수 필요: TEST_DATABASE_URL 또는 DATABASE_URL
 */

import { beforeAll, afterAll, afterEach, describe, it, expect } from "vitest";
import {
  testPrisma,
  createTestUserInDb,
  createTestSubscription,
  cleanupAllTestUsers,
  checkTestDbConnection,
  connectTestDb,
  disconnectTestDb,
} from "./setup";

const hasTestDb = await checkTestDbConnection();

describe("Integration: Subscription Lifecycle", () => {
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

  describe("Subscription Creation", () => {
    it("creates free tier subscription", async () => {
      const user = await createTestUserInDb();
      const subscription = await createTestSubscription(user.id, "free");

      expect(subscription.plan).toBe("free");
      expect(subscription.status).toBe("active");
    });

    it("creates premium subscription with billing cycle", async () => {
      const user = await createTestUserInDb();

      const subscription = await testPrisma.subscription.create({
        data: {
          userId: user.id,
          plan: "premium",
          status: "active",
          stripeSubscriptionId: `sub_premium_${Date.now()}`,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      expect(subscription.plan).toBe("premium");
      expect(subscription.currentPeriodEnd > new Date()).toBe(true);
    });

    it("creates annual subscription", async () => {
      const user = await createTestUserInDb();

      const subscription = await testPrisma.subscription.create({
        data: {
          userId: user.id,
          plan: "premium_annual",
          status: "active",
          stripeSubscriptionId: `sub_annual_${Date.now()}`,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });

      expect(subscription.plan).toBe("premium_annual");
    });
  });

  describe("Subscription Upgrade", () => {
    it("upgrades from free to premium", async () => {
      const user = await createTestUserInDb();
      await createTestSubscription(user.id, "free");

      const upgraded = await testPrisma.subscription.updateMany({
        where: { userId: user.id },
        data: {
          plan: "premium",
          stripeSubscriptionId: `sub_upgraded_${Date.now()}`,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      expect(upgraded.count).toBe(1);

      const subscription = await testPrisma.subscription.findFirst({
        where: { userId: user.id },
      });

      expect(subscription?.plan).toBe("premium");
    });

    it("upgrades from monthly to annual", async () => {
      const user = await createTestUserInDb();

      await testPrisma.subscription.create({
        data: {
          userId: user.id,
          plan: "premium",
          status: "active",
          stripeSubscriptionId: `sub_monthly_${Date.now()}`,
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const upgraded = await testPrisma.subscription.updateMany({
        where: { userId: user.id },
        data: {
          plan: "premium_annual",
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });

      const subscription = await testPrisma.subscription.findFirst({
        where: { userId: user.id },
      });

      expect(subscription?.plan).toBe("premium_annual");
    });
  });

  describe("Subscription Downgrade", () => {
    it("schedules downgrade at period end", async () => {
      const user = await createTestUserInDb();

      const subscription = await testPrisma.subscription.create({
        data: {
          userId: user.id,
          plan: "premium",
          status: "active",
          stripeSubscriptionId: `sub_downgrade_${Date.now()}`,
          currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          cancelAtPeriodEnd: true,
        },
      });

      expect(subscription.cancelAtPeriodEnd).toBe(true);
      expect(subscription.status).toBe("active");
    });

    it("processes downgrade after period end", async () => {
      const user = await createTestUserInDb();

      await testPrisma.subscription.create({
        data: {
          userId: user.id,
          plan: "premium",
          status: "active",
          stripeSubscriptionId: `sub_expired_${Date.now()}`,
          currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
          cancelAtPeriodEnd: true,
        },
      });

      // Simulate cron job processing expired subscriptions
      await testPrisma.subscription.updateMany({
        where: {
          userId: user.id,
          cancelAtPeriodEnd: true,
          currentPeriodEnd: { lt: new Date() },
        },
        data: {
          plan: "free",
          status: "canceled",
          cancelAtPeriodEnd: false,
        },
      });

      const subscription = await testPrisma.subscription.findFirst({
        where: { userId: user.id },
      });

      expect(subscription?.plan).toBe("free");
      expect(subscription?.status).toBe("canceled");
    });
  });

  describe("Subscription Renewal", () => {
    it("renews subscription for next period", async () => {
      const user = await createTestUserInDb();

      const oldEnd = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const newEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await testPrisma.subscription.create({
        data: {
          userId: user.id,
          plan: "premium",
          status: "active",
          stripeSubscriptionId: `sub_renew_${Date.now()}`,
          currentPeriodStart: new Date(oldEnd.getTime() - 30 * 24 * 60 * 60 * 1000),
          currentPeriodEnd: oldEnd,
        },
      });

      const renewed = await testPrisma.subscription.updateMany({
        where: { userId: user.id },
        data: {
          currentPeriodStart: new Date(),
          currentPeriodEnd: newEnd,
        },
      });

      expect(renewed.count).toBe(1);

      const subscription = await testPrisma.subscription.findFirst({
        where: { userId: user.id },
      });

      expect(subscription?.currentPeriodEnd.getTime()).toBeCloseTo(newEnd.getTime(), -3);
    });
  });

  describe("Subscription Cancellation", () => {
    it("cancels subscription immediately", async () => {
      const user = await createTestUserInDb();

      await testPrisma.subscription.create({
        data: {
          userId: user.id,
          plan: "premium",
          status: "active",
          stripeSubscriptionId: `sub_cancel_${Date.now()}`,
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      await testPrisma.subscription.updateMany({
        where: { userId: user.id },
        data: {
          status: "canceled",
          canceledAt: new Date(),
        },
      });

      const subscription = await testPrisma.subscription.findFirst({
        where: { userId: user.id },
      });

      expect(subscription?.status).toBe("canceled");
      expect(subscription?.canceledAt).not.toBeNull();
    });

    it("tracks cancellation reason", async () => {
      const user = await createTestUserInDb();

      const subscription = await testPrisma.subscription.create({
        data: {
          userId: user.id,
          plan: "premium",
          status: "canceled",
          stripeSubscriptionId: `sub_reason_${Date.now()}`,
          canceledAt: new Date(),
          metadata: {
            cancellationReason: "too_expensive",
            feedback: "가격이 너무 높아요",
          },
        },
      });

      const meta = subscription.metadata as { cancellationReason: string };
      expect(meta.cancellationReason).toBe("too_expensive");
    });
  });

  describe("Subscription Status Queries", () => {
    it("finds active subscriptions", async () => {
      const users: string[] = [];

      for (let i = 0; i < 5; i++) {
        const user = await createTestUserInDb();
        users.push(user.id);

        await testPrisma.subscription.create({
          data: {
            userId: user.id,
            plan: i < 3 ? "premium" : "free",
            status: i < 4 ? "active" : "canceled",
            stripeSubscriptionId: `sub_status_${Date.now()}_${i}`,
          },
        });
      }

      const activeSubscriptions = await testPrisma.subscription.findMany({
        where: {
          userId: { in: users },
          status: "active",
        },
      });

      expect(activeSubscriptions).toHaveLength(4);
    });

    it("finds expiring subscriptions", async () => {
      const users: string[] = [];
      const now = new Date();

      for (let i = 0; i < 4; i++) {
        const user = await createTestUserInDb();
        users.push(user.id);

        const daysUntilExpiry = i * 3; // 0, 3, 6, 9 days

        await testPrisma.subscription.create({
          data: {
            userId: user.id,
            plan: "premium",
            status: "active",
            stripeSubscriptionId: `sub_expiring_${Date.now()}_${i}`,
            currentPeriodEnd: new Date(now.getTime() + daysUntilExpiry * 24 * 60 * 60 * 1000),
          },
        });
      }

      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const expiringSubscriptions = await testPrisma.subscription.findMany({
        where: {
          userId: { in: users },
          currentPeriodEnd: { lte: sevenDaysFromNow },
        },
      });

      expect(expiringSubscriptions).toHaveLength(3); // 0, 3, 6 days
    });
  });

  describe("Subscription with Payment History", () => {
    it("tracks subscription with Stripe events", async () => {
      const user = await createTestUserInDb();
      const stripeSubId = `sub_stripe_${Date.now()}`;

      await testPrisma.subscription.create({
        data: {
          userId: user.id,
          plan: "premium",
          status: "active",
          stripeSubscriptionId: stripeSubId,
        },
      });

      // Log payment events
      const events = [
        { type: "invoice.payment_succeeded", amount: 9900 },
        { type: "customer.subscription.updated", amount: 0 },
      ];

      for (const event of events) {
        await testPrisma.stripeEventLog.create({
          data: {
            eventId: `evt_${Date.now()}_${Math.random()}`,
            eventType: event.type,
            payload: { subscriptionId: stripeSubId, amount: event.amount },
            processedAt: new Date(),
          },
        });
      }

      const logs = await testPrisma.stripeEventLog.findMany({
        where: {
          eventType: { contains: "subscription" },
        },
      });

      expect(logs.length).toBeGreaterThanOrEqual(1);
    });
  });
});
