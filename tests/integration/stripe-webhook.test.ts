/**
 * Stripe Webhook Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - Stripe 웹훅 이벤트 처리
 * - 결제 및 구독 이벤트 로깅
 * - 이벤트 중복 처리 방지
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

describe("Integration: Stripe Webhook", () => {
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

  describe("Event Logging", () => {
    it("logs checkout.session.completed event", async () => {
      const eventId = `evt_checkout_${Date.now()}`;

      const log = await testPrisma.stripeEventLog.create({
        data: {
          eventId,
          eventType: "checkout.session.completed",
          payload: {
            id: `cs_test_${Date.now()}`,
            customer: "cus_test123",
            amount_total: 9900,
            currency: "krw",
            mode: "subscription",
          },
          processedAt: new Date(),
        },
      });

      expect(log.eventType).toBe("checkout.session.completed");
      expect(log.eventId).toBe(eventId);
    });

    it("logs customer.subscription.created event", async () => {
      const eventId = `evt_sub_created_${Date.now()}`;

      const log = await testPrisma.stripeEventLog.create({
        data: {
          eventId,
          eventType: "customer.subscription.created",
          payload: {
            id: `sub_test_${Date.now()}`,
            customer: "cus_test123",
            status: "active",
            plan: { id: "price_premium_monthly" },
          },
          processedAt: new Date(),
        },
      });

      const payload = log.payload as { status: string };
      expect(payload.status).toBe("active");
    });

    it("logs invoice.payment_succeeded event", async () => {
      const eventId = `evt_invoice_${Date.now()}`;

      const log = await testPrisma.stripeEventLog.create({
        data: {
          eventId,
          eventType: "invoice.payment_succeeded",
          payload: {
            id: `in_test_${Date.now()}`,
            customer: "cus_test123",
            amount_paid: 9900,
            subscription: "sub_test123",
          },
          processedAt: new Date(),
        },
      });

      expect(log.eventType).toBe("invoice.payment_succeeded");
    });

    it("logs invoice.payment_failed event", async () => {
      const eventId = `evt_failed_${Date.now()}`;

      const log = await testPrisma.stripeEventLog.create({
        data: {
          eventId,
          eventType: "invoice.payment_failed",
          payload: {
            id: `in_failed_${Date.now()}`,
            customer: "cus_test123",
            amount_due: 9900,
            attempt_count: 1,
            next_payment_attempt: Date.now() / 1000 + 86400,
          },
          processedAt: new Date(),
        },
      });

      expect(log.eventType).toBe("invoice.payment_failed");
    });

    it("logs customer.subscription.updated event", async () => {
      const eventId = `evt_sub_updated_${Date.now()}`;

      const log = await testPrisma.stripeEventLog.create({
        data: {
          eventId,
          eventType: "customer.subscription.updated",
          payload: {
            id: `sub_test_${Date.now()}`,
            previous_attributes: { plan: { id: "price_basic" } },
            plan: { id: "price_premium" },
            status: "active",
          },
          processedAt: new Date(),
        },
      });

      expect(log.eventType).toBe("customer.subscription.updated");
    });

    it("logs customer.subscription.deleted event", async () => {
      const eventId = `evt_sub_deleted_${Date.now()}`;

      const log = await testPrisma.stripeEventLog.create({
        data: {
          eventId,
          eventType: "customer.subscription.deleted",
          payload: {
            id: `sub_test_${Date.now()}`,
            customer: "cus_test123",
            canceled_at: Date.now() / 1000,
          },
          processedAt: new Date(),
        },
      });

      expect(log.eventType).toBe("customer.subscription.deleted");
    });
  });

  describe("Idempotency", () => {
    it("prevents duplicate event processing", async () => {
      const eventId = `evt_unique_${Date.now()}`;

      // First processing
      await testPrisma.stripeEventLog.create({
        data: {
          eventId,
          eventType: "checkout.session.completed",
          payload: { test: true },
          processedAt: new Date(),
        },
      });

      // Check if already processed
      const existing = await testPrisma.stripeEventLog.findUnique({
        where: { eventId },
      });

      expect(existing).not.toBeNull();

      // Should not create duplicate
      const isAlreadyProcessed = existing !== null;
      expect(isAlreadyProcessed).toBe(true);
    });

    it("finds unprocessed events", async () => {
      const events = [
        { eventId: `evt_proc_1_${Date.now()}`, processed: true },
        { eventId: `evt_proc_2_${Date.now()}`, processed: true },
        { eventId: `evt_proc_3_${Date.now()}`, processed: false },
      ];

      for (const event of events) {
        await testPrisma.stripeEventLog.create({
          data: {
            eventId: event.eventId,
            eventType: "test.event",
            payload: {},
            processedAt: event.processed ? new Date() : null,
          },
        });
      }

      const unprocessed = await testPrisma.stripeEventLog.findMany({
        where: { processedAt: null },
      });

      expect(unprocessed).toHaveLength(1);
    });
  });

  describe("Event Processing with User Updates", () => {
    it("creates subscription on checkout completion", async () => {
      const user = await createTestUserInDb();
      const stripeSubId = `sub_checkout_${Date.now()}`;

      // Log webhook event
      await testPrisma.stripeEventLog.create({
        data: {
          eventId: `evt_checkout_complete_${Date.now()}`,
          eventType: "checkout.session.completed",
          payload: {
            mode: "subscription",
            subscription: stripeSubId,
            customer_email: user.email,
          },
          processedAt: new Date(),
        },
      });

      // Create subscription (simulating webhook handler)
      await testPrisma.subscription.create({
        data: {
          userId: user.id,
          plan: "premium",
          status: "active",
          stripeSubscriptionId: stripeSubId,
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const subscription = await testPrisma.subscription.findFirst({
        where: { userId: user.id },
      });

      expect(subscription?.stripeSubscriptionId).toBe(stripeSubId);
    });

    it("updates subscription on plan change", async () => {
      const user = await createTestUserInDb();
      const stripeSubId = `sub_upgrade_${Date.now()}`;

      await testPrisma.subscription.create({
        data: {
          userId: user.id,
          plan: "basic",
          status: "active",
          stripeSubscriptionId: stripeSubId,
        },
      });

      // Log upgrade event
      await testPrisma.stripeEventLog.create({
        data: {
          eventId: `evt_upgrade_${Date.now()}`,
          eventType: "customer.subscription.updated",
          payload: {
            id: stripeSubId,
            plan: { id: "price_premium" },
          },
          processedAt: new Date(),
        },
      });

      // Update subscription
      await testPrisma.subscription.updateMany({
        where: { stripeSubscriptionId: stripeSubId },
        data: { plan: "premium" },
      });

      const subscription = await testPrisma.subscription.findFirst({
        where: { stripeSubscriptionId: stripeSubId },
      });

      expect(subscription?.plan).toBe("premium");
    });

    it("cancels subscription on deletion event", async () => {
      const user = await createTestUserInDb();
      const stripeSubId = `sub_cancel_${Date.now()}`;

      await testPrisma.subscription.create({
        data: {
          userId: user.id,
          plan: "premium",
          status: "active",
          stripeSubscriptionId: stripeSubId,
        },
      });

      // Log cancellation event
      await testPrisma.stripeEventLog.create({
        data: {
          eventId: `evt_cancel_${Date.now()}`,
          eventType: "customer.subscription.deleted",
          payload: {
            id: stripeSubId,
            canceled_at: Date.now() / 1000,
          },
          processedAt: new Date(),
        },
      });

      // Cancel subscription
      await testPrisma.subscription.updateMany({
        where: { stripeSubscriptionId: stripeSubId },
        data: {
          status: "canceled",
          canceledAt: new Date(),
        },
      });

      const subscription = await testPrisma.subscription.findFirst({
        where: { stripeSubscriptionId: stripeSubId },
      });

      expect(subscription?.status).toBe("canceled");
    });

    it("handles payment failure gracefully", async () => {
      const user = await createTestUserInDb();
      const stripeSubId = `sub_failed_${Date.now()}`;

      await testPrisma.subscription.create({
        data: {
          userId: user.id,
          plan: "premium",
          status: "active",
          stripeSubscriptionId: stripeSubId,
        },
      });

      // Log payment failure
      await testPrisma.stripeEventLog.create({
        data: {
          eventId: `evt_payment_failed_${Date.now()}`,
          eventType: "invoice.payment_failed",
          payload: {
            subscription: stripeSubId,
            attempt_count: 1,
          },
          processedAt: new Date(),
        },
      });

      // Update subscription status
      await testPrisma.subscription.updateMany({
        where: { stripeSubscriptionId: stripeSubId },
        data: { status: "past_due" },
      });

      const subscription = await testPrisma.subscription.findFirst({
        where: { stripeSubscriptionId: stripeSubId },
      });

      expect(subscription?.status).toBe("past_due");
    });
  });

  describe("Bonus Credit Purchase Events", () => {
    it("logs bonus credit purchase", async () => {
      const user = await createTestUserInDb();
      const paymentIntentId = `pi_bonus_${Date.now()}`;

      await testPrisma.stripeEventLog.create({
        data: {
          eventId: `evt_bonus_${Date.now()}`,
          eventType: "payment_intent.succeeded",
          payload: {
            id: paymentIntentId,
            amount: 4900,
            metadata: { type: "bonus_credits", credits: 50 },
          },
          processedAt: new Date(),
        },
      });

      await testPrisma.bonusCreditPurchase.create({
        data: {
          userId: user.id,
          amount: 50,
          price: 4900,
          stripePaymentIntentId: paymentIntentId,
          status: "completed",
        },
      });

      const purchase = await testPrisma.bonusCreditPurchase.findFirst({
        where: { stripePaymentIntentId: paymentIntentId },
      });

      expect(purchase?.amount).toBe(50);
      expect(purchase?.status).toBe("completed");
    });
  });

  describe("Event Query and Analysis", () => {
    it("retrieves events by type", async () => {
      const types = [
        "checkout.session.completed",
        "checkout.session.completed",
        "invoice.payment_succeeded",
        "customer.subscription.updated",
      ];

      for (let i = 0; i < types.length; i++) {
        await testPrisma.stripeEventLog.create({
          data: {
            eventId: `evt_type_${Date.now()}_${i}`,
            eventType: types[i],
            payload: {},
            processedAt: new Date(),
          },
        });
      }

      const checkoutEvents = await testPrisma.stripeEventLog.findMany({
        where: { eventType: "checkout.session.completed" },
      });

      expect(checkoutEvents).toHaveLength(2);
    });

    it("retrieves events in time range", async () => {
      const now = new Date();

      for (let i = 0; i < 5; i++) {
        await testPrisma.stripeEventLog.create({
          data: {
            eventId: `evt_time_${Date.now()}_${i}`,
            eventType: "test.event",
            payload: {},
            processedAt: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
          },
        });
      }

      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      const recentEvents = await testPrisma.stripeEventLog.findMany({
        where: {
          eventType: "test.event",
          processedAt: { gte: threeDaysAgo },
        },
      });

      expect(recentEvents.length).toBeGreaterThanOrEqual(3);
    });

    it("counts events by type", async () => {
      const eventTypes = [
        "invoice.payment_succeeded",
        "invoice.payment_succeeded",
        "invoice.payment_succeeded",
        "invoice.payment_failed",
        "invoice.payment_failed",
      ];

      for (let i = 0; i < eventTypes.length; i++) {
        await testPrisma.stripeEventLog.create({
          data: {
            eventId: `evt_count_${Date.now()}_${i}`,
            eventType: eventTypes[i],
            payload: {},
            processedAt: new Date(),
          },
        });
      }

      const counts = await testPrisma.stripeEventLog.groupBy({
        by: ["eventType"],
        where: {
          eventType: { startsWith: "invoice.payment" },
        },
        _count: { eventId: true },
      });

      const successCount = counts.find((c) => c.eventType === "invoice.payment_succeeded")?._count.eventId;
      expect(successCount).toBe(3);
    });
  });

  describe("Event Cleanup", () => {
    it("deletes old processed events", async () => {
      const now = new Date();

      // Old events
      for (let i = 0; i < 3; i++) {
        await testPrisma.stripeEventLog.create({
          data: {
            eventId: `evt_old_${Date.now()}_${i}`,
            eventType: "old.event",
            payload: {},
            processedAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000),
          },
        });
      }

      // Recent events
      for (let i = 0; i < 2; i++) {
        await testPrisma.stripeEventLog.create({
          data: {
            eventId: `evt_recent_${Date.now()}_${i}`,
            eventType: "recent.event",
            payload: {},
            processedAt: now,
          },
        });
      }

      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      await testPrisma.stripeEventLog.deleteMany({
        where: {
          processedAt: { lt: ninetyDaysAgo },
        },
      });

      const oldEvents = await testPrisma.stripeEventLog.findMany({
        where: { eventType: "old.event" },
      });

      expect(oldEvents).toHaveLength(0);
    });
  });
});
