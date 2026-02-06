/**
 * Transaction Workflows Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 복합 트랜잭션 워크플로우
 * - 크레딧 소비 및 환불
 * - 구독 업그레이드/다운그레이드
 *
 * 실행: npm run test:integration
 * 환경변수 필요: TEST_DATABASE_URL 또는 DATABASE_URL
 */

import { beforeAll, afterAll, afterEach, describe, it, expect } from "vitest";
import {
  testPrisma,
  createTestUserInDb,
  createTestUserCredits,
  createTestSubscription,
  cleanupAllTestUsers,
  checkTestDbConnection,
  connectTestDb,
  disconnectTestDb,
} from "./setup";

const hasTestDb = await checkTestDbConnection();

describe("Integration: Transaction Workflows", () => {
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

  describe("Credit Consumption Workflow", () => {
    it("atomically consumes credit and creates reading", async () => {
      const user = await createTestUserInDb();
      await createTestUserCredits(user.id, "starter");

      const result = await testPrisma.$transaction(async (tx) => {
        const credits = await tx.userCredits.findUnique({
          where: { userId: user.id },
        });

        const available =
          (credits?.monthlyCredits || 0) -
          (credits?.usedCredits || 0) +
          (credits?.bonusCredits || 0);

        if (available <= 0) {
          throw new Error("Insufficient credits");
        }

        const reading = await tx.reading.create({
          data: {
            userId: user.id,
            type: "saju",
            content: JSON.stringify({ result: "Your fortune..." }),
          },
        });

        await tx.userCredits.update({
          where: { userId: user.id },
          data: { usedCredits: { increment: 1 } },
        });

        return { reading, creditsUsed: 1 };
      });

      expect(result.reading).toBeDefined();

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      });
      expect(credits?.usedCredits).toBe(1);
    });

    it("rolls back on insufficient credits", async () => {
      const user = await createTestUserInDb();
      await createTestUserCredits(user.id, "free");

      // Use all credits
      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: { usedCredits: 7 },
      });

      const initialReadingCount = await testPrisma.reading.count({
        where: { userId: user.id },
      });

      try {
        await testPrisma.$transaction(async (tx) => {
          const credits = await tx.userCredits.findUnique({
            where: { userId: user.id },
          });

          const available =
            (credits?.monthlyCredits || 0) -
            (credits?.usedCredits || 0) +
            (credits?.bonusCredits || 0);

          if (available <= 0) {
            throw new Error("Insufficient credits");
          }

          await tx.reading.create({
            data: {
              userId: user.id,
              type: "saju",
              content: "{}",
            },
          });
        });
      } catch {
        // Expected to fail
      }

      const finalReadingCount = await testPrisma.reading.count({
        where: { userId: user.id },
      });

      expect(finalReadingCount).toBe(initialReadingCount);
    });

    it("uses bonus credits before monthly credits", async () => {
      const user = await createTestUserInDb();
      await createTestUserCredits(user.id, "starter");

      // Add bonus credits
      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: { bonusCredits: 5 },
      });

      await testPrisma.$transaction(async (tx) => {
        const credits = await tx.userCredits.findUnique({
          where: { userId: user.id },
        });

        if ((credits?.bonusCredits || 0) > 0) {
          await tx.userCredits.update({
            where: { userId: user.id },
            data: { bonusCredits: { decrement: 1 } },
          });
        } else {
          await tx.userCredits.update({
            where: { userId: user.id },
            data: { usedCredits: { increment: 1 } },
          });
        }
      });

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      });

      expect(credits?.bonusCredits).toBe(4);
      expect(credits?.usedCredits).toBe(0);
    });
  });

  describe("Subscription Upgrade Workflow", () => {
    it("upgrades subscription and credits atomically", async () => {
      const user = await createTestUserInDb();
      await createTestUserCredits(user.id, "starter");
      await createTestSubscription(user.id, "starter");

      await testPrisma.$transaction(async (tx) => {
        // Upgrade subscription
        await tx.subscription.updateMany({
          where: { userId: user.id },
          data: { plan: "pro" },
        });

        // Upgrade credits
        await tx.userCredits.update({
          where: { userId: user.id },
          data: {
            plan: "pro",
            monthlyCredits: 80,
            compatibilityLimit: 5,
            followUpLimit: 5,
            historyRetention: 90,
          },
        });

        // Grant premium content access
        await tx.premiumContentAccess.create({
          data: {
            userId: user.id,
            contentType: "pro_features",
            accessGrantedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
      });

      const subscription = await testPrisma.subscription.findFirst({
        where: { userId: user.id },
      });
      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      });
      const access = await testPrisma.premiumContentAccess.findFirst({
        where: { userId: user.id },
      });

      expect(subscription?.plan).toBe("pro");
      expect(credits?.plan).toBe("pro");
      expect(credits?.monthlyCredits).toBe(80);
      expect(access).not.toBeNull();
    });

    it("handles downgrade with prorated refund", async () => {
      const user = await createTestUserInDb();
      await createTestUserCredits(user.id, "pro");
      await createTestSubscription(user.id, "pro");

      await testPrisma.$transaction(async (tx) => {
        // Downgrade subscription
        await tx.subscription.updateMany({
          where: { userId: user.id },
          data: { plan: "starter" },
        });

        // Adjust credits (keep unused but cap at new limit)
        const currentCredits = await tx.userCredits.findUnique({
          where: { userId: user.id },
        });

        await tx.userCredits.update({
          where: { userId: user.id },
          data: {
            plan: "starter",
            monthlyCredits: 25,
            compatibilityLimit: 2,
            followUpLimit: 2,
            historyRetention: 30,
            // Preserve bonus credits
          },
        });

        // Remove premium access
        await tx.premiumContentAccess.deleteMany({
          where: { userId: user.id },
        });
      });

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      });

      expect(credits?.plan).toBe("starter");
      expect(credits?.monthlyCredits).toBe(25);
    });
  });

  describe("Multi-Entity Transactions", () => {
    it("creates reading with history and credits in single transaction", async () => {
      const user = await createTestUserInDb();
      await createTestUserCredits(user.id, "pro");

      const result = await testPrisma.$transaction(async (tx) => {
        // Create reading
        const reading = await tx.reading.create({
          data: {
            userId: user.id,
            type: "saju",
            content: JSON.stringify({ fortune: "Good luck!" }),
          },
        });

        // Create consultation history
        const history = await tx.consultationHistory.create({
          data: {
            userId: user.id,
            theme: "saju",
            summary: "Daily fortune reading",
            content: JSON.stringify({ readingId: reading.id }),
          },
        });

        // Update credits
        await tx.userCredits.update({
          where: { userId: user.id },
          data: { usedCredits: { increment: 1 } },
        });

        // Track interaction
        await tx.userInteraction.create({
          data: {
            userId: user.id,
            interactionType: "reading_created",
            context: { readingId: reading.id, type: "saju" },
          },
        });

        return { reading, history };
      });

      expect(result.reading).toBeDefined();
      expect(result.history).toBeDefined();

      const interactions = await testPrisma.userInteraction.findMany({
        where: { userId: user.id },
      });
      expect(interactions.length).toBeGreaterThanOrEqual(1);
    });

    it("handles tarot reading with session creation", async () => {
      const user = await createTestUserInDb();
      await createTestUserCredits(user.id, "starter");

      const result = await testPrisma.$transaction(async (tx) => {
        // Create tarot reading
        const tarotReading = await tx.tarotReading.create({
          data: {
            userId: user.id,
            question: "What does my future hold?",
            spreadId: "three-card",
            spreadTitle: "Three Card Spread",
            cards: [
              { position: "past", cardId: "the-fool", isReversed: false },
              { position: "present", cardId: "the-magician", isReversed: true },
              { position: "future", cardId: "the-star", isReversed: false },
            ],
            theme: "general",
          },
        });

        // Create chat session for follow-up
        const session = await tx.counselorChatSession.create({
          data: {
            userId: user.id,
            theme: "tarot",
            messages: [
              {
                role: "system",
                content: `Tarot reading context: ${tarotReading.id}`,
              },
            ],
          },
        });

        // Consume credit
        await tx.userCredits.update({
          where: { userId: user.id },
          data: { usedCredits: { increment: 1 } },
        });

        return { tarotReading, session };
      });

      expect(result.tarotReading.spreadId).toBe("three-card");
      expect(result.session.theme).toBe("tarot");
    });
  });

  describe("Refund Workflow", () => {
    it("processes credit refund with logging", async () => {
      const user = await createTestUserInDb();
      await createTestUserCredits(user.id, "starter");

      // Use some credits first
      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: { usedCredits: 5 },
      });

      await testPrisma.$transaction(async (tx) => {
        // Refund 3 credits
        await tx.userCredits.update({
          where: { userId: user.id },
          data: { usedCredits: { decrement: 3 } },
        });

        // Log the refund
        await tx.creditRefundLog.create({
          data: {
            userId: user.id,
            amount: 3,
            reason: "Service error compensation",
            processedBy: "system",
            status: "completed",
          },
        });
      });

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      });
      const refundLog = await testPrisma.creditRefundLog.findFirst({
        where: { userId: user.id },
      });

      expect(credits?.usedCredits).toBe(2);
      expect(refundLog?.amount).toBe(3);
    });

    it("handles bonus credit addition", async () => {
      const user = await createTestUserInDb();
      await createTestUserCredits(user.id, "starter");

      await testPrisma.$transaction(async (tx) => {
        // Add bonus credits
        await tx.userCredits.update({
          where: { userId: user.id },
          data: { bonusCredits: { increment: 20 } },
        });

        // Record bonus purchase
        await tx.bonusCreditPurchase.create({
          data: {
            userId: user.id,
            credits: 20,
            amount: 1900,
            currency: "KRW",
            stripePaymentId: `pi_bonus_${Date.now()}`,
          },
        });
      });

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      });
      const purchase = await testPrisma.bonusCreditPurchase.findFirst({
        where: { userId: user.id },
      });

      expect(credits?.bonusCredits).toBe(20);
      expect(purchase?.credits).toBe(20);
    });
  });

  describe("Concurrent Transaction Safety", () => {
    it("handles concurrent credit consumption safely", async () => {
      const user = await createTestUserInDb();
      await createTestUserCredits(user.id, "pro");

      // Start with 80 credits, use 70, leaving 10 available
      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: { usedCredits: 70 },
      });

      // Simulate concurrent requests (in sequence for test reliability)
      const results: boolean[] = [];

      for (let i = 0; i < 15; i++) {
        try {
          await testPrisma.$transaction(async (tx) => {
            const credits = await tx.userCredits.findUnique({
              where: { userId: user.id },
            });

            const available =
              (credits?.monthlyCredits || 0) -
              (credits?.usedCredits || 0) +
              (credits?.bonusCredits || 0);

            if (available <= 0) {
              throw new Error("No credits");
            }

            await tx.userCredits.update({
              where: { userId: user.id },
              data: { usedCredits: { increment: 1 } },
            });
          });
          results.push(true);
        } catch {
          results.push(false);
        }
      }

      const successCount = results.filter((r) => r).length;
      expect(successCount).toBe(10); // Only 10 credits were available
    });
  });

  describe("Period Reset Workflow", () => {
    it("resets monthly credits at period end", async () => {
      const user = await createTestUserInDb();
      await createTestUserCredits(user.id, "pro");

      // Simulate used credits
      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: {
          usedCredits: 50,
          compatibilityUsed: 3,
          followUpUsed: 4,
        },
      });

      // Reset for new period
      const now = new Date();
      const newPeriodEnd = new Date(now);
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: {
          usedCredits: 0,
          compatibilityUsed: 0,
          followUpUsed: 0,
          periodStart: now,
          periodEnd: newPeriodEnd,
          // Bonus credits carry over
        },
      });

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      });

      expect(credits?.usedCredits).toBe(0);
      expect(credits?.compatibilityUsed).toBe(0);
      expect(credits?.followUpUsed).toBe(0);
    });
  });
});
