/**
 * User CRUD Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 사용자 생성, 조회, 수정, 삭제
 * - 관련 데이터 연동 확인
 *
 * 실행: npm run test:integration
 * 환경변수 필요: TEST_DATABASE_URL 또는 DATABASE_URL
 */

import { beforeAll, afterAll, afterEach } from "vitest";
import {
  testPrisma,
  createTestUserInDb,
  cleanupAllTestUsers,
  connectTestDb,
  disconnectTestDb,
  generateTestUser,
  trackTestUser,
  cleanupTestUser,
  checkTestDbConnection,
} from "./setup";

const hasTestDb = await checkTestDbConnection();

describe("Integration: User CRUD Operations", () => {
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

  describe("User Creation", () => {
    it("creates a new user with minimal data", async () => {
      const user = await createTestUserInDb();

      expect(user).toBeDefined();
      expect(user.id).toBeTruthy();
      expect(user.email).toContain("@test.example.com");
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it("creates a user with full profile data", async () => {
      const user = await createTestUserInDb({
        name: "Full Profile User",
        birthDate: "1990-05-15",
        birthTime: "14:30",
        gender: "M",
        birthCity: "Seoul",
        tzId: "Asia/Seoul",
      });

      expect(user.name).toBe("Full Profile User");

      // Fetch with all fields
      const fetched = await testPrisma.user.findUnique({
        where: { id: user.id },
      });

      expect(fetched?.birthDate).toBe("1990-05-15");
      expect(fetched?.birthTime).toBe("14:30");
      expect(fetched?.gender).toBe("M");
      expect(fetched?.tzId).toBe("Asia/Seoul");
    });

    it("enforces unique email constraint", async () => {
      const userData = generateTestUser();
      const user1 = await testPrisma.user.create({
        data: { id: userData.id, email: userData.email, name: userData.name },
      });
      trackTestUser(user1.id);

      // Try creating another user with same email
      const userData2 = generateTestUser({ email: userData.email });
      await expect(
        testPrisma.user.create({
          data: { id: userData2.id, email: userData2.email, name: userData2.name },
        })
      ).rejects.toThrow();
    });

    it("allows null email for OAuth-only users", async () => {
      const userData = generateTestUser({ email: null });
      const user = await testPrisma.user.create({
        data: { id: userData.id, email: null, name: userData.name },
      });
      trackTestUser(user.id);

      expect(user.email).toBeNull();
    });
  });

  describe("User Retrieval", () => {
    it("finds user by id", async () => {
      const user = await createTestUserInDb();

      const found = await testPrisma.user.findUnique({
        where: { id: user.id },
      });

      expect(found).not.toBeNull();
      expect(found?.id).toBe(user.id);
    });

    it("finds user by email", async () => {
      const user = await createTestUserInDb();

      const found = await testPrisma.user.findUnique({
        where: { email: user.email! },
      });

      expect(found).not.toBeNull();
      expect(found?.id).toBe(user.id);
    });

    it("returns null for non-existent user", async () => {
      const found = await testPrisma.user.findUnique({
        where: { id: "non_existent_user_id" },
      });

      expect(found).toBeNull();
    });

    it("retrieves user with relations", async () => {
      const user = await createTestUserInDb();

      // Create UserCredits
      await testPrisma.userCredits.create({
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

      const userWithCredits = await testPrisma.user.findUnique({
        where: { id: user.id },
        include: { credits: true },
      });

      expect(userWithCredits?.credits).not.toBeNull();
      expect(userWithCredits?.credits?.plan).toBe("free");
      expect(userWithCredits?.credits?.monthlyCredits).toBe(7);
    });
  });

  describe("User Update", () => {
    it("updates user profile fields", async () => {
      const user = await createTestUserInDb();

      const updated = await testPrisma.user.update({
        where: { id: user.id },
        data: {
          name: "Updated Name",
          birthDate: "1985-12-25",
        },
      });

      expect(updated.name).toBe("Updated Name");
      expect(updated.birthDate).toBe("1985-12-25");
      expect(updated.updatedAt.getTime()).toBeGreaterThan(user.createdAt.getTime());
    });

    it("updates email notification preference", async () => {
      const user = await createTestUserInDb();

      expect(user.emailNotifications).toBe(false); // Default

      const updated = await testPrisma.user.update({
        where: { id: user.id },
        data: { emailNotifications: true },
      });

      expect(updated.emailNotifications).toBe(true);
    });

    it("tracks updatedAt timestamp", async () => {
      const user = await createTestUserInDb();
      const originalUpdatedAt = user.updatedAt;

      // Small delay to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      const updated = await testPrisma.user.update({
        where: { id: user.id },
        data: { name: "New Name" },
      });

      expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe("User Deletion", () => {
    it("deletes user by id", async () => {
      const userData = generateTestUser();
      const user = await testPrisma.user.create({
        data: { id: userData.id, email: userData.email, name: userData.name },
      });
      // Don't track - we're deleting manually

      await testPrisma.user.delete({ where: { id: user.id } });

      const found = await testPrisma.user.findUnique({
        where: { id: user.id },
      });

      expect(found).toBeNull();
    });

    it("cascades delete to related UserCredits", async () => {
      const userData = generateTestUser();
      const user = await testPrisma.user.create({
        data: { id: userData.id, email: userData.email, name: userData.name },
      });

      await testPrisma.userCredits.create({
        data: {
          userId: user.id,
          plan: "starter",
          monthlyCredits: 25,
          usedCredits: 5,
          bonusCredits: 10,
          compatibilityUsed: 1,
          followUpUsed: 0,
          compatibilityLimit: 2,
          followUpLimit: 2,
          historyRetention: 30,
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Verify credits exist
      const creditsBefore = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      });
      expect(creditsBefore).not.toBeNull();

      // Delete user (should cascade)
      await testPrisma.user.delete({ where: { id: user.id } });

      // Verify credits are also deleted
      const creditsAfter = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      });
      expect(creditsAfter).toBeNull();
    });

    it("cascades delete to subscriptions", async () => {
      const userData = generateTestUser();
      const user = await testPrisma.user.create({
        data: { id: userData.id, email: userData.email, name: userData.name },
      });

      await testPrisma.subscription.create({
        data: {
          userId: user.id,
          status: "active",
          plan: "pro",
          billingCycle: "monthly",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Delete user
      await testPrisma.user.delete({ where: { id: user.id } });

      // Verify subscription is deleted
      const subs = await testPrisma.subscription.findMany({
        where: { userId: user.id },
      });
      expect(subs).toHaveLength(0);
    });
  });

  describe("Referral System", () => {
    it("sets up referral relationship", async () => {
      // Create referrer
      const referrer = await createTestUserInDb();

      // Update with referral code
      await testPrisma.user.update({
        where: { id: referrer.id },
        data: { referralCode: `REF_${referrer.id.slice(-8)}` },
      });

      // Create referred user
      const referred = await createTestUserInDb({ referrerId: referrer.id });

      // Verify relationship
      const referredUser = await testPrisma.user.findUnique({
        where: { id: referred.id },
        include: { referrer: true },
      });

      expect(referredUser?.referrerId).toBe(referrer.id);
      expect(referredUser?.referrer?.id).toBe(referrer.id);
    });

    it("lists users referred by a referrer", async () => {
      const referrer = await createTestUserInDb();

      await testPrisma.user.update({
        where: { id: referrer.id },
        data: { referralCode: `REF_${Date.now()}` },
      });

      // Create multiple referred users
      const referred1 = await createTestUserInDb({ referrerId: referrer.id });
      const referred2 = await createTestUserInDb({ referrerId: referrer.id });

      const referrerWithReferrals = await testPrisma.user.findUnique({
        where: { id: referrer.id },
        include: { referrals: true },
      });

      expect(referrerWithReferrals?.referrals).toHaveLength(2);
      const referralIds = referrerWithReferrals?.referrals.map((r) => r.id);
      expect(referralIds).toContain(referred1.id);
      expect(referralIds).toContain(referred2.id);
    });
  });
});
