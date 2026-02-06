/**
 * User Workflow Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 신규 사용자 전체 온보딩 플로우
 * - 프리미엄 업그레이드 워크플로우
 * - 전체 사용자 여정 시나리오
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
  generateTestUser,
  trackTestUser,
} from "./setup";

const hasTestDb = await checkTestDbConnection();

describe("Integration: User Workflow Scenarios", () => {
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

  describe("New User Onboarding Flow", () => {
    it("completes full onboarding journey", async () => {
      // Step 1: User signs up
      const userData = generateTestUser({
        name: "새로운 사용자",
        birthDate: "1995-03-15",
        birthTime: "10:30",
        gender: "M",
        tzId: "Asia/Seoul",
      });

      const user = await testPrisma.user.create({
        data: {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          birthDate: "1995-03-15",
          birthTime: "10:30",
          gender: "M",
          tzId: "Asia/Seoul",
        },
      });
      trackTestUser(user.id);

      expect(user).toBeDefined();
      expect(user.email).toBeTruthy();

      // Step 2: Initialize free credits
      const credits = await testPrisma.userCredits.create({
        data: {
          userId: user.id,
          plan: "free",
          monthlyCredits: 7,
          usedCredits: 0,
          bonusCredits: 0,
          compatibilityUsed: 0,
          followUpUsed: 0,
          compatibilityLimit: 0,
          followUpLimit: 0,
          historyRetention: 7,
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      expect(credits.plan).toBe("free");
      expect(credits.monthlyCredits).toBe(7);

      // Step 3: User gets first Saju reading
      const sajuReading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: "saju",
          content: JSON.stringify({
            yearPillar: { stem: "乙", branch: "亥" },
            monthPillar: { stem: "己", branch: "卯" },
            dayPillar: { stem: "壬", branch: "辰" },
            timePillar: { stem: "乙", branch: "巳" },
          }),
        },
      });

      // Use 1 credit
      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: { usedCredits: { increment: 1 } },
      });

      expect(sajuReading.type).toBe("saju");

      // Step 4: User saves birth info preferences
      await testPrisma.userPreferences.create({
        data: {
          userId: user.id,
          preferredLanguage: "ko",
          preferredThemes: { theme: "dark" },
          notificationSettings: {
            email: true,
            push: false,
            dailyFortune: true,
          },
        },
      });

      // Verify complete onboarding
      const completeUser = await testPrisma.user.findUnique({
        where: { id: user.id },
        include: {
          credits: true,
          readings: true,
          preferences: true,
        },
      });

      expect(completeUser?.credits).toBeDefined();
      expect(completeUser?.credits?.usedCredits).toBe(1);
      expect(completeUser?.readings).toHaveLength(1);
      expect(completeUser?.preferences).toBeDefined();
    });

    it("handles referral signup flow", async () => {
      // Create referrer
      const referrer = await createTestUserInDb();
      const referralCode = `REF_${referrer.id.slice(-8)}`;

      await testPrisma.user.update({
        where: { id: referrer.id },
        data: { referralCode },
      });

      await createTestUserCredits(referrer.id, "free");

      // New user signs up with referral
      const newUser = await createTestUserInDb({ referrerId: referrer.id });
      await createTestUserCredits(newUser.id, "free");

      // Create referral reward record
      await testPrisma.referralReward.create({
        data: {
          userId: referrer.id,
          referredUserId: newUser.id,
          creditsAwarded: 3,
          rewardType: "signup_complete",
          status: "completed",
          completedAt: new Date(),
        },
      });

      // Add bonus credits to referrer
      await testPrisma.userCredits.update({
        where: { userId: referrer.id },
        data: {
          bonusCredits: { increment: 3 },
          totalBonusReceived: { increment: 3 },
        },
      });

      // Verify referrer got bonus
      const referrerCredits = await testPrisma.userCredits.findUnique({
        where: { userId: referrer.id },
      });

      expect(referrerCredits?.bonusCredits).toBe(3);

      // Verify referral relationship
      const newUserData = await testPrisma.user.findUnique({
        where: { id: newUser.id },
        include: { referrer: true },
      });

      expect(newUserData?.referrer?.id).toBe(referrer.id);
    });
  });

  describe("Premium Upgrade Workflow", () => {
    it("upgrades user from free to starter plan", async () => {
      const user = await createTestUserInDb();
      await createTestUserCredits(user.id, "free");

      // Verify initial free state
      const freePlan = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      });
      expect(freePlan?.plan).toBe("free");
      expect(freePlan?.monthlyCredits).toBe(7);

      // Simulate subscription creation (Stripe webhook)
      const subscription = await createTestSubscription(user.id, "starter", "active");

      // Upgrade credits
      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: {
          plan: "starter",
          monthlyCredits: 25,
          usedCredits: 0, // Reset on upgrade
          compatibilityLimit: 2,
          followUpLimit: 2,
          historyRetention: 30,
        },
      });

      // Verify upgrade
      const upgradedCredits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      });

      expect(upgradedCredits?.plan).toBe("starter");
      expect(upgradedCredits?.monthlyCredits).toBe(25);
      expect(subscription.status).toBe("active");
    });

    it("handles subscription cancellation gracefully", async () => {
      const user = await createTestUserInDb();
      await createTestUserCredits(user.id, "pro");
      const subscription = await createTestSubscription(user.id, "pro", "active");

      // User uses some credits
      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: { usedCredits: 30 },
      });

      // Cancel subscription (but keep access until period end)
      await testPrisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "canceled",
          canceledAt: new Date(),
          // Still active until period end
        },
      });

      // User can still use remaining credits
      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      });

      expect(credits?.plan).toBe("pro");
      expect(credits?.monthlyCredits).toBe(80);
      expect(credits?.usedCredits).toBe(30);

      // Remaining: 80 - 30 = 50 credits still available
      const remaining = credits!.monthlyCredits - credits!.usedCredits;
      expect(remaining).toBe(50);
    });

    it("handles plan downgrade at period end", async () => {
      const user = await createTestUserInDb();
      await createTestUserCredits(user.id, "premium");

      // Set period end to past (simulate end of billing period)
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await testPrisma.subscription.create({
        data: {
          userId: user.id,
          status: "canceled",
          plan: "premium",
          billingCycle: "monthly",
          currentPeriodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          currentPeriodEnd: pastDate,
          canceledAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        },
      });

      // Downgrade to free
      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: {
          plan: "free",
          monthlyCredits: 7,
          usedCredits: 0,
          compatibilityLimit: 0,
          followUpLimit: 0,
          historyRetention: 7,
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const downgraded = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      });

      expect(downgraded?.plan).toBe("free");
      expect(downgraded?.monthlyCredits).toBe(7);
    });
  });

  describe("Daily Usage Workflow", () => {
    it("tracks daily fortune viewing cycle", async () => {
      const user = await createTestUserInDb();
      await createTestUserCredits(user.id, "starter");

      // Day 1: View fortune (create)
      const day1 = new Date().toISOString().split("T")[0];

      await testPrisma.dailyFortune.create({
        data: {
          userId: user.id,
          date: day1,
          loveScore: 7,
          careerScore: 8,
          wealthScore: 6,
          healthScore: 9,
          overallScore: 75,
        },
      });

      // Day 2: View fortune
      const day2Date = new Date();
      day2Date.setDate(day2Date.getDate() + 1);
      const day2 = day2Date.toISOString().split("T")[0];

      await testPrisma.dailyFortune.create({
        data: {
          userId: user.id,
          date: day2,
          loveScore: 8,
          careerScore: 7,
          wealthScore: 9,
          healthScore: 6,
          overallScore: 80,
        },
      });

      // Check fortune history
      const fortunes = await testPrisma.dailyFortune.findMany({
        where: { userId: user.id },
        orderBy: { date: "desc" },
      });

      expect(fortunes).toHaveLength(2);
    });

    it("handles multiple reading types in one day", async () => {
      const user = await createTestUserInDb();
      await createTestUserCredits(user.id, "pro");

      // Create various readings
      const readingTypes = ["saju", "tarot", "dream", "numerology"];

      for (const type of readingTypes) {
        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type,
            content: JSON.stringify({ type, timestamp: Date.now() }),
          },
        });

        // Consume credit for each
        await testPrisma.userCredits.update({
          where: { userId: user.id },
          data: { usedCredits: { increment: 1 } },
        });
      }

      // Verify all readings
      const allReadings = await testPrisma.reading.findMany({
        where: { userId: user.id },
      });

      expect(allReadings).toHaveLength(4);

      // Verify credits consumed
      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      });

      expect(credits?.usedCredits).toBe(4);
    });
  });

  describe("Compatibility Analysis Workflow", () => {
    it("performs full compatibility analysis between two users", async () => {
      const user1 = await createTestUserInDb({
        name: "User 1",
        birthDate: "1990-05-15",
        birthTime: "10:30",
      });

      const user2 = await createTestUserInDb({
        name: "User 2",
        birthDate: "1992-08-20",
        birthTime: "14:00",
      });

      await createTestUserCredits(user1.id, "starter");

      // User 1 initiates compatibility check
      const compatibilityReading = await testPrisma.reading.create({
        data: {
          userId: user1.id,
          type: "compatibility",
          content: JSON.stringify({
            person1: {
              name: "User 1",
              birthDate: "1990-05-15",
              sajuProfile: { dayMaster: "甲" },
            },
            person2: {
              name: "User 2",
              birthDate: "1992-08-20",
              sajuProfile: { dayMaster: "壬" },
            },
            scores: {
              overall: 78,
              love: 82,
              friendship: 85,
              business: 70,
            },
            analysis: "Strong compatibility in communication and values",
          }),
        },
      });

      // Use compatibility credit
      await testPrisma.userCredits.update({
        where: { userId: user1.id },
        data: { compatibilityUsed: { increment: 1 } },
      });

      // Verify
      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user1.id },
      });

      expect(credits?.compatibilityUsed).toBe(1);

      const content = JSON.parse(compatibilityReading.content as string);
      expect(content.scores.overall).toBe(78);
    });
  });

  describe("History Retention Workflow", () => {
    it("respects history retention limits based on plan", async () => {
      const user = await createTestUserInDb();
      await createTestUserCredits(user.id, "free"); // 7 days retention

      // Create readings over time
      const now = new Date();

      for (let i = 0; i < 10; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type: "saju",
            content: JSON.stringify({ day: i }),
            createdAt: date,
          },
        });
      }

      // Get credits to check retention limit
      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      });

      const retentionDays = credits?.historyRetention || 7;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Find readings within retention period
      const retainedReadings = await testPrisma.reading.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: cutoffDate },
        },
      });

      // Free plan: 7 days, should have readings from last 7 days (8 readings: days 0-7)
      expect(retainedReadings.length).toBeLessThanOrEqual(8);
    });
  });

  describe("Error Recovery Workflows", () => {
    it("handles failed payment and retries", async () => {
      const user = await createTestUserInDb();
      await createTestUserCredits(user.id, "free");

      // Simulate failed subscription attempt
      const failedSubscription = await testPrisma.subscription.create({
        data: {
          userId: user.id,
          status: "past_due",
          plan: "starter",
          billingCycle: "monthly",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          stripeSubscriptionId: `sub_failed_${Date.now()}`,
        },
      });

      expect(failedSubscription.status).toBe("past_due");

      // User remains on free plan
      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      });
      expect(credits?.plan).toBe("free");

      // Simulate successful retry
      await testPrisma.subscription.update({
        where: { id: failedSubscription.id },
        data: { status: "active" },
      });

      // Now upgrade credits
      await testPrisma.userCredits.update({
        where: { userId: user.id },
        data: {
          plan: "starter",
          monthlyCredits: 25,
          compatibilityLimit: 2,
          followUpLimit: 2,
          historyRetention: 30,
        },
      });

      const upgradedCredits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      });
      expect(upgradedCredits?.plan).toBe("starter");
    });

    it("maintains data integrity during concurrent operations", async () => {
      const user = await createTestUserInDb();
      await createTestUserCredits(user.id, "pro");

      // Simulate concurrent credit consumption with transaction
      const results = await Promise.all([
        testPrisma.$transaction(async (tx) => {
          const credits = await tx.userCredits.findUnique({
            where: { userId: user.id },
          });

          if ((credits?.usedCredits || 0) >= (credits?.monthlyCredits || 0)) {
            return { success: false, reason: "No credits" };
          }

          await tx.userCredits.update({
            where: { userId: user.id },
            data: { usedCredits: { increment: 1 } },
          });

          return { success: true, operation: 1 };
        }),
        testPrisma.$transaction(async (tx) => {
          const credits = await tx.userCredits.findUnique({
            where: { userId: user.id },
          });

          if ((credits?.usedCredits || 0) >= (credits?.monthlyCredits || 0)) {
            return { success: false, reason: "No credits" };
          }

          await tx.userCredits.update({
            where: { userId: user.id },
            data: { usedCredits: { increment: 1 } },
          });

          return { success: true, operation: 2 };
        }),
      ]);

      // Both should succeed (80 credits available)
      expect(results.every((r) => r.success)).toBe(true);

      const finalCredits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      });

      // Should have used 2 credits total
      expect(finalCredits?.usedCredits).toBe(2);
    });
  });
});
